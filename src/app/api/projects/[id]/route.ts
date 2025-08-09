import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction, mockDb, isUsingMockDb } from "@/lib/db-wrapper";

// GET /api/projects/[id] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Use mock database if configured
    if (isUsingMockDb()) {
      const project = await mockDb.getProject(projectId);
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(project);
    }

    // Fetch project with all related data
    const projectResult = await query(
      `SELECT * FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const project = projectResult.rows[0];

    // Fetch related data in parallel
    const [site, tank, regulations, criteria, soilProfile, soilLayers, pileCatalog] = await Promise.all([
      query(`SELECT * FROM sites WHERE project_id = $1`, [projectId]),
      query(`SELECT * FROM tanks WHERE project_id = $1`, [projectId]),
      query(`SELECT * FROM regulations WHERE project_id = $1`, [projectId]),
      query(`SELECT * FROM criteria WHERE project_id = $1`, [projectId]),
      query(`SELECT * FROM soil_profiles WHERE project_id = $1`, [projectId]),
      query(`SELECT * FROM soil_layers WHERE project_id = $1 ORDER BY layer_order`, [projectId]),
      query(`SELECT * FROM pile_catalog WHERE project_id = $1`, [projectId]),
    ]);

    // Construct the full project data
    const fullProjectData = {
      project: {
        project_id: project.id,
        name: project.name,
        created_by: project.created_by,
        created_at: project.created_at,
      },
      site: site.rows[0] || null,
      tank: tank.rows[0] || null,
      regulations: regulations.rows[0] || null,
      criteria: criteria.rows[0] || null,
      soil_profile: soilProfile.rows[0] ? {
        gw_level_m: soilProfile.rows[0].gw_level_m,
        layers: soilLayers.rows,
      } : null,
      pile_catalog: pileCatalog.rows,
    };

    return NextResponse.json(fullProjectData);
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const updates = await request.json();

    // Use mock database if configured
    if (isUsingMockDb()) {
      await mockDb.updateProject(projectId, updates);
      return NextResponse.json({
        success: true,
        projectId,
        message: "Project updated successfully (using mock database)",
      });
    }

    await withTransaction(async (client) => {
      // Update project name if provided
      if (updates.project?.name) {
        await client.query(
          `UPDATE projects SET name = $1 WHERE id = $2`,
          [updates.project.name, projectId]
        );
      }

      // Update site if provided
      if (updates.site) {
        const siteExists = await client.query(
          `SELECT id FROM sites WHERE project_id = $1`,
          [projectId]
        );

        if (siteExists.rows.length > 0) {
          const updateFields = [];
          const values = [];
          let paramCount = 1;

          Object.entries(updates.site).forEach(([key, value]) => {
            if (value !== undefined && key !== 'id' && key !== 'project_id') {
              updateFields.push(`${key} = $${paramCount}`);
              values.push(value);
              paramCount++;
            }
          });

          if (updateFields.length > 0) {
            values.push(projectId);
            await client.query(
              `UPDATE sites SET ${updateFields.join(', ')} WHERE project_id = $${paramCount}`,
              values
            );
          }
        }
      }

      // Similar updates for tank, regulations, criteria, etc.
      // (Implementation would follow the same pattern)

      // Log the update
      await client.query(
        `INSERT INTO audit_logs (
          project_id, user_id, action, target_table, target_id, new_data
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          projectId,
          updates.user_id || 'system',
          'UPDATE',
          'projects',
          projectId,
          JSON.stringify(updates),
        ]
      );
    });

    return NextResponse.json({
      success: true,
      projectId,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    await withTransaction(async (client) => {
      // Check if project exists
      const projectResult = await client.query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        throw new Error("Project not found");
      }

      // Log the deletion
      await client.query(
        `INSERT INTO audit_logs (
          project_id, user_id, action, target_table, target_id, old_data
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          projectId,
          'system',
          'DELETE',
          'projects',
          projectId,
          JSON.stringify(projectResult.rows[0]),
        ]
      );

      // Delete project (cascades to all related tables)
      await client.query(
        `DELETE FROM projects WHERE id = $1`,
        [projectId]
      );
    });

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
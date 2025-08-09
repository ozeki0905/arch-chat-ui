import { NextRequest, NextResponse } from "next/server";
import { withTransaction, query } from "@/lib/db";
import { TankFoundationDesignInput } from "@/types/tankFoundationDesign";

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await query(
      `SELECT 
        p.id,
        p.name,
        p.created_by,
        p.created_at,
        p.updated_at,
        s.site_name,
        s.location,
        t.capacity_kl,
        t.content_type,
        cr.status as latest_calc_status
      FROM projects p
      LEFT JOIN sites s ON s.project_id = p.id
      LEFT JOIN tanks t ON t.project_id = p.id
      LEFT JOIN LATERAL (
        SELECT status 
        FROM calc_runs 
        WHERE project_id = p.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) cr ON true
      ORDER BY p.updated_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      projects: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project with full tank foundation data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.project?.name) {
      return NextResponse.json(
        { error: "Project name is required", details: "Missing project.name field" },
        { status: 400 }
      );
    }

    const designInput: TankFoundationDesignInput = body;

    const projectData = await withTransaction(async (client) => {
      // 1. Insert project
      const projectResult = await client.query(
        `INSERT INTO projects (name, created_by) 
         VALUES ($1, $2) 
         RETURNING id`,
        [designInput.project.name, designInput.project.created_by]
      );
      const projectId = projectResult.rows[0].id;

      // 2. Insert site
      if (designInput.site) {
        await client.query(
          `INSERT INTO sites (
            project_id, site_name, location, lat, lng, elevation_gl, airport_constraints
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            projectId,
            designInput.site.site_name,
            designInput.site.location,
            designInput.site.lat,
            designInput.site.lng,
            designInput.site.elevation_gl,
            designInput.site.airport_constraints,
          ]
        );
      }

      // 3. Insert tank
      if (designInput.tank) {
        await client.query(
          `INSERT INTO tanks (
            project_id, capacity_kl, content_type, unit_weight_kn_m3,
            shape, diameter_m, height_m, roof_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            projectId,
            designInput.tank.capacity_kl,
            designInput.tank.content_type,
            designInput.tank.unit_weight_kn_m3,
            designInput.tank.shape || 'cylindrical',
            designInput.tank.diameter_m,
            designInput.tank.height_m,
            designInput.tank.roof_type,
          ]
        );
      }

      // 4. Insert regulations
      if (designInput.regulations) {
        await client.query(
          `INSERT INTO regulations (
            project_id, legal_classification, applied_codes, code_versions
          ) VALUES ($1, $2, $3, $4)`,
          [
            projectId,
            designInput.regulations.legal_classification,
            designInput.regulations.applied_codes,
            JSON.stringify(designInput.regulations.code_versions || {}),
          ]
        );
      }

      // 5. Insert criteria
      if (designInput.criteria) {
        await client.query(
          `INSERT INTO criteria (
            project_id, seismic_level, kh, kv, sf_bearing,
            total_settlement_limit_mm, diff_settlement_ratio,
            allowable_stress_pile_mpa, consider_liquefaction,
            consider_negative_friction
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            projectId,
            designInput.criteria.seismic_level,
            designInput.criteria.kh,
            designInput.criteria.kv,
            designInput.criteria.sf_bearing,
            designInput.criteria.total_settlement_limit_mm,
            designInput.criteria.diff_settlement_ratio,
            designInput.criteria.allowable_stress_pile_mpa,
            designInput.criteria.consider_liquefaction,
            designInput.criteria.consider_negative_friction,
          ]
        );
      }

      // 6. Insert soil profile and layers
      if (designInput.soil_profile) {
        await client.query(
          `INSERT INTO soil_profiles (project_id, gw_level_m) 
           VALUES ($1, $2)`,
          [projectId, designInput.soil_profile.gw_level_m]
        );

        // Insert soil layers
        if (designInput.soil_profile.layers) {
          for (let i = 0; i < designInput.soil_profile.layers.length; i++) {
            const layer = designInput.soil_profile.layers[i];
            await client.query(
              `INSERT INTO soil_layers (
                project_id, z_from_m, z_to_m, soil_type, n_value,
                k30_mn_m3, gamma_t_kn_m3, gamma_sat_kn_m3,
                dr_percent, fc_percent, layer_order
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                projectId,
                layer.z_from_m,
                layer.z_to_m,
                layer.soil_type,
                layer.N_value,
                layer.K30_MN_m3,
                layer.gamma_t_kn_m3,
                layer.gamma_sat_kn_m3,
                layer.Dr_percent,
                layer.FC_percent,
                i,
              ]
            );
          }
        }
      }

      // 7. Insert pile catalog
      if (designInput.pile_catalog) {
        for (const pile of designInput.pile_catalog) {
          await client.query(
            `INSERT INTO pile_catalog (
              project_id, type_code, diameter_mm, thickness_mm,
              length_range_m_min, length_range_m_max, method,
              qa_formula_code, material_allowable_stress_mpa
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              projectId,
              pile.type_code,
              pile.diameter_mm,
              pile.thickness_mm,
              pile.length_range_m?.[0],
              pile.length_range_m?.[1],
              pile.method,
              pile.qa_formula_code,
              pile.material_allowable_stress_mpa,
            ]
          );
        }
      }

      // Log the creation
      await client.query(
        `INSERT INTO audit_logs (
          project_id, user_id, action, target_table, target_id, new_data
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          projectId,
          designInput.project.created_by || 'system',
          'CREATE',
          'projects',
          projectId,
          JSON.stringify(designInput),
        ]
      );

      return { projectId, projectName: designInput.project.name };
    });

    return NextResponse.json({
      success: true,
      projectId: projectData.projectId,
      projectName: projectData.projectName,
      message: "Project created successfully",
    });
  } catch (error) {
    console.error("Failed to create project:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      // Database connection errors
      if (error.message.includes("connect") || error.message.includes("ECONNREFUSED")) {
        return NextResponse.json(
          { 
            error: "Database connection failed", 
            details: "Unable to connect to the database. Please check your database configuration and ensure PostgreSQL is running."
          },
          { status: 503 }
        );
      }
      
      // Database does not exist
      if (error.message.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database not found", 
            details: "The database 'arch_chat_db' does not exist. Please create it using the schema.sql file."
          },
          { status: 503 }
        );
      }
      
      // Table does not exist
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database tables not found", 
            details: "Required database tables are missing. Please run the schema.sql file to create them."
          },
          { status: 503 }
        );
      }
      
      // Missing required fields
      if (error.message.includes("null value in column")) {
        const match = error.message.match(/column "(\w+)"/)?.[1];
        return NextResponse.json(
          { 
            error: "Missing required field", 
            details: `Required field '${match || 'unknown'}' is missing or null`
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to create project", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
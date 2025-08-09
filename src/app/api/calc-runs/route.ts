import { NextRequest, NextResponse } from "next/server";
import { withTransaction, query } from "@/lib/db";
import { TankFoundationDesignInput } from "@/types/tankFoundationDesign";

// POST /api/calc-runs - Create a new calculation run
export async function POST(request: NextRequest) {
  try {
    const { projectId, designInput }: { 
      projectId: string; 
      designInput: TankFoundationDesignInput 
    } = await request.json();

    const runData = await withTransaction(async (client) => {
      // Generate unique run ID
      const runId = `RUN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create calculation run
      const runResult = await client.query(
        `INSERT INTO calc_runs (
          project_id, run_id, status, input_data, started_at
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [
          projectId,
          runId,
          'queued',
          JSON.stringify(designInput),
          new Date(),
        ]
      );

      const calcRunId = runResult.rows[0].id;

      // Log the calculation request
      await client.query(
        `INSERT INTO audit_logs (
          project_id, user_id, action, target_table, target_id, new_data
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          projectId,
          designInput.project.created_by || 'system',
          'CREATE_CALC_RUN',
          'calc_runs',
          calcRunId,
          JSON.stringify({ runId, status: 'queued' }),
        ]
      );

      return { calcRunId, runId };
    });

    // TODO: Here you would trigger the actual calculation
    // For example, send to a queue or call Python backend
    // await triggerCalculation(runData.runId, designInput);

    return NextResponse.json({
      success: true,
      runId: runData.runId,
      calcRunId: runData.calcRunId,
      status: 'queued',
      message: "Calculation run created and queued",
    });
  } catch (error) {
    console.error("Failed to create calculation run:", error);
    return NextResponse.json(
      { error: "Failed to create calculation run" },
      { status: 500 }
    );
  }
}

// GET /api/calc-runs - List calculation runs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    let whereConditions = [];
    let params = [];
    let paramCount = 1;

    if (projectId) {
      whereConditions.push(`project_id = $${paramCount}`);
      params.push(projectId);
      paramCount++;
    }

    if (status) {
      whereConditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    params.push(limit, offset);

    const result = await query(
      `SELECT 
        cr.id,
        cr.run_id,
        cr.project_id,
        cr.status,
        cr.started_at,
        cr.completed_at,
        cr.error_message,
        cr.created_at,
        p.name as project_name
      FROM calc_runs cr
      JOIN projects p ON p.id = cr.project_id
      ${whereClause}
      ORDER BY cr.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return NextResponse.json({
      runs: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("Failed to fetch calculation runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch calculation runs" },
      { status: 500 }
    );
  }
}
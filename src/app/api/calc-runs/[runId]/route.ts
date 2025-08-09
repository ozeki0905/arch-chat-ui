import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { CalcResult, RunStatusResponse } from "@/types/tankFoundationDesign";

// GET /api/calc-runs/[runId] - Get calculation run status and results
export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const runId = params.runId;

    // Fetch run details
    const runResult = await query(
      `SELECT * FROM calc_runs WHERE run_id = $1`,
      [runId]
    );

    if (runResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Calculation run not found" },
        { status: 404 }
      );
    }

    const run = runResult.rows[0];

    // If calculation is complete, fetch results
    let calcResult = null;
    let llmResults = null;

    if (run.status === 'succeeded') {
      const [calcResultData, llmResultData] = await Promise.all([
        query(`SELECT * FROM calc_results WHERE run_id = $1`, [run.id]),
        query(`SELECT * FROM llm_results WHERE run_id = $1`, [run.id]),
      ]);

      if (calcResultData.rows.length > 0) {
        calcResult = calcResultData.rows[0].result_data;
      }

      // Transform LLM results into the expected format
      llmResults = {};
      llmResultData.rows.forEach(row => {
        llmResults[row.result_type] = row.result_data;
      });
    }

    const response: RunStatusResponse = {
      status: run.status,
      result: calcResult,
      llm: llmResults,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch calculation run:", error);
    return NextResponse.json(
      { error: "Failed to fetch calculation run" },
      { status: 500 }
    );
  }
}

// PUT /api/calc-runs/[runId] - Update calculation run (typically called by calculation service)
export async function PUT(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const runId = params.runId;
    const { status, result, llm, error } = await request.json();

    await withTransaction(async (client) => {
      // Update run status
      const updateFields = ['status = $1'];
      const values = [status];
      let paramCount = 2;

      if (status === 'succeeded' || status === 'failed') {
        updateFields.push(`completed_at = $${paramCount}`);
        values.push(new Date());
        paramCount++;
      }

      if (error) {
        updateFields.push(`error_message = $${paramCount}`);
        values.push(error);
        paramCount++;
      }

      values.push(runId);

      const runResult = await client.query(
        `UPDATE calc_runs 
         SET ${updateFields.join(', ')}
         WHERE run_id = $${paramCount}
         RETURNING id, project_id`,
        values
      );

      if (runResult.rows.length === 0) {
        throw new Error("Calculation run not found");
      }

      const { id: calcRunId, project_id: projectId } = runResult.rows[0];

      // If succeeded, save results
      if (status === 'succeeded' && result) {
        // Save main calculation results
        await client.query(
          `INSERT INTO calc_results (
            run_id, result_data, facility_result, geometry_result,
            ground_result, direct_foundation_result, pile_design_result,
            assumptions, versions, hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            calcRunId,
            JSON.stringify(result),
            JSON.stringify(result.facility),
            JSON.stringify(result.geometry),
            JSON.stringify(result.ground),
            JSON.stringify(result.direct_foundation),
            JSON.stringify(result.pile_design),
            result.assumptions,
            JSON.stringify(result.versions),
            result.hash,
          ]
        );

        // Save LLM results
        if (llm) {
          for (const [resultType, resultData] of Object.entries(llm)) {
            await client.query(
              `INSERT INTO llm_results (run_id, result_type, result_data)
               VALUES ($1, $2, $3)`,
              [calcRunId, resultType, JSON.stringify(resultData)]
            );
          }
        }
      }

      // Log the update
      await client.query(
        `INSERT INTO audit_logs (
          project_id, user_id, action, target_table, target_id, new_data
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          projectId,
          'calculation_service',
          'UPDATE_CALC_RUN',
          'calc_runs',
          calcRunId,
          JSON.stringify({ status, hasResult: !!result, hasLlm: !!llm }),
        ]
      );
    });

    return NextResponse.json({
      success: true,
      message: `Calculation run updated to status: ${status}`,
    });
  } catch (error) {
    console.error("Failed to update calculation run:", error);
    return NextResponse.json(
      { error: "Failed to update calculation run" },
      { status: 500 }
    );
  }
}
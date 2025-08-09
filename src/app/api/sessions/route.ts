import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { ChatSession } from "@/types/chat";

// GET /api/sessions - List chat sessions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    let whereClause = '';
    let params = [];
    let paramCount = 1;

    if (projectId) {
      whereClause = `WHERE project_id = $${paramCount}`;
      params.push(projectId);
      paramCount++;
    }

    params.push(limit, offset);

    const result = await query(
      `SELECT 
        cs.id,
        cs.session_id,
        cs.project_id,
        cs.title,
        cs.phase,
        cs.is_active,
        cs.created_at,
        cs.updated_at,
        p.name as project_name,
        jsonb_array_length(cs.messages) as message_count,
        jsonb_array_length(cs.files) as file_count
      FROM chat_sessions cs
      LEFT JOIN projects p ON p.id = cs.project_id
      ${whereClause}
      ORDER BY cs.updated_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return NextResponse.json({
      sessions: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create or update chat session
export async function POST(request: NextRequest) {
  try {
    const session: ChatSession = await request.json();

    const savedSession = await withTransaction(async (client) => {
      // Check if session exists
      const existingSession = await client.query(
        `SELECT id FROM chat_sessions WHERE session_id = $1`,
        [session.id]
      );

      if (existingSession.rows.length > 0) {
        // Update existing session
        await client.query(
          `UPDATE chat_sessions SET
            title = $1,
            messages = $2,
            files = $3,
            phase = $4,
            is_active = $5,
            project_id = $6,
            updated_at = CURRENT_TIMESTAMP
          WHERE session_id = $7`,
          [
            session.title,
            JSON.stringify(session.messages),
            JSON.stringify(session.files),
            session.phase,
            session.isActive,
            session.projectId || null,
            session.id,
          ]
        );
      } else {
        // Insert new session
        await client.query(
          `INSERT INTO chat_sessions (
            session_id, project_id, title, messages, files, phase, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            session.id,
            session.projectId || null,
            session.title,
            JSON.stringify(session.messages),
            JSON.stringify(session.files),
            session.phase,
            session.isActive,
          ]
        );
      }

      // If this session is active, deactivate others
      if (session.isActive) {
        await client.query(
          `UPDATE chat_sessions 
           SET is_active = false 
           WHERE session_id != $1 AND is_active = true`,
          [session.id]
        );
      }

      return session;
    });

    return NextResponse.json({
      success: true,
      session: savedSession,
    });
  } catch (error) {
    console.error("Failed to save session:", error);
    return NextResponse.json(
      { error: "Failed to save session" },
      { status: 500 }
    );
  }
}
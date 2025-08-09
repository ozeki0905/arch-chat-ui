import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// DELETE /api/sessions/[sessionId] - Delete a chat session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;

    const result = await query(
      `DELETE FROM chat_sessions WHERE session_id = $1 RETURNING id`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
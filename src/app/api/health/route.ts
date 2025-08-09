import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET /api/health - Health check endpoint
export async function GET() {
  let dbStatus = 'unknown';
  let dbError = '';
  
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    dbStatus = 'connected';
  } catch (error) {
    console.error('Database health check failed:', error);
    dbStatus = 'disconnected';
    dbError = error instanceof Error ? error.message : 'Unknown error';
  }

  // Check OpenAI API key
  const openaiKeyStatus = process.env.OPENAI_API_KEY ? 'configured' : 'missing';
  
  const isHealthy = dbStatus === 'connected' && openaiKeyStatus === 'configured';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      database: dbStatus,
      openaiApiKey: openaiKeyStatus,
      timestamp: new Date().toISOString(),
      ...(dbError && { databaseError: dbError }),
    },
    { status: isHealthy ? 200 : 503 }
  );
}
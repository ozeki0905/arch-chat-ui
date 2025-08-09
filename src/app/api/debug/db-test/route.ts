import { NextResponse } from "next/server";
import pool, { query } from "@/lib/db";

// GET /api/debug/db-test - Test database connection and table existence
export async function GET() {
  const results: any = {
    connection: false,
    tables: {},
    error: null,
    config: {
      DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not configured',
      PGHOST: process.env.PGHOST || 'not set',
      PGPORT: process.env.PGPORT || '5432',
      PGDATABASE: process.env.PGDATABASE || 'not set',
      PGUSER: process.env.PGUSER || 'not set',
    }
  };

  try {
    // Test basic connection
    const client = await pool.connect();
    results.connection = true;
    
    // Check if required tables exist
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('projects', 'sites', 'tanks', 'regulations', 'criteria', 'soil_profiles', 'soil_layers', 'pile_catalog', 'calc_runs', 'audit_logs')
      ORDER BY table_name;
    `;
    
    const tableResult = await client.query(tableCheckQuery);
    const existingTables = tableResult.rows.map(row => row.table_name);
    
    const requiredTables = ['projects', 'sites', 'tanks', 'regulations', 'criteria', 'soil_profiles', 'soil_layers', 'pile_catalog', 'calc_runs', 'audit_logs'];
    
    requiredTables.forEach(table => {
      results.tables[table] = existingTables.includes(table);
    });
    
    // Test a simple insert/delete to verify permissions
    try {
      await client.query('BEGIN');
      const testResult = await client.query(
        'INSERT INTO projects (name, created_by) VALUES ($1, $2) RETURNING id',
        ['__test_project__', 'debug_test']
      );
      const testId = testResult.rows[0].id;
      await client.query('DELETE FROM projects WHERE id = $1', [testId]);
      await client.query('COMMIT');
      results.canWrite = true;
    } catch (writeError) {
      await client.query('ROLLBACK');
      results.canWrite = false;
      results.writeError = writeError instanceof Error ? writeError.message : 'Unknown write error';
    }
    
    client.release();
    
  } catch (error) {
    results.connection = false;
    results.error = error instanceof Error ? error.message : 'Unknown error';
  }

  const allTablesExist = Object.values(results.tables).every(exists => exists === true);
  const isHealthy = results.connection && allTablesExist && results.canWrite;

  return NextResponse.json(
    {
      ...results,
      healthy: isHealthy,
      advice: !isHealthy ? getAdvice(results) : 'Database is properly configured'
    },
    { status: isHealthy ? 200 : 503 }
  );
}

function getAdvice(results: any): string {
  const advice: string[] = [];
  
  if (!results.connection) {
    advice.push('Database connection failed. Check your DATABASE_URL or PG* environment variables.');
    advice.push('Make sure PostgreSQL is running and accessible.');
  } else {
    const missingTables = Object.entries(results.tables)
      .filter(([_, exists]) => !exists)
      .map(([table]) => table);
    
    if (missingTables.length > 0) {
      advice.push(`Missing tables: ${missingTables.join(', ')}`);
      advice.push('Run: psql $DATABASE_URL < src/lib/schema.sql');
    }
    
    if (results.canWrite === false) {
      advice.push('Database user lacks write permissions.');
      advice.push('Grant appropriate permissions to your database user.');
    }
  }
  
  if (results.config.DATABASE_URL === 'not configured' && 
      (results.config.PGHOST === 'not set' || results.config.PGDATABASE === 'not set')) {
    advice.push('No database configuration found. Set either DATABASE_URL or PG* environment variables.');
  }
  
  return advice.join(' ');
}
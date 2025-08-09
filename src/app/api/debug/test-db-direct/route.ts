import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET /api/debug/test-db-direct - Direct database test
export async function GET() {
  const tests: any[] = [];
  let client;
  
  try {
    // Test 1: Basic connection
    client = await pool.connect();
    tests.push({ test: "connection", status: "success", message: "Connected to database" });
    
    // Test 2: Check if projects table exists
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'projects'
        );
      `);
      const tableExists = tableCheck.rows[0].exists;
      tests.push({ 
        test: "projects_table_exists", 
        status: tableExists ? "success" : "failed",
        message: tableExists ? "Projects table exists" : "Projects table does not exist"
      });
    } catch (e: any) {
      tests.push({ 
        test: "projects_table_exists", 
        status: "error",
        message: e.message
      });
    }
    
    // Test 3: Check table structure
    try {
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
        ORDER BY ordinal_position;
      `);
      tests.push({ 
        test: "projects_table_structure", 
        status: "success",
        columns: columns.rows
      });
    } catch (e: any) {
      tests.push({ 
        test: "projects_table_structure", 
        status: "error",
        message: e.message
      });
    }
    
    // Test 4: Try minimal insert
    try {
      await client.query('BEGIN');
      const testResult = await client.query(
        `INSERT INTO projects (name, created_by) 
         VALUES ($1, $2) 
         RETURNING id, name, created_by`,
        ['Test Project ' + Date.now(), 'test_user']
      );
      await client.query('ROLLBACK'); // Don't actually save
      tests.push({ 
        test: "insert_test", 
        status: "success",
        message: "Insert test successful",
        result: testResult.rows[0]
      });
    } catch (e: any) {
      await client.query('ROLLBACK');
      tests.push({ 
        test: "insert_test", 
        status: "error",
        message: e.message,
        code: e.code,
        detail: e.detail,
        hint: e.hint
      });
    }
    
    // Test 5: Check if uuid-ossp extension is enabled
    try {
      const uuidTest = await client.query(`SELECT uuid_generate_v4();`);
      tests.push({ 
        test: "uuid_extension", 
        status: "success",
        message: "UUID extension is enabled",
        sample: uuidTest.rows[0].uuid_generate_v4
      });
    } catch (e: any) {
      tests.push({ 
        test: "uuid_extension", 
        status: "error",
        message: "UUID extension not enabled. Run: CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
        error: e.message
      });
    }
    
  } catch (error: any) {
    tests.push({ 
      test: "connection", 
      status: "error",
      message: error.message,
      code: error.code
    });
  } finally {
    if (client) {
      client.release();
    }
  }
  
  const allSuccess = tests.every(t => t.status === "success");
  
  return NextResponse.json(
    {
      success: allSuccess,
      tests,
      advice: getAdviceFromTests(tests)
    },
    { status: allSuccess ? 200 : 503 }
  );
}

function getAdviceFromTests(tests: any[]): string[] {
  const advice: string[] = [];
  
  for (const test of tests) {
    if (test.status !== "success") {
      switch (test.test) {
        case "connection":
          advice.push("Cannot connect to database. Check DATABASE_URL or PostgreSQL service.");
          break;
        case "projects_table_exists":
          advice.push("Projects table does not exist. Run: psql $DATABASE_URL < src/lib/schema.sql");
          break;
        case "uuid_extension":
          advice.push("UUID extension not enabled. Run: CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";");
          break;
        case "insert_test":
          if (test.code === '23502') {
            advice.push(`Column '${test.detail}' cannot be null. Check your data.`);
          } else {
            advice.push(`Insert failed: ${test.message}`);
          }
          break;
      }
    }
  }
  
  return advice;
}
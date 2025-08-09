import { NextResponse } from "next/server";
import { mockDb, isUsingMockDb } from "@/lib/db-wrapper";

// GET /api/test-mock - Test mock database functionality
export async function GET() {
  if (!isUsingMockDb()) {
    return NextResponse.json({
      error: "Not using mock database",
      advice: "Mock database is only used when PostgreSQL is not configured"
    }, { status: 400 });
  }

  try {
    // Test creating a project
    const testProject = {
      project: {
        name: "Test Project",
        created_by: "test-api"
      },
      site: {
        site_name: "Test Site",
        location: "Tokyo"
      },
      tank: {
        capacity_kl: 500,
        content_type: "Fuel"
      }
    };

    const { projectId } = await mockDb.createProject(testProject);
    
    // Test retrieving the project
    const retrievedProject = await mockDb.getProject(projectId);
    
    // Test listing projects
    const { projects, total } = await mockDb.listProjects();

    return NextResponse.json({
      success: true,
      usingMockDb: true,
      tests: {
        projectCreated: {
          id: projectId,
          name: testProject.project.name
        },
        projectRetrieved: !!retrievedProject,
        projectsList: {
          count: projects.length,
          total
        }
      },
      message: "Mock database is working correctly!"
    });

  } catch (error) {
    return NextResponse.json({
      error: "Mock database test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
import { NextResponse } from "next/server";

// POST /api/debug/test-create-project - Test minimal project creation
export async function POST() {
  try {
    // Create minimal test data
    const testData = {
      project: {
        name: "テストプロジェクト " + new Date().toISOString(),
        created_by: "debug_test"
      },
      site: {
        site_name: "テストサイト",
        location: "東京都"
      }
    };

    console.log("Testing project creation with data:", testData);

    // Call the actual projects API
    const response = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: responseData.error || 'Project creation failed',
          details: responseData.details || 'No details provided',
          sentData: testData,
          responseStatus: response.status,
          responseData
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      projectId: responseData.projectId,
      message: 'Test project created successfully',
      sentData: testData,
      responseData
    });

  } catch (error) {
    console.error("Test project creation error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
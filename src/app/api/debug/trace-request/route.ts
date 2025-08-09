import { NextRequest, NextResponse } from "next/server";

// POST /api/debug/trace-request - Trace a project creation request
export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    
    console.log("=== TRACE REQUEST DEBUG ===");
    console.log("Received body:", JSON.stringify(body, null, 2));
    console.log("Body type:", typeof body);
    console.log("Body keys:", Object.keys(body || {}));
    
    // Check for empty object
    if (!body || Object.keys(body).length === 0) {
      console.log("WARNING: Received empty object!");
      return NextResponse.json(
        {
          error: "Empty request body",
          details: "The request body is empty or contains no data",
          receivedBody: body,
          receivedType: typeof body
        },
        { status: 400 }
      );
    }
    
    // Try to call the actual projects API
    const projectsUrl = new URL('/api/projects', request.url).href;
    console.log("Forwarding to:", projectsUrl);
    
    const projectsResponse = await fetch(projectsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const responseText = await projectsResponse.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawText: responseText };
    }
    
    console.log("Projects API response:", {
      status: projectsResponse.status,
      statusText: projectsResponse.statusText,
      headers: Object.fromEntries(projectsResponse.headers.entries()),
      body: responseData
    });
    
    // Return detailed trace information
    return NextResponse.json(
      {
        trace: {
          receivedBody: body,
          bodyKeys: Object.keys(body || {}),
          isEmpty: Object.keys(body || {}).length === 0,
          forwardedTo: projectsUrl,
          response: {
            status: projectsResponse.status,
            statusText: projectsResponse.statusText,
            body: responseData
          }
        }
      },
      { status: projectsResponse.ok ? 200 : projectsResponse.status }
    );
    
  } catch (error) {
    console.error("Trace request error:", error);
    
    return NextResponse.json(
      {
        error: "Trace request failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
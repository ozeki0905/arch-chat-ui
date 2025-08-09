/**
 * Debug wrapper for fetch to log request/response details
 */
export async function debugFetch(url: string, options?: RequestInit): Promise<Response> {
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`[FETCH ${requestId}] Request:`, {
    url,
    method: options?.method || 'GET',
    headers: options?.headers,
    bodyLength: options?.body ? String(options.body).length : 0,
    body: options?.body ? (
      typeof options.body === 'string' && options.body.length < 1000 
        ? options.body 
        : '[Body too large to log]'
    ) : undefined
  });
  
  try {
    const response = await fetch(url, options);
    
    console.log(`[FETCH ${requestId}] Response:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url
    });
    
    // Clone response to read body without consuming it
    if (!response.ok) {
      const cloned = response.clone();
      try {
        const errorBody = await cloned.text();
        console.error(`[FETCH ${requestId}] Error body:`, errorBody);
      } catch (e) {
        console.error(`[FETCH ${requestId}] Could not read error body:`, e);
      }
    }
    
    return response;
  } catch (error) {
    console.error(`[FETCH ${requestId}] Network error:`, error);
    throw error;
  }
}

// Export a flag to enable/disable debug logging
export const enableDebugFetch = true;
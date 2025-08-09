import { ChatSession, SessionSummary } from '@/types/chat';

const API_BASE = '/api/sessions';

// Load all sessions from database
export async function loadSessionsFromDB(): Promise<ChatSession[]> {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error('Failed to load sessions');
    }
    const data = await response.json();
    return data.sessions.map((s: any) => ({
      id: s.session_id,
      title: s.title,
      createdAt: new Date(s.created_at).getTime(),
      updatedAt: new Date(s.updated_at).getTime(),
      messages: s.messages || [],
      files: s.files || [],
      phase: s.phase,
      isActive: s.is_active,
      projectId: s.project_id,
    }));
  } catch (error) {
    console.error('Failed to load sessions from DB:', error);
    return [];
  }
}

// Save session to database
export async function saveSessionToDB(session: ChatSession): Promise<void> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save session');
    }
  } catch (error) {
    console.error('Failed to save session to DB:', error);
    // Fallback to localStorage
    const sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
    const index = sessions.findIndex((s: ChatSession) => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
  }
}

// Delete session from database
export async function deleteSessionFromDB(sessionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/${sessionId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
  } catch (error) {
    console.error('Failed to delete session from DB:', error);
    // Fallback to localStorage
    const sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
    const filtered = sessions.filter((s: ChatSession) => s.id !== sessionId);
    localStorage.setItem('chatSessions', JSON.stringify(filtered));
  }
}

// Load session summaries from database
export async function loadSessionSummariesFromDB(): Promise<SessionSummary[]> {
  try {
    const response = await fetch(`${API_BASE}?limit=100`);
    if (!response.ok) {
      throw new Error('Failed to load session summaries');
    }
    const data = await response.json();
    return data.sessions.map((s: any) => ({
      id: s.session_id,
      title: s.title,
      createdAt: new Date(s.created_at).getTime(),
      updatedAt: new Date(s.updated_at).getTime(),
      messageCount: s.message_count,
      fileCount: s.file_count,
      phase: s.phase,
    }));
  } catch (error) {
    console.error('Failed to load session summaries from DB:', error);
    // Fallback to localStorage
    const sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]') as ChatSession[];
    return sessions.map(s => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s.messages.length,
      fileCount: s.files.length,
      phase: s.phase,
    }));
  }
}

// Create project and link to session
export async function createProjectFromSession(
  session: ChatSession,
  designData: any
): Promise<string | null> {
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(designData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create project');
    }
    
    const { projectId } = await response.json();
    
    // Update session with project ID
    session.projectId = projectId;
    await saveSessionToDB(session);
    
    return projectId;
  } catch (error) {
    console.error('Failed to create project:', error);
    return null;
  }
}

// Load project data
export async function loadProjectData(projectId: string): Promise<any | null> {
  try {
    const response = await fetch(`/api/projects/${projectId}`);
    if (!response.ok) {
      throw new Error('Failed to load project');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load project:', error);
    return null;
  }
}

// Create calculation run
export async function createCalculationRun(
  projectId: string,
  designInput: any
): Promise<string | null> {
  try {
    const response = await fetch('/api/calc-runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId, designInput }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create calculation run');
    }
    
    const { runId } = await response.json();
    return runId;
  } catch (error) {
    console.error('Failed to create calculation run:', error);
    return null;
  }
}

// Check calculation status
export async function checkCalculationStatus(runId: string): Promise<any | null> {
  try {
    const response = await fetch(`/api/calc-runs/${runId}`);
    if (!response.ok) {
      throw new Error('Failed to check calculation status');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to check calculation status:', error);
    return null;
  }
}
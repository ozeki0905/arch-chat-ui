// Mock database implementation for development without PostgreSQL
import { TankFoundationDesignInput } from "@/types/tankFoundationDesign";
import { ChatSession } from "@/types/chat";

// In-memory storage
const storage = {
  projects: new Map<string, any>(),
  sessions: new Map<string, ChatSession>(),
  calcRuns: new Map<string, any>(),
};

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const mockDb = {
  // Projects
  async createProject(designInput: TankFoundationDesignInput) {
    const projectId = generateId();
    const project = {
      id: projectId,
      name: designInput.project.name,
      created_by: designInput.project.created_by || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: designInput,
    };
    storage.projects.set(projectId, project);
    return { projectId, projectName: project.name };
  },

  async updateProject(projectId: string, updates: Partial<TankFoundationDesignInput>) {
    const project = storage.projects.get(projectId);
    if (!project) throw new Error('Project not found');
    
    project.data = { ...project.data, ...updates };
    project.updated_at = new Date().toISOString();
    storage.projects.set(projectId, project);
    return { success: true };
  },

  async getProject(projectId: string) {
    const project = storage.projects.get(projectId);
    if (!project) return null;
    return project.data;
  },

  async listProjects(limit = 20, offset = 0) {
    const projects = Array.from(storage.projects.values())
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(offset, offset + limit)
      .map(p => ({
        id: p.id,
        name: p.name,
        created_by: p.created_by,
        created_at: p.created_at,
        updated_at: p.updated_at,
        site_name: p.data.site?.site_name,
        location: p.data.site?.location,
        capacity_kl: p.data.tank?.capacity_kl,
        content_type: p.data.tank?.content_type,
      }));
    
    return {
      projects,
      total: storage.projects.size,
    };
  },

  // Sessions
  async saveSession(session: ChatSession) {
    storage.sessions.set(session.id, session);
    return true;
  },

  async getSessions(projectId?: string) {
    let sessions = Array.from(storage.sessions.values());
    if (projectId) {
      sessions = sessions.filter(s => s.metadata?.projectId === projectId);
    }
    return sessions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  // Calc runs
  async createCalcRun(projectId: string, designInput: TankFoundationDesignInput) {
    const runId = generateId();
    const calcRun = {
      id: runId,
      project_id: projectId,
      status: 'pending',
      created_at: new Date().toISOString(),
      input: designInput,
    };
    storage.calcRuns.set(runId, calcRun);
    
    // Simulate calculation completion after 2 seconds
    setTimeout(() => {
      const run = storage.calcRuns.get(runId);
      if (run) {
        run.status = 'succeeded';
        run.result = {
          foundation_type: 'pile',
          pile_count: 12,
          pile_diameter_mm: 600,
          pile_length_m: 15,
          safety_factors: {
            bearing: 3.2,
            settlement: 1.8,
            overturning: 2.5,
          },
        };
        storage.calcRuns.set(runId, run);
      }
    }, 2000);
    
    return { runId };
  },

  async getCalcRun(runId: string) {
    return storage.calcRuns.get(runId) || null;
  },

  // Health check
  async testConnection() {
    return {
      connection: true,
      tables: {
        projects: true,
        sites: true,
        tanks: true,
        regulations: true,
        criteria: true,
        soil_profiles: true,
        soil_layers: true,
        pile_catalog: true,
        calc_runs: true,
        audit_logs: true,
      },
      canWrite: true,
      healthy: true,
      config: {
        DATABASE_URL: 'mock://in-memory',
        PGHOST: 'mock',
        PGPORT: 'mock',
        PGDATABASE: 'mock',
        PGUSER: 'mock',
      },
      advice: 'Using mock database (no PostgreSQL required)',
    };
  },
};

// Helper functions to match the original db.ts interface
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  // Mock transaction - just execute the callback
  const mockClient = {
    query: async (text: string, params?: any[]) => {
      // Parse simple INSERT/SELECT queries for mock implementation
      console.log('Mock query:', text, params);
      return { rows: [], rowCount: 0 };
    },
  };
  return await callback(mockClient);
}

export async function query(text: string, params?: any[]) {
  console.log('Mock query:', text, params);
  return { rows: [], rowCount: 0 };
}

export async function getClient() {
  return {
    query: async (text: string, params?: any[]) => {
      console.log('Mock client query:', text, params);
      return { rows: [], rowCount: 0 };
    },
    release: () => {},
  };
}

const mockPool = {
  connect: getClient,
  on: (event: string, handler: Function) => {},
};

export default mockPool;
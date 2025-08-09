-- Tank Foundation Design Database Schema
-- Compatible with PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  site_name VARCHAR(255) NOT NULL,
  location TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  elevation_gl DECIMAL(10, 2),
  airport_constraints VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tanks table
CREATE TABLE IF NOT EXISTS tanks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  capacity_kl DECIMAL(12, 2) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  unit_weight_kn_m3 DECIMAL(10, 2),
  shape VARCHAR(50) DEFAULT 'cylindrical',
  diameter_m DECIMAL(10, 2),
  height_m DECIMAL(10, 2),
  roof_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Regulations table
CREATE TABLE IF NOT EXISTS regulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  legal_classification VARCHAR(100) NOT NULL,
  applied_codes TEXT[], -- Array of code names
  code_versions JSONB, -- JSON object with code versions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Design criteria table
CREATE TABLE IF NOT EXISTS criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  seismic_level VARCHAR(10) DEFAULT 'L2',
  kh DECIMAL(5, 3),
  kv DECIMAL(5, 3),
  sf_bearing DECIMAL(5, 2) NOT NULL,
  total_settlement_limit_mm INTEGER,
  diff_settlement_ratio VARCHAR(20),
  allowable_stress_pile_mpa DECIMAL(10, 2),
  consider_liquefaction BOOLEAN DEFAULT false,
  consider_negative_friction BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Soil layers table
CREATE TABLE IF NOT EXISTS soil_layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  z_from_m DECIMAL(10, 2) NOT NULL,
  z_to_m DECIMAL(10, 2) NOT NULL,
  soil_type VARCHAR(50) NOT NULL,
  n_value DECIMAL(10, 2),
  k30_mn_m3 DECIMAL(10, 2),
  gamma_t_kn_m3 DECIMAL(10, 2),
  gamma_sat_kn_m3 DECIMAL(10, 2),
  dr_percent DECIMAL(5, 2),
  fc_percent DECIMAL(5, 2),
  layer_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT soil_layers_order_unique UNIQUE (project_id, layer_order)
);

-- Soil profile table (contains groundwater level)
CREATE TABLE IF NOT EXISTS soil_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gw_level_m DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pile catalog table
CREATE TABLE IF NOT EXISTS pile_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_code VARCHAR(50) NOT NULL,
  diameter_mm INTEGER NOT NULL,
  thickness_mm INTEGER,
  length_range_m_min DECIMAL(10, 2),
  length_range_m_max DECIMAL(10, 2),
  method VARCHAR(100) NOT NULL,
  qa_formula_code VARCHAR(100),
  material_allowable_stress_mpa DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calculation runs table
CREATE TABLE IF NOT EXISTS calc_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued', -- queued, running, succeeded, failed
  input_data JSONB NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calculation results table
CREATE TABLE IF NOT EXISTS calc_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES calc_runs(id) ON DELETE CASCADE,
  result_data JSONB NOT NULL,
  facility_result JSONB,
  geometry_result JSONB,
  ground_result JSONB,
  direct_foundation_result JSONB,
  pile_design_result JSONB,
  assumptions TEXT[],
  versions JSONB,
  hash VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LLM results table
CREATE TABLE IF NOT EXISTS llm_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES calc_runs(id) ON DELETE CASCADE,
  result_type VARCHAR(50) NOT NULL, -- facility, ground, direct, pile, deficiency, audit
  result_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(100),
  target_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat sessions table (for UI state persistence)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255),
  messages JSONB,
  files JSONB,
  phase VARCHAR(10),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_sites_project_id ON sites(project_id);
CREATE INDEX idx_tanks_project_id ON tanks(project_id);
CREATE INDEX idx_regulations_project_id ON regulations(project_id);
CREATE INDEX idx_criteria_project_id ON criteria(project_id);
CREATE INDEX idx_soil_layers_project_id ON soil_layers(project_id);
CREATE INDEX idx_soil_profiles_project_id ON soil_profiles(project_id);
CREATE INDEX idx_pile_catalog_project_id ON pile_catalog(project_id);
CREATE INDEX idx_calc_runs_project_id ON calc_runs(project_id);
CREATE INDEX idx_calc_runs_status ON calc_runs(status);
CREATE INDEX idx_calc_results_run_id ON calc_results(run_id);
CREATE INDEX idx_llm_results_run_id ON llm_results(run_id);
CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_chat_sessions_project_id ON chat_sessions(project_id);
CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tanks_updated_at BEFORE UPDATE ON tanks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regulations_updated_at BEFORE UPDATE ON regulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_criteria_updated_at BEFORE UPDATE ON criteria
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soil_profiles_updated_at BEFORE UPDATE ON soil_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calc_runs_updated_at BEFORE UPDATE ON calc_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
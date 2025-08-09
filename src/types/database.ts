// Database table types
// These match the PostgreSQL schema structure

export interface DBProject {
  id: string;
  name: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DBSite {
  id: string;
  project_id: string;
  site_name: string;
  location?: string;
  lat?: number;
  lng?: number;
  elevation_gl?: number;
  airport_constraints?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DBTank {
  id: string;
  project_id: string;
  capacity_kl: number;
  content_type: string;
  unit_weight_kn_m3?: number;
  shape: string;
  diameter_m?: number;
  height_m?: number;
  roof_type?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DBRegulations {
  id: string;
  project_id: string;
  legal_classification: string;
  applied_codes: string[];
  code_versions?: Record<string, string>;
  created_at: Date;
  updated_at: Date;
}

export interface DBCriteria {
  id: string;
  project_id: string;
  seismic_level: string;
  kh?: number;
  kv?: number;
  sf_bearing: number;
  total_settlement_limit_mm?: number;
  diff_settlement_ratio?: string;
  allowable_stress_pile_mpa?: number;
  consider_liquefaction: boolean;
  consider_negative_friction: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DBSoilLayer {
  id: string;
  project_id: string;
  z_from_m: number;
  z_to_m: number;
  soil_type: string;
  n_value?: number;
  k30_mn_m3?: number;
  gamma_t_kn_m3?: number;
  gamma_sat_kn_m3?: number;
  dr_percent?: number;
  fc_percent?: number;
  layer_order: number;
  created_at: Date;
}

export interface DBSoilProfile {
  id: string;
  project_id: string;
  gw_level_m?: number;
  created_at: Date;
  updated_at: Date;
}

export interface DBPileCatalog {
  id: string;
  project_id: string;
  type_code: string;
  diameter_mm: number;
  thickness_mm?: number;
  length_range_m_min?: number;
  length_range_m_max?: number;
  method: string;
  qa_formula_code?: string;
  material_allowable_stress_mpa?: number;
  created_at: Date;
}

export interface DBCalcRun {
  id: string;
  project_id: string;
  run_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  input_data: any;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DBCalcResult {
  id: string;
  run_id: string;
  result_data: any;
  facility_result?: any;
  geometry_result?: any;
  ground_result?: any;
  direct_foundation_result?: any;
  pile_design_result?: any;
  assumptions?: string[];
  versions?: Record<string, string>;
  hash?: string;
  created_at: Date;
}

export interface DBLLMResult {
  id: string;
  run_id: string;
  result_type: 'facility' | 'ground' | 'direct' | 'pile' | 'deficiency' | 'audit';
  result_data: any;
  created_at: Date;
}

export interface DBAuditLog {
  id: string;
  project_id?: string;
  user_id?: string;
  action: string;
  target_table?: string;
  target_id?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface DBChatSession {
  id: string;
  project_id?: string;
  session_id: string;
  title?: string;
  messages?: any[];
  files?: any[];
  phase?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
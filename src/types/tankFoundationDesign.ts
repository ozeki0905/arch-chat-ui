// Tank Foundation Design Types
// Based on specification v1.0

export interface TankFoundationDesignInput {
  project: ProjectInput;
  site: SiteInput;
  tank: TankInput;
  regulations: RegulationsInput;
  criteria: CriteriaInput;
  soil_profile: SoilProfileInput;
  pile_catalog: PileCatalogItem[];
  load_cases: LoadCase[];
  ui_flags?: UIFlags;
}

export interface ProjectInput {
  project_id: string;
  name: string;
  created_by?: string;
  created_at?: string;
}

export interface SiteInput {
  site_name: string;
  location: string;
  lat?: number;
  lng?: number;
  elevation_gl?: number;
  airport_constraints?: string;
}

export interface TankInput {
  capacity_kl: number;
  content_type: string;
  unit_weight_kn_m3?: number;
  shape: "cylindrical";
  diameter_m?: number;
  height_m?: number;
  roof_type?: "固定" | "浮屋根" | "不明";
}

export interface RegulationsInput {
  legal_classification: string;
  applied_codes: string[];
  code_versions?: Record<string, string>;
}

export interface CriteriaInput {
  seismic_level: "L2";
  kh?: number;
  kv?: number;
  sf_bearing: number;
  total_settlement_limit_mm?: number;
  diff_settlement_ratio: string;
  allowable_stress_pile_mpa?: number;
  consider_liquefaction: boolean;
  consider_negative_friction: boolean;
}

export interface SoilProfileInput {
  gw_level_m?: number;
  layers: SoilLayer[];
}

export interface SoilLayer {
  z_from_m: number;
  z_to_m: number;
  soil_type: "砂" | "シルト" | "粘土" | "ローム" | "礫" | "その他";
  N_value?: number;
  K30_MN_m3?: number;
  gamma_t_kn_m3?: number;
  gamma_sat_kn_m3?: number;
  Dr_percent?: number;
  FC_percent?: number;
}

export interface PileCatalogItem {
  type_code: "PHC" | "SC" | "鋼管" | "場所打ち";
  diameter_mm: number;
  thickness_mm?: number;
  length_range_m?: [number, number];
  method: string;
  qa_formula_code?: string;
  material_allowable_stress_mpa?: number;
}

export interface LoadCase {
  case_id: string;
  name: "常時" | "満載" | "地震時L2";
  include_content?: boolean;
  include_seismic?: boolean;
}

export interface UIFlags {
  show_all_assumptions?: boolean;
  language?: "ja" | "en";
}

// Calculation Result Types
export interface CalcResult {
  facility: FacilityResult;
  geometry: GeometryResult;
  ground: GroundResult;
  direct_foundation: DirectFoundationResult;
  pile_design: PileDesignResult;
  assumptions: string[];
  versions: Record<string, string>;
  hash: string;
}

export interface FacilityResult {
  classification: string;
  articles?: Array<{ law: string; article: string }>;
}

export interface GeometryResult {
  capacity_m3: number;
  d_m: number;
  h_m: number;
  volume_m3: number;
  diff_percent: number;
}

export interface GroundResult {
  summary: {
    min_N?: number;
    min_K30?: number;
  };
  compliance: {
    i?: boolean;
    ro?: boolean;
    ha?: string;
  };
  limits: {
    sf_bearing: number;
    diff_settlement_ratio: string;
  };
}

export interface DirectFoundationResult {
  ok: boolean;
  governing?: string;
}

export interface PileDesignResult {
  options: PileOption[];
  selected?: string;
}

export interface PileOption {
  type: string;
  D_mm: number;
  L_m: number;
  n: number;
  sf: number;
  stress_ratio: number;
  group_eta: number;
  layout: {
    rings: number;
    pitch_min_D: number;
  };
}

// Validation Response
export interface ValidationResponse {
  valid: boolean;
  warnings: string[];
}

// Run Response
export interface RunResponse {
  run_id: string;
}

// Run Status Response
export interface RunStatusResponse {
  status: "queued" | "running" | "succeeded" | "failed";
  result?: CalcResult;
  llm?: {
    facility?: ClassifyFacilityResult;
    ground?: GroundComplianceExplainResult;
    direct?: DirectFoundationCommentResult;
    pile?: PileRationaleResult;
    deficiency?: DeficiencyListResult;
    audit?: AuditSummaryResult;
  };
}

// LLM Result Types
export interface ClassifyFacilityResult {
  classification: string;
  key_articles: Array<{ law: string; article: string }>;
  rationale_bullets: string[];
}

export interface GroundComplianceExplainResult {
  conclusion: string;
  bullets: string[];
  missing_recommendations: string[];
}

export interface DirectFoundationCommentResult {
  lines: string[];
}

export interface PileRationaleResult {
  title: string;
  bullets: string[];
  alternatives: string[];
}

export interface DeficiencyListResult {
  blocking: string[];
  recommended_actions: string[];
  nice_to_have: string[];
}

export interface AuditSummaryResult {
  summary_lines: string[];
}

// Wizard Step Types
export type Phase2WizardStep = 
  | "basic_info"
  | "tank_spec"
  | "regulations"
  | "soil_data"
  | "design_criteria"
  | "pile_catalog"
  | "review";

export interface Phase2WizardState {
  currentStep: Phase2WizardStep;
  data: Partial<TankFoundationDesignInput>;
  validation: Record<Phase2WizardStep, ValidationResponse>;
  isValidating: boolean;
  isCalculating: boolean;
  runId?: string;
}
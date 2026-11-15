// All TypeScript interfaces for CryptoPilot

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FindingStatus = 'open' | 'accepted' | 'mitigated' | 'false_positive';
export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed';
export type ExperimentStatus = 'pending' | 'running' | 'completed' | 'failed';
export type MigrationStatus = 'draft' | 'in_progress' | 'completed' | 'failed';

export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  display_name?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string | number;
  name: string;
  description?: string;
  owner_id?: string | number;
  source_type?: string;
  source_path?: string;
  language?: string;
  is_demo?: boolean;
  created_at: string;
  updated_at?: string;
  last_scan_at?: string;
  scan_count?: number;
  finding_counts?: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    total: number;
  };
  migration_progress?: number;
  latest_scan?: Scan;
}

export interface Scan {
  id: string;
  project_id: string;
  status: ScanStatus;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  error_message?: string;
  findings_count: number;
  files_scanned: number;
  scanner_version?: string;
}

export interface CryptoFinding {
  id: string | number;
  scan_id: string | number;
  project_id?: string | number;
  algorithm: string;
  operation: string;
  file_path: string;
  line_number: number;
  function_name?: string;
  library?: string;
  detection_method: string;
  confidence: number;
  evidence?: string;
  severity: Severity | string;
  status: FindingStatus | string;
  quantum_safe?: boolean;
  nist_status?: string;
  recommendation?: string;
  risk_score?: number;
  created_at: string;
  updated_at?: string;
}

export interface Dependency {
  id: string;
  project_id: string;
  name: string;
  version?: string;
  package_manager: string;
  is_crypto_related: boolean;
  algorithms_used: string[];
  created_at: string;
}

export interface DependencyRelation {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: 'confirmed' | 'inferred';
}

export interface RiskAssessment {
  id: string;
  finding_id: string;
  project_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  explanation: string;
  factors: {
    algorithm_weakness: number;
    key_size: number;
    usage_context: number;
    quantum_vulnerability: number;
    nist_status: number;
    exploitability: number;
  };
  created_at: string;
  finding?: CryptoFinding;
}

export interface MigrationPlan {
  id: string | number;
  project_id: string | number;
  finding_id?: string | number;
  title?: string;
  from_algorithm?: string;
  to_algorithm?: string;
  replacement_algorithm?: string;
  patch_code?: string;
  priority?: string;
  effort_estimate?: string;
  description?: string;
  status: MigrationStatus | string;
  notes?: string;
  patch_diff?: string;
  steps?: MigrationStep[];
  created_at: string;
  updated_at?: string;
  finding?: CryptoFinding;
}

export interface MigrationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  order: number;
}

export interface MigrationExperiment {
  id: string | number;
  plan_id: string | number;
  status: ExperimentStatus | string;
  started_at?: string;
  completed_at?: string;
  patch_diff?: string;
  patch_applied?: string;
  stdout?: string;
  stderr?: string;
  error_message?: string;
  created_at?: string;
}

export interface TestResult {
  id: string | number;
  experiment_id: string | number;
  test_name?: string;
  name?: string;
  test_type?: string;
  status: 'passed' | 'failed' | 'error' | 'skipped' | 'PASSED' | 'FAILED' | string;
  outcome?: string;
  duration?: number;
  duration_ms?: number;
  duration_seconds?: number;
  output?: string;
  message?: string;
  error?: string;
  error_message?: string;
  created_at?: string;
}

export interface BenchmarkResult {
  id: string | number;
  experiment_id: string | number;
  operation?: string;
  algorithm?: string;
  phase: 'before' | 'after' | string;
  metric?: string;
  value: number;
  unit?: string;
  environment?: string | Record<string, unknown>;
  iterations?: number;
  avg_time_ms?: number;
  min_time_ms?: number;
  max_time_ms?: number;
  created_at?: string;
}

export interface Advisory {
  id: string | number;
  source: string;
  external_id: string;
  title: string;
  description?: string;
  summary?: string;
  severity: Severity | string;
  status?: string;
  affected_packages?: string[];
  affected_algorithms?: string[];
  published_at?: string;
  retrieved_at?: string;
  updated_at?: string;
  references?: string[];
  url?: string;
}

export interface DriftEvent {
  id: string | number;
  project_id: string | number;
  scan_id_before?: string | number;
  scan_id_after?: string | number;
  event_type: 'new_finding' | 'removed_finding' | 'severity_changed' | 'status_changed' | string;
  finding_id?: string | number;
  description?: string;
  severity?: string;
  details?: Record<string, unknown>;
  created_at: string;
  finding?: CryptoFinding;
}

export interface AuditEvent {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CBOMComponent {
  type: string;
  name: string;
  version?: string;
  'bom-ref': string;
  cryptoProperties?: {
    assetType: string;
    algorithm?: {
      primitive: string;
      parameterSetIdentifier?: string;
      curve?: string;
      executionEnvironment?: string;
      implementationPlatform?: string;
      certificationLevel?: string[];
      mode?: string;
      padding?: string;
      cryptoFunctions?: string[];
      classicalSecurityLevel?: number;
      nistQuantumSecurityLevel?: number;
    };
  };
  evidence?: {
    occurrences: Array<{
      location: string;
      line?: number;
      offset?: number;
      symbol?: string;
      additionalContext?: string;
    }>;
  };
}

export interface CBOMDocument {
  bomFormat: string;
  specVersion: string;
  version: number;
  serialNumber: string;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
    component: { type: string; name: string };
  };
  components: CBOMComponent[];
  dependencies: Array<{ ref: string; dependsOn: string[] }>;
}

export interface ReportData {
  report_type: string;
  project_id: string;
  project_name: string;
  generated_at: string;
  executive_summary: string;
  findings_summary: {
    total: number;
    by_severity: Record<string, number>;
    by_algorithm: Record<string, number>;
    by_status: Record<string, number>;
  };
  critical_findings: CryptoFinding[];
  risk_assessments: RiskAssessment[];
  migration_progress: {
    total_plans: number;
    completed: number;
    in_progress: number;
    draft: number;
  };
  recommendations: string[];
  advisories_matched: Advisory[];
}

export interface AIResponse {
  answer: string;
  provider: string;
  model?: string;
  tokens_used?: number;
}

export interface GraphNode {
  id: string;
  type: 'algorithm' | 'library' | 'file';
  label: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'confirmed' | 'inferred';
  label?: string;
}

export interface DashboardStats {
  total_projects: number;
  total_findings: number;
  critical_findings: number;
  high_risk_projects: number;
  migration_progress: number;
  recent_scans: Scan[];
  risk_distribution: { level: string; count: number; color: string }[];
  algorithm_distribution: { algorithm: string; count: number }[];
  active_advisories: Advisory[];
  drift_events: DriftEvent[];
}

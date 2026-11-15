import apiClient from './client';

export interface ComplianceViolation {
  rule: string;
  finding: string;
  status: 'FAIL' | 'WARNING' | 'PASS';
  impact: string;
  remediation: string;
}

export interface ComplianceFrameworkReport {
  id: string;
  name: string;
  title: string;
  authority: string;
  score: number;
  status: string;
  mandatory_by: string;
  summary: string;
  violations: ComplianceViolation[];
}

export interface ComplianceAuditResponse {
  project_id: number;
  project_name: string;
  scan_id: number | null;
  total_findings_evaluated: number;
  overall_compliance_score: number;
  passed_frameworks: string;
  audit_timestamp: string;
  frameworks: ComplianceFrameworkReport[];
}

export async function getProjectCompliance(projectId: string | number): Promise<ComplianceAuditResponse> {
  const res = await apiClient.get(`/api/compliance/${projectId}`);
  return res.data;
}

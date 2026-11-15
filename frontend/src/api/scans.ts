import apiClient from './client';
import type { Scan, CryptoFinding } from '../types';

export interface FindingsResponse {
  items: CryptoFinding[];
  total: number;
  page: number;
  page_size: number;
}

export interface ScanStatusResponse {
  id: number;
  project_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  step: string;
  total_findings: number;
  error_message: string;
  started_at: string;
  completed_at?: string;
}

export interface SnippetAnalysisResult {
  algorithm: string;
  operation: string;
  line_number: number;
  library: string;
  evidence: string;
  severity: string;
  quantum_safe: boolean;
  nist_status: string;
  recommendation: string;
  risk_score: number;
  risk_level: string;
  explanation: string;
}

export interface SnippetAnalysisResponse {
  success: boolean;
  error?: string;
  total_detected: number;
  findings: SnippetAnalysisResult[];
}

export async function getScan(scanId: string): Promise<Scan> {
  const res = await apiClient.get(`/api/scans/${scanId}`);
  return res.data;
}

export async function getScanStatus(scanId: string): Promise<ScanStatusResponse> {
  const res = await apiClient.get(`/api/scans/${scanId}/status`);
  return res.data;
}

export async function getScanFindings(
  scanId: string,
  params?: { page?: number; page_size?: number; severity?: string; algorithm?: string }
): Promise<FindingsResponse> {
  const res = await apiClient.get(`/api/scans/${scanId}/findings`, { params });
  return res.data;
}

export async function analyzeSnippet(code: string, language = 'python'): Promise<SnippetAnalysisResponse> {
  const res = await apiClient.post('/api/scans/analyze-snippet', { code, language });
  return res.data;
}

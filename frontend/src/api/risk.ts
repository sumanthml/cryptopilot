import apiClient from './client';
import type { RiskAssessment } from '../types';

export interface RiskDashboard {
  project_id: string;
  total_findings: number;
  risk_distribution: { level: string; count: number }[];
  avg_risk_score: number;
  top_risks: RiskAssessment[];
  algorithm_distribution: { algorithm: string; count: number }[];
}

export async function getProjectRisks(projectId: string): Promise<RiskAssessment[]> {
  const res = await apiClient.get(`/api/projects/${projectId}/risks`);
  return Array.isArray(res.data) ? res.data : (res.data?.risks || []);
}

export async function assessRisk(findingId: string): Promise<RiskAssessment> {
  const res = await apiClient.post(`/api/risk/assess/${findingId}`);
  return res.data;
}

export async function getRiskDashboard(projectId: string): Promise<RiskDashboard> {
  const res = await apiClient.get(`/api/risk/dashboard/${projectId}`);
  return res.data;
}

import apiClient from './client';
import type { RiskAssessment } from '../types';
import { DEMO_RISK_DASHBOARD } from './demoData';

export interface RiskDashboard {
  project_id: string;
  total_findings: number;
  risk_distribution: { level: string; count: number }[];
  avg_risk_score: number;
  top_risks: RiskAssessment[];
  algorithm_distribution: { algorithm: string; count: number }[];
}

export async function getProjectRisks(projectId: string): Promise<RiskAssessment[]> {
  try {
    const res = await apiClient.get(`/api/projects/${projectId}/risks`);
    const data = Array.isArray(res.data) ? res.data : res.data?.risks || [];
    if (data.length > 0) return data;
    if (localStorage.getItem('cryptopilot_demo_sample_removed') !== 'true') {
      return DEMO_RISK_DASHBOARD.top_risks;
    }
    return [];
  } catch (err) {
    console.warn('getProjectRisks API unavailable, using demo risks:', err);
    if (localStorage.getItem('cryptopilot_demo_sample_removed') !== 'true') {
      return DEMO_RISK_DASHBOARD.top_risks;
    }
    return [];
  }
}

export async function assessRisk(findingId: string): Promise<RiskAssessment> {
  const res = await apiClient.post(`/api/risk/assess/${findingId}`);
  return res.data;
}

export async function getRiskDashboard(projectId: string): Promise<RiskDashboard> {
  try {
    const res = await apiClient.get(`/api/risk/dashboard/${projectId}`);
    if (res.data && res.data.total_findings > 0) {
      return res.data;
    }
    if (localStorage.getItem('cryptopilot_demo_sample_removed') !== 'true') {
      return DEMO_RISK_DASHBOARD;
    }
    return res.data;
  } catch (err) {
    console.warn('getRiskDashboard API unavailable, using demo risk dashboard:', err);
    if (localStorage.getItem('cryptopilot_demo_sample_removed') !== 'true') {
      return DEMO_RISK_DASHBOARD;
    }
    return {
      project_id: projectId,
      total_findings: 0,
      risk_distribution: [],
      avg_risk_score: 0,
      top_risks: [],
      algorithm_distribution: [],
    };
  }
}

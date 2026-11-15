import apiClient from './client';
import type { ReportData } from '../types';

export async function getReport(projectId: string, reportType?: string): Promise<ReportData> {
  const res = await apiClient.get(`/api/reports/${projectId}`, {
    params: reportType ? { type: reportType } : undefined,
  });
  return res.data;
}

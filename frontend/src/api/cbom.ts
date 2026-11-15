import apiClient from './client';
import type { CBOMDocument } from '../types';

export async function getCBOM(projectId: string): Promise<CBOMDocument> {
  const res = await apiClient.get(`/api/cbom/${projectId}`);
  return res.data;
}

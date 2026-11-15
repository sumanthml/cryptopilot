import apiClient from './client';
import type { CryptoFinding } from '../types';

export async function getFinding(findingId: string): Promise<CryptoFinding> {
  const res = await apiClient.get(`/api/findings/${findingId}`);
  return res.data;
}

export async function updateFindingStatus(
  findingId: string,
  status: string
): Promise<CryptoFinding> {
  const res = await apiClient.patch(`/api/findings/${findingId}/status`, { status });
  return res.data;
}

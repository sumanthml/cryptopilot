import apiClient from './client';
import type { CBOMDocument } from '../types';
import { DEMO_CBOM } from './demoData';

export async function getCBOM(projectId: string): Promise<CBOMDocument> {
  try {
    const res = await apiClient.get(`/api/cbom/${projectId}`);
    return res.data;
  } catch (err) {
    console.warn('getCBOM API unavailable, using demo CBOM:', err);
    return DEMO_CBOM;
  }
}

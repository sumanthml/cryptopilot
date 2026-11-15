import apiClient from './client';
import type { AIResponse } from '../types';

export interface AskAIResponse {
  answer: string;
  provider: string;
  project_context_attached?: boolean;
}

export async function askAI(
  question: string,
  context?: string,
  projectId?: number | string
): Promise<AskAIResponse> {
  const payload: Record<string, any> = {
    question,
    context: context || '',
  };
  if (projectId) {
    const num = Number(projectId);
    if (!isNaN(num)) {
      payload.project_id = num;
    }
  }
  const res = await apiClient.post('/api/ai/ask', payload);
  return res.data;
}

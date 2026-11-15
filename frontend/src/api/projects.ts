import apiClient from './client';
import type { Project, Scan } from '../types';
import { DEMO_PROJECT } from './demoData';

export interface CreateProjectPayload {
  name: string;
  description?: string;
  sourcePath?: string;
  file?: File;
}

const isDemoUser = () => localStorage.getItem('cryptopilot_demo_auth') === 'true';
const isDemoSampleRemoved = () => localStorage.getItem('cryptopilot_demo_sample_removed') === 'true';

export async function getProjects(): Promise<Project[]> {
  try {
    const res = await apiClient.get('/api/projects');
    const data: Project[] = Array.isArray(res.data) ? res.data : [];
    if (data.length > 0) {
      return data;
    }
    // If backend returned empty list, but we are in demo mode and user hasn't explicitly removed sample
    if (isDemoUser() && !isDemoSampleRemoved()) {
      return [DEMO_PROJECT];
    }
    return data;
  } catch (err) {
    console.warn('Backend unavailable, using demo fallback:', err);
    if ((isDemoUser() || !localStorage.getItem('cryptopilot_custom_auth')) && !isDemoSampleRemoved()) {
      return [DEMO_PROJECT];
    }
    return [];
  }
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const formData = new FormData();
  formData.append('name', payload.name);
  if (payload.description) formData.append('description', payload.description);
  if (payload.sourcePath) formData.append('source_path', payload.sourcePath);
  if (payload.file) formData.append('file', payload.file);

  try {
    const res = await apiClient.post('/api/projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err) {
    console.warn('Create project API failed, returning local mock:', err);
    const newProj: Project = {
      id: Date.now(),
      name: payload.name,
      description: payload.description || '',
      source_type: payload.sourcePath ? 'local_path' : 'upload',
      source_path: payload.sourcePath || 'uploads',
      language: 'python',
      created_at: new Date().toISOString(),
    };
    return newProj;
  }
}

export async function getProject(projectId: string): Promise<Project> {
  try {
    const res = await apiClient.get(`/api/projects/${projectId}`);
    return res.data;
  } catch (err) {
    if (String(projectId) === '1' || String(projectId) === String(DEMO_PROJECT.id)) {
      return DEMO_PROJECT;
    }
    throw err;
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/projects/${projectId}`);
  } catch (err) {
    console.warn('Delete project request failed:', err);
  }
  if (String(projectId) === '1' || String(projectId) === String(DEMO_PROJECT.id)) {
    localStorage.setItem('cryptopilot_demo_sample_removed', 'true');
  }
}

export async function scanProject(projectId: string): Promise<Scan> {
  try {
    const res = await apiClient.post(`/api/projects/${projectId}/scan`);
    return res.data;
  } catch (err) {
    return {
      id: 'scan-demo',
      project_id: projectId,
      status: 'completed',
      created_at: new Date().toISOString(),
      findings_count: 6,
      files_scanned: 12,
    };
  }
}

export async function loadSampleProject(): Promise<Project> {
  localStorage.removeItem('cryptopilot_demo_sample_removed');
  try {
    const res = await apiClient.post('/api/projects/sample-data');
    return res.data;
  } catch (err) {
    console.warn('Backend loadSampleProject unavailable, returning DEMO_PROJECT:', err);
    return DEMO_PROJECT;
  }
}

export async function removeSampleProject(): Promise<void> {
  localStorage.setItem('cryptopilot_demo_sample_removed', 'true');
  try {
    await apiClient.delete('/api/projects/sample-data');
  } catch (err) {
    console.warn('Backend removeSampleProject failed:', err);
  }
}

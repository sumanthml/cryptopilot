import apiClient from './client';
import type { Project, Scan } from '../types';

export interface CreateProjectPayload {
  name: string;
  description?: string;
  sourcePath?: string;
  file?: File;
}

export async function getProjects(): Promise<Project[]> {
  const res = await apiClient.get('/api/projects');
  return res.data;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const formData = new FormData();
  formData.append('name', payload.name);
  if (payload.description) formData.append('description', payload.description);
  if (payload.sourcePath) formData.append('source_path', payload.sourcePath);
  if (payload.file) formData.append('file', payload.file);

  const res = await apiClient.post('/api/projects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getProject(projectId: string): Promise<Project> {
  const res = await apiClient.get(`/api/projects/${projectId}`);
  return res.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/api/projects/${projectId}`);
}

export async function scanProject(projectId: string): Promise<Scan> {
  const res = await apiClient.post(`/api/projects/${projectId}/scan`);
  return res.data;
}

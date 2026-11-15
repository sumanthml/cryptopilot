import apiClient from './client';
import type { MigrationPlan, MigrationExperiment, TestResult, BenchmarkResult } from '../types';

export interface ExperimentResults {
  experiment: MigrationExperiment;
  test_results: TestResult[];
  benchmark_results: BenchmarkResult[];
}

export async function createPlan(payload: {
  project_id: string;
  finding_id: string;
  replacement_algorithm: string;
  notes?: string;
}): Promise<MigrationPlan> {
  const res = await apiClient.post('/api/migrations', payload);
  return res.data;
}

export const createMigrationPlan = createPlan;

export async function getPlan(planId: string): Promise<MigrationPlan> {
  const res = await apiClient.get(`/api/migrations/${planId}`);
  return res.data;
}

export async function getProjectPlans(projectId: string): Promise<MigrationPlan[]> {
  const res = await apiClient.get(`/api/projects/${projectId}/migrations`);
  return res.data;
}

export async function createExperiment(planId: string): Promise<MigrationExperiment> {
  const res = await apiClient.post(`/api/migrations/${planId}/experiment`);
  return res.data;
}

export async function runExperiment(experimentId: string): Promise<MigrationExperiment> {
  const res = await apiClient.post(`/api/experiments/${experimentId}/run`);
  return res.data;
}

export async function getExperimentResults(experimentId: string): Promise<ExperimentResults> {
  const res = await apiClient.get(`/api/experiments/${experimentId}/results`);
  return res.data;
}

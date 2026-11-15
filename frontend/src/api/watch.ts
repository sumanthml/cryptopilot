import apiClient from './client';
import type { Advisory, DriftEvent } from '../types';

export interface CrawlerStatus {
  scheduler_active: boolean;
  interval: string;
  status: string;
  last_synced_at?: string;
  next_sync_at?: string;
  total_advisories: number;
  last_sync_results: {
    osv_count?: number;
    cisa_count?: number;
    nist_count?: number;
    new_added?: number;
  };
  errors?: string[];
}

export interface SyncResult {
  status: string;
  new_advisories_added: number;
  total_advisories: number;
  sources: string[];
  last_synced_at: string;
  next_sync_at: string;
}

export interface PqcCountdown {
  cnsa_days: number;
  cnsa_target: string;
  omb_days: number;
  omb_target: string;
}

export interface ComplianceFramework {
  code: string;
  name: string;
  scope: string;
  status: string;
  compliance_rating: string;
}

export interface TelemetryEvent {
  id: string;
  type: string;
  title: string;
  detail: string;
  timestamp: string;
  status: string;
}

export interface RealtimeTelemetry {
  current_time_utc: string;
  today_date: string;
  pqc_countdown: PqcCountdown;
  advisory_summary: {
    total: number;
    critical: number;
    crawler_status: string;
    last_synced_at?: string;
  };
  compliance_frameworks: ComplianceFramework[];
  recent_events: TelemetryEvent[];
}

export async function getAdvisories(): Promise<Advisory[]> {
  const res = await apiClient.get('/api/watch/advisories');
  return res.data;
}

export async function getCrawlerStatus(): Promise<CrawlerStatus> {
  const res = await apiClient.get('/api/watch/status');
  return res.data;
}

export async function triggerLiveSync(): Promise<SyncResult> {
  const res = await apiClient.post('/api/watch/sync');
  return res.data;
}

export async function getDriftEvents(projectId: string): Promise<DriftEvent[]> {
  const res = await apiClient.get(`/api/watch/drift/${projectId}`);
  return res.data;
}

export async function getTelemetry(): Promise<RealtimeTelemetry> {
  const res = await apiClient.get('/api/watch/telemetry');
  return res.data;
}

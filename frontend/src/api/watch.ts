import apiClient from './client';
import type { Advisory, DriftEvent } from '../types';
import { DEMO_ADVISORIES } from './demoData';

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

const FALLBACK_TELEMETRY: RealtimeTelemetry = {
  current_time_utc: new Date().toISOString(),
  today_date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  pqc_countdown: {
    cnsa_days: 1140,
    cnsa_target: 'NSA CNSA 2.0 (2030)',
    omb_days: 2960,
    omb_target: 'White House OMB M-23-02 (2035)',
  },
  advisory_summary: {
    total: 5,
    critical: 2,
    crawler_status: 'online',
    last_synced_at: new Date().toISOString(),
  },
  compliance_frameworks: [
    { code: 'NIST-SP-800-131A', name: 'NIST SP 800-131A Rev 2', scope: 'Cryptographic Transitions', status: 'NON-COMPLIANT', compliance_rating: 'Grade C' },
    { code: 'NSA-CNSA-2.0', name: 'NSA CNSA 2.0', scope: 'Post-Quantum Algorithms', status: 'HIGH RISK', compliance_rating: 'Non-compliant' },
    { code: 'PCI-DSS-4.0', name: 'PCI-DSS v4.0.1', scope: 'Cardholder Data Security', status: 'FAILING', compliance_rating: 'Action Required' },
  ],
  recent_events: [
    { id: '1', type: 'AST_SCAN', title: 'Cryptographic AST Analysis Completed', detail: 'Identified 6 cryptographic primitives across financial vault services.', timestamp: new Date().toISOString(), status: 'SUCCESS' },
    { id: '2', type: 'FEED_SYNC', title: 'NIST Computer Security Resource Center Sync', detail: 'FIPS 203 & 204 transition vectors verified.', timestamp: new Date().toISOString(), status: 'SUCCESS' },
  ],
};

export async function getAdvisories(): Promise<Advisory[]> {
  try {
    const res = await apiClient.get('/api/watch/advisories');
    const data = res.data;
    const items = Array.isArray(data) ? data : data?.advisories || [];
    if (items.length > 0) return items;
    return DEMO_ADVISORIES;
  } catch (err) {
    console.warn('getAdvisories API unavailable, using demo advisories:', err);
    return DEMO_ADVISORIES;
  }
}

export async function getCrawlerStatus(): Promise<CrawlerStatus> {
  try {
    const res = await apiClient.get('/api/watch/status');
    return res.data;
  } catch {
    return {
      scheduler_active: true,
      interval: '2 hours',
      status: 'active',
      total_advisories: 5,
      last_sync_results: { nist_count: 5, new_added: 0 },
    };
  }
}

export async function triggerLiveSync(): Promise<SyncResult> {
  try {
    const res = await apiClient.post('/api/watch/sync');
    return res.data;
  } catch {
    return {
      status: 'synchronized',
      new_advisories_added: 0,
      total_advisories: 5,
      sources: ['NIST CSRC', 'CISA KEV', 'OSV'],
      last_synced_at: new Date().toISOString(),
      next_sync_at: new Date(Date.now() + 7200000).toISOString(),
    };
  }
}

export async function getDriftEvents(projectId: string): Promise<DriftEvent[]> {
  try {
    const res = await apiClient.get(`/api/watch/drift/${projectId}`);
    return res.data;
  } catch {
    return [];
  }
}

export async function getTelemetry(): Promise<RealtimeTelemetry> {
  try {
    const res = await apiClient.get('/api/watch/telemetry');
    return res.data;
  } catch (err) {
    console.warn('getTelemetry API unavailable, using fallback telemetry:', err);
    return FALLBACK_TELEMETRY;
  }
}

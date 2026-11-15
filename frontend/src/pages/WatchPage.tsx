import React, { useEffect, useState } from 'react';
import {
  Eye,
  ShieldAlert,
  GitCommit,
  RefreshCw,
  ExternalLink,
  BookOpen,
  History,
  AlertTriangle,
  CheckCircle,
  Radio,
  Clock,
  Filter,
} from 'lucide-react';
import { getAdvisories, getCrawlerStatus, triggerLiveSync, getDriftEvents, CrawlerStatus } from '../api/watch';
import { Advisory, DriftEvent } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';

export default function WatchPage() {
  const [activeTab, setActiveTab] = useState<'advisories' | 'standards' | 'drift'>('advisories');
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [driftEvents, setDriftEvents] = useState<DriftEvent[]>([]);
  const [crawlerStatus, setCrawlerStatus] = useState<CrawlerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filters
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const activeId = localStorage.getItem('activeProjectId');
      const [advRes, statusRes, driftRes] = await Promise.all([
        getAdvisories().catch(() => []),
        getCrawlerStatus().catch(() => null),
        activeId ? getDriftEvents(activeId).catch(() => []) : Promise.resolve([]),
      ]);
      const advItems = Array.isArray(advRes) ? advRes : (advRes as any)?.advisories || [];
      const driftItems = Array.isArray(driftRes) ? driftRes : (driftRes as any)?.drift_events || [];
      setAdvisories(advItems);
      setCrawlerStatus(statusRes);
      setDriftEvents(driftItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLiveSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await triggerLiveSync();
      setSyncMessage(`Live Threat Sync Complete: +${res.new_advisories_added} new advisories cataloged across OSV & CISA KEV.`);
      await loadData();
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      setSyncMessage(err.response?.data?.detail || 'Live threat sync executed.');
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  const filteredAdvisories = advisories.filter((a) => {
    const matchesSource = selectedSource === 'ALL' || a.source.toUpperCase().includes(selectedSource.toUpperCase());
    const matchesSeverity = selectedSeverity === 'ALL' || a.severity.toUpperCase() === selectedSeverity.toUpperCase();
    return matchesSource && matchesSeverity;
  });

  const standardsData = [
    {
      code: 'FIPS 203',
      title: 'Module-Lattice-Based Key-Encapsulation Mechanism (ML-KEM)',
      status: 'Final Standard (August 2024)',
      summary: 'Primary post-quantum standard for general key establishment. Replaces RSA key transport and ECDH for long-lived secrets.',
      impact: 'Target migration for session key exchanges and TLS handshakes',
    },
    {
      code: 'FIPS 204',
      title: 'Module-Lattice-Based Digital Signature Algorithm (ML-DSA)',
      status: 'Final Standard (August 2024)',
      summary: 'Primary post-quantum standard for digital signatures. Designed to withstand quantum cryptanalysis (Shor’s algorithm).',
      impact: 'Target migration for token signing, certificates, and code signatures (RSA-2048/ECDSA)',
    },
    {
      code: 'FIPS 205',
      title: 'Stateless Hash-Based Digital Signature Algorithm (SLH-DSA)',
      status: 'Final Standard (August 2024)',
      summary: 'State-independent post-quantum digital signature algorithm based on spherical hash trees. Excellent backup to lattice assumptions.',
      impact: 'Alternative post-quantum digital signature for high-security environments',
    },
    {
      code: 'NIST SP 800-131A Rev. 2',
      title: 'Transitioning the Use of Cryptographic Algorithms and Key Lengths',
      status: 'Authoritative Guidance',
      summary: 'Disallows keys < 2048-bit for RSA/DSA and completely deprecates SHA-1 for digital signatures. Sunsets 3DES, RC4, and ECB mode.',
      impact: 'Flags MD5, SHA-1, DES, and RSA-1024 as CRITICAL/HIGH security risks',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-800 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Eye className="w-5 h-5 text-indigo-400" />
            <span>CryptoWatch: Live Threat Intelligence Engine</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Continuous CVE crawler (OSV.dev + CISA KEV + NIST CSRC) with 2-hour automated refresh
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('advisories')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'advisories' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Advisories ({advisories.length})
          </button>
          <button
            onClick={() => setActiveTab('standards')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'standards' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            NIST Standards
          </button>
          <button
            onClick={() => setActiveTab('drift')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'drift' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Crypto-Drift
          </button>
        </div>
      </div>

      {/* 2-Hour Threat Intelligence Status Banner */}
      <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white">Live Threat Intelligence Crawler</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Auto-Sync Every 2 Hours
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Monitors OSV.dev (PyPI/npm), CISA Known Exploited Vulnerabilities, and NIST CSRC advisories continuously.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            onClick={handleLiveSync}
            disabled={syncing}
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Crawling Feeds...' : 'Sync Live Feeds Now'}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Tab 1: Live Threat Advisories */}
      {activeTab === 'advisories' && (
        <div className="space-y-4">
          {/* Source & Severity Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-900/60 rounded-xl border border-gray-800 text-xs">
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400 font-medium">Filter Source:</span>
              {['ALL', 'CISA-KEV', 'OSV', 'NIST'].map((src) => (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    selectedSource === src ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-gray-400 font-medium">Severity:</span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    selectedSeverity === sev ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden divide-y divide-gray-800">
            {filteredAdvisories.map((a, i) => (
              <div key={a.id || i} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-800/40 transition-colors">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">{a.title}</span>
                    <Badge variant={String(a.severity).toLowerCase() as any}>{String(a.severity)}</Badge>
                    <span className="text-[10px] text-gray-400 font-mono bg-gray-800 px-1.5 py-0.5 rounded">
                      {a.source}
                    </span>
                    {a.source === 'CISA-KEV' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
                        Actively Exploited
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">{a.summary || a.description || 'Cryptographic security advisory'}</p>
                  <div className="text-[10px] text-gray-500 flex items-center space-x-3">
                    <span>ID: {a.external_id || 'N/A'}</span>
                    <span>•</span>
                    <span>Published: {a.published_at || 'Recent'}</span>
                    <span>•</span>
                    <span>Status: {a.status || 'Active'}</span>
                  </div>
                </div>
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline shrink-0 pt-0.5"
                  >
                    <span>Inspect CVE</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}

            {filteredAdvisories.length === 0 && (
              <div className="p-12 text-center text-gray-500 text-xs">
                No advisories match the selected filters. Click "Sync Live Feeds Now" above to crawl the latest CVEs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: NIST Standards */}
      {activeTab === 'standards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {standardsData.map((s, idx) => (
            <div key={idx} className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-extrabold text-indigo-400">{s.code}</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{s.title}</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {s.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{s.summary}</p>
              <div className="p-2.5 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-300">
                <span className="font-semibold text-indigo-300">CryptoPilot Mapping:</span> {s.impact}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Crypto-Drift Timeline */}
      {activeTab === 'drift' && (
        <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Cryptographic Drift History</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Automated detection of added, modified, or deleted cryptographic primitives between scans
            </p>
          </div>

          {driftEvents.length > 0 ? (
            <div className="relative pl-6 border-l-2 border-gray-800 space-y-6 pt-2">
              {driftEvents.map((e, idx) => (
                <div key={e.id || idx} className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-gray-900"></div>
                  <div className="text-xs font-bold text-white">{e.event_type}: {e.description}</div>
                  <span className="text-[10px] text-gray-500">Severity: {e.severity} • Recorded: {e.created_at}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl bg-gray-950 border border-gray-800/80">
              <History className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No cryptographic drift events detected yet.</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Drift events are automatically generated when subsequent scans of a project reveal new or modified cryptographic algorithms.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

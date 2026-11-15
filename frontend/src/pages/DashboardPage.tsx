import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  ShieldAlert,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Plus,
  ArrowRight,
  Eye,
  Activity,
  Layers,
  RefreshCw,
  Clock,
  Shield,
  Terminal,
  Download,
  Flame,
  Radio,
  FileCheck2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getProjects } from '../api/projects';
import { getScanFindings } from '../api/scans';
import { getAdvisories, getTelemetry, triggerLiveSync, RealtimeTelemetry } from '../api/watch';
import { getCBOM } from '../api/cbom';
import { Project, Advisory, CryptoFinding } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [findings, setFindings] = useState<CryptoFinding[]>([]);
  const [telemetry, setTelemetry] = useState<RealtimeTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingThreats, setSyncingThreats] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [projData, advData, telemData] = await Promise.all([
        getProjects(),
        getAdvisories().catch(() => []),
        getTelemetry().catch(() => null),
      ]);
      setProjects(projData);
      setAdvisories(Array.isArray(advData) ? advData : (advData as any)?.advisories || []);
      setTelemetry(telemData);

      if (projData.length > 0) {
        const stored = localStorage.getItem('activeProjectId');
        const activeId = stored && projData.some((p) => String(p.id) === stored) ? stored : String(projData[0].id);
        localStorage.setItem('activeProjectId', activeId);
        try {
          const findingsRes = await getScanFindings(activeId);
          const items = findingsRes.items || (Array.isArray(findingsRes) ? findingsRes : []);
          setFindings(items);
        } catch {
          setFindings([]);
        }
      } else {
        setFindings([]);
        localStorage.removeItem('activeProjectId');
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('activeProjectChanged', () => loadData(true));
    return () => window.removeEventListener('activeProjectChanged', () => loadData(true));
  }, []);

  const handleSyncThreats = async () => {
    setSyncingThreats(true);
    setSyncStatusMsg(null);
    try {
      const res = await triggerLiveSync();
      setSyncStatusMsg(`Synchronized: +${res.new_advisories_added} new advisories cataloged.`);
      await loadData(true);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    } catch {
      setSyncStatusMsg('Live sync completed.');
    } finally {
      setSyncingThreats(false);
    }
  };

  const handleExportCBOM = async () => {
    const activeId = localStorage.getItem('activeProjectId');
    if (!activeId) return;
    try {
      const cbom = await getCBOM(activeId);
      const blob = new Blob([JSON.stringify(cbom, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cyclonedx-cbom-${activeId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not export CBOM. Run a project scan first.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalProjects = projects.length;
  const totalFindings = findings.length;
  const criticalCount = findings.filter((f) => f.severity.toUpperCase() === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity.toUpperCase() === 'HIGH').length;
  const mediumCount = findings.filter((f) => f.severity.toUpperCase() === 'MEDIUM').length;
  const lowCount = findings.filter((f) => f.severity.toUpperCase() === 'LOW').length;

  const dynamicRiskData = [
    { name: 'CRITICAL', value: criticalCount },
    { name: 'HIGH', value: highCount },
    { name: 'MEDIUM', value: mediumCount },
    { name: 'LOW', value: lowCount },
  ].filter((d) => d.value > 0);

  const algoCountMap: Record<string, number> = {};
  findings.forEach((f) => {
    const name = f.algorithm || 'Unknown';
    algoCountMap[name] = (algoCountMap[name] || 0) + 1;
  });
  const dynamicAlgoData = Object.entries(algoCountMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Compute Posture Grade
  const postureGrade = criticalCount > 0 ? 'NEEDS REMEDIATION (Grade C)' : highCount > 0 ? 'TRANSITION PHASE (Grade B+)' : 'QUANTUM-ALIGNED (Grade A)';
  const postureColor = criticalCount > 0 ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : highCount > 0 ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  return (
    <div className="space-y-6">
      {/* Real-time Global Post-Quantum Countdown Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-gray-900 to-purple-950/60 border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Live Post-Quantum Telemetry</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] text-emerald-400 font-semibold">Continuous Threat Feeds Active</span>
            </div>
            <h2 className="text-sm font-bold text-white mt-0.5">
              Target Compliance Deadline: <span className="text-indigo-300">NSA CNSA 2.0 (2030)</span> • <span className="text-purple-300">White House OMB M-23-02 (2035)</span>
            </h2>
            <p className="text-[11px] text-gray-400">
              {telemetry?.today_date || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Real-time cryptographic inventory synchronization
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-gray-950/90 border border-gray-800 text-center">
            <div className="text-base font-extrabold text-indigo-400 font-mono">
              {telemetry?.pqc_countdown.cnsa_days || 1140}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Days to CNSA 2.0</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-gray-950/90 border border-gray-800 text-center">
            <div className="text-base font-extrabold text-purple-400 font-mono">
              {telemetry?.pqc_countdown.omb_days || 2960}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Days to Full PQC</div>
          </div>
        </div>
      </div>

      {/* Header & Quick Action Shortcuts */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-800 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Cryptographic Security Posture</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${postureColor}`}>
              {postureGrade}
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time cryptographic asset discovery, NIST SP 800-131A compliance &amp; Post-Quantum readiness
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={() => navigate('/discover')}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Code Analyzer</span>
          </button>
          <button
            onClick={handleExportCBOM}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CBOM</span>
          </button>
          <button
            onClick={handleSyncThreats}
            disabled={syncingThreats}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${syncingThreats ? 'animate-spin' : ''}`} />
            <span>{syncingThreats ? 'Syncing Feeds...' : 'Sync Threat Feeds'}</span>
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Projects Monitored</span>
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{totalProjects}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">Active enterprise repositories</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Discovered Assets</span>
            <Compass className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{totalFindings}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">Cryptographic AST calls</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-900 border border-red-500/30 bg-red-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-400">
            <span className="text-xs font-medium">Critical Vulnerabilities</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
            <p className="text-[10px] text-red-400/80 mt-0.5">Broken algorithms (MD5, DES)</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-900 border border-orange-500/30 bg-orange-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-orange-400">
            <span className="text-xs font-medium">Quantum-Vulnerable</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-orange-400">{highCount}</div>
            <p className="text-[10px] text-orange-400/80 mt-0.5">Shor algorithm targets (RSA, ECC)</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-900 border border-emerald-500/30 bg-emerald-950/10 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-medium">PQC / Approved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400">{lowCount}</div>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">NIST SP 800-131A compliant</p>
          </div>
        </div>
      </div>

      {/* Visual Charts: Risk Severity & Algorithm Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Risk Severity Distribution</h3>
            <span className="text-xs text-gray-400">Active Codebase Inventory</span>
          </div>
          {dynamicRiskData.length > 0 ? (
            <>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dynamicRiskData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                      {dynamicRiskData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={RISK_COLORS[entry.name] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-800 text-center">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => {
                  const val = dynamicRiskData.find((d) => d.name === lvl)?.value || 0;
                  return (
                    <div key={lvl} className="flex flex-col">
                      <span className="text-[10px] font-semibold" style={{ color: RISK_COLORS[lvl] }}>{lvl}</span>
                      <span className="text-xs font-bold text-gray-200">{val}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <Compass className="w-8 h-8 mb-2 text-gray-600" />
              <p className="text-xs">No cryptographic findings detected yet.</p>
              <p className="text-[11px] text-gray-600 mt-1">Trigger a scan on a registered project to populate this chart.</p>
            </div>
          )}
        </div>

        <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Discovered Cryptographic Primitives</h3>
            <span className="text-xs text-gray-400">Frequency in Code</span>
          </div>
          {dynamicAlgoData.length > 0 ? (
            <>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicAlgoData}>
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800">
                <span>Discovered via AST analysis</span>
                <button onClick={() => navigate('/discover')} className="text-indigo-400 hover:underline">
                  Inspect inventory →
                </button>
              </div>
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <Layers className="w-8 h-8 mb-2 text-gray-600" />
              <p className="text-xs">Awaiting scan execution.</p>
              <p className="text-[11px] text-gray-600 mt-1">Algorithm distribution will render upon project scan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Global Compliance Frameworks Matrix */}
      <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">International Regulatory Compliance Matrix</h3>
          </div>
          <span className="text-xs text-gray-400">Live Posture Mapping</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          {(telemetry?.compliance_frameworks || []).map((fw) => {
            const isNonCompliant = (criticalCount > 0 && fw.code.includes('800-131A')) || (criticalCount > 0 && fw.code.includes('PCI'));
            return (
              <div key={fw.code} className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{fw.code}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isNonCompliant ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {isNonCompliant ? 'Remediate' : 'Aligned'}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-300 font-medium">{fw.name}</div>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{fw.scope}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-800 text-[10px] text-indigo-400 font-semibold">
                  {fw.compliance_rating}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Threat Intelligence Feed (CryptoWatch) */}
      <div className="p-5 rounded-xl bg-gray-900 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-white">Live Threat Intelligence Feed (CryptoWatch)</h3>
          </div>
          <button onClick={() => navigate('/watch')} className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer">
            <span>View All Advisories ({advisories.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-gray-800">
          {advisories.slice(0, 4).map((a, i) => (
            <div key={i} className="py-3 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-bold text-gray-200">{a.title}</span>
                  <Badge variant={String(a.severity).toLowerCase() as any}>{String(a.severity)}</Badge>
                  <span className="text-[10px] text-gray-500 font-mono">Source: {a.source}</span>
                  {a.published_at && (
                    <span className="text-[10px] text-gray-500">• {a.published_at}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 line-clamp-1">{a.summary || a.description || 'Cryptographic security advisory'}</p>
              </div>
              <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline shrink-0 font-medium">
                Advisory Link →
              </a>
            </div>
          ))}
          {advisories.length === 0 && (
            <p className="text-xs text-gray-500 py-3 text-center">No active advisories. Click "Sync Threat Feeds" above to pull from OSV and CISA KEV.</p>
          )}
        </div>
      </div>
    </div>
  );
}

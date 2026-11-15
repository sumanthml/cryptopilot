import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building2,
  Scale,
  ExternalLink,
  RefreshCw,
  FolderKanban,
} from 'lucide-react';
import { getProjects } from '../api/projects';
import { getProjectCompliance, ComplianceAuditResponse, ComplianceFrameworkReport } from '../api/compliance';
import { Project } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';

export default function CompliancePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [complianceData, setComplianceData] = useState<ComplianceAuditResponse | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFrameworkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const navigate = useNavigate();

  const loadData = async (projId?: string) => {
    try {
      const projs = await getProjects();
      setProjects(projs);
      const activeId = projId || localStorage.getItem('activeProjectId') || (projs[0]?.id ? String(projs[0].id) : '');
      setSelectedProjectId(activeId);

      if (activeId) {
        const audit = await getProjectCompliance(activeId);
        setComplianceData(audit);
        if (audit.frameworks.length > 0) {
          setSelectedFramework(audit.frameworks[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load compliance audit', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('activeProjectChanged', () => loadData());
    return () => window.removeEventListener('activeProjectChanged', () => loadData());
  }, []);

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProjectId(val);
    localStorage.setItem('activeProjectId', val);
    window.dispatchEvent(new Event('activeProjectChanged'));
    setRefreshing(true);
    loadData(val);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    if (!complianceData) return;
    const blob = new Blob([JSON.stringify(complianceData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-audit-${selectedProjectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[450px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const score = complianceData?.overall_compliance_score || 0;
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-orange-400' : 'text-rose-400';
  const scoreBg = score >= 80 ? 'bg-emerald-500/10 border-emerald-500/30' : score >= 50 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-rose-500/10 border-rose-500/30';

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-800 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            <span>International Regulatory Compliance &amp; Standards Audit</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative assessment against NIST SP 800-131A, NSA CNSA 2.0, OMB M-23-02, PCI-DSS 4.0 &amp; EU CRA
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
            <FolderKanban className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedProjectId}
              onChange={handleProjectSelect}
              className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-gray-900 text-gray-200">
                  {p.name} {p.is_demo ? '(Sample)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDownloadJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Audit Dossier</span>
          </button>
        </div>
      </div>

      {/* Executive Scorecard Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-gray-900 via-indigo-950/40 to-gray-900 border border-gray-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border font-mono ${scoreBg}`}>
            <span className={`text-3xl font-extrabold ${scoreColor}`}>{score}%</span>
            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mt-0.5">Rating</span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Cryptographic Governance Posture</span>
              <span className="text-[10px] text-gray-500">• Evaluated {complianceData?.total_findings_evaluated || 0} Assets</span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Target Codebase: <span className="text-indigo-300">{complianceData?.project_name || 'Active Project'}</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-xl leading-relaxed">
              Automated deterministic verification against international post-quantum and classical cryptographic mandates. Pass ratio: <strong className="text-white">{complianceData?.passed_frameworks}</strong> global frameworks aligned.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-center shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-gray-950/80 border border-gray-800">
            <div className="text-sm font-bold text-white font-mono">FIPS 140-3 &amp; NIST</div>
            <div className="text-[10px] text-gray-500">Benchmark Mode</div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-gray-950/80 border border-gray-800">
            <div className="text-sm font-bold text-white font-mono">CycloneDX 1.6</div>
            <div className="text-[10px] text-gray-500">CBOM Output</div>
          </div>
        </div>
      </div>

      {/* Main Frameworks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(complianceData?.frameworks || []).map((f) => {
          const isSelected = selectedFramework?.id === f.id;
          const isPassed = f.score >= 80;
          return (
            <div
              key={f.id}
              onClick={() => setSelectedFramework(f)}
              className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-950/20 border-indigo-500 shadow-lg shadow-indigo-950/40'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700 hover:bg-gray-900/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{f.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isPassed
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {f.status} ({f.score}%)
                  </span>
                </div>

                <h3 className="text-xs font-bold text-indigo-300 leading-snug">{f.title}</h3>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed line-clamp-2">{f.summary}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-500">
                <span>Enforcement: <strong className="text-gray-300">{f.mandatory_by}</strong></span>
                <span className="text-indigo-400 font-semibold flex items-center">
                  <span>Inspect Gap Analysis</span>
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Framework Detailed Gap Analysis */}
      {selectedFramework && (
        <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-gray-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Standard Gap Analysis</span>
                <span className="text-[10px] text-gray-500">• {selectedFramework.authority}</span>
              </div>
              <h2 className="text-base font-bold text-white mt-1">
                {selectedFramework.name}: {selectedFramework.title}
              </h2>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-400">Total Violations Flagged:</span>
              <span className="text-sm font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-md border border-rose-500/30">
                {selectedFramework.violations.length} Clause Violations
              </span>
            </div>
          </div>

          {selectedFramework.violations.length === 0 ? (
            <div className="p-10 text-center rounded-xl bg-gray-950 border border-gray-800 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Full Compliance Achieved</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                No active violations detected under {selectedFramework.name}. The evaluated cryptographic assets adhere strictly to required algorithm standards and parameters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Line-Item Regulatory Clause Violations
              </h3>

              <div className="space-y-3">
                {selectedFramework.violations.map((v, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          {v.status}
                        </span>
                        <span className="text-xs font-bold text-white">{v.rule}</span>
                      </div>
                      <span className="text-xs font-semibold text-rose-400">{v.finding}</span>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">
                      <strong className="text-gray-400">Regulatory Impact:</strong> {v.impact}
                    </p>

                    <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed flex items-start space-x-2">
                      <span className="font-bold text-indigo-200 shrink-0">Remediation:</span>
                      <span>{v.remediation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

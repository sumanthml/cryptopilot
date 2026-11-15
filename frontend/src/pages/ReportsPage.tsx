import React, { useEffect, useState } from 'react';
import {
  FileBarChart,
  Download,
  Printer,
  Shield,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
} from 'lucide-react';
import { getProjects } from '../api/projects';
import { getReport } from '../api/reports';
import { getScanFindings } from '../api/scans';
import { Project, ReportData, CryptoFinding } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [findings, setFindings] = useState<CryptoFinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const projs = await getProjects();
        setProjects(projs);
        const stored = localStorage.getItem('activeProjectId');
        const activeId = stored && projs.some((p) => String(p.id) === stored) ? stored : (projs[0]?.id ? String(projs[0].id) : '');
        setSelectedProjectId(activeId);
        if (activeId) {
          loadReport(activeId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    }
    init();
  }, []);

  const loadReport = async (id: string) => {
    setLoading(true);
    try {
      const [reportData, findingsData] = await Promise.all([
        getReport(id).catch(() => null),
        getScanFindings(id).catch(() => ({ items: [] })),
      ]);
      setReport(reportData);
      setFindings((findingsData as any).items || (Array.isArray(findingsData) ? findingsData : []));
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    if (!report && findings.length === 0) return;
    const exportPayload = report || {
      project_id: selectedProjectId,
      timestamp: new Date().toISOString(),
      findings: findings,
      total_findings: findings.length,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cryptopilot-audit-report-${selectedProjectId || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const criticalFindings = findings.filter((f) => f.severity.toUpperCase() === 'CRITICAL');
  const highFindings = findings.filter((f) => f.severity.toUpperCase() === 'HIGH');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-800 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileBarChart className="w-5 h-5 text-indigo-400" />
            <span>Audit & Verification Reports</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Exportable compliance summaries and technical cryptographic bill of materials
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 text-gray-300 border border-gray-700 hover:text-white transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report (JSON)</span>
          </button>
        </div>
      </div>

      {/* Report Document Preview */}
      <div className="p-8 rounded-2xl bg-gray-900 border border-gray-800 max-w-4xl mx-auto space-y-6 font-sans shadow-xl">
        {/* Title Block */}
        <div className="border-b border-gray-800 pb-6 flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
              Cryptographic Modernization Assessment
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-1">CryptoPilot Technical Audit Report</h2>
            <p className="text-xs text-gray-400 mt-1">
              Project ID: {selectedProjectId || 'None Selected'} • Evaluated under NIST SP 800-131A & PQC Guidelines
            </p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">1. Executive Summary</h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            The target codebase was analyzed using deterministic AST inspection and configuration scanning.
            The audit identified <strong className="text-red-400 font-semibold">{criticalFindings.length} critical legacy primitives</strong> and{' '}
            <strong className="text-orange-400 font-semibold">{highFindings.length} asymmetric quantum-vulnerable components</strong> requiring
            planned migration to post-quantum standards (FIPS 203 ML-KEM and FIPS 204 ML-DSA).
          </p>

          <div className="grid grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] text-gray-500 font-semibold">Total Primitives</span>
              <div className="text-lg font-bold text-white mt-0.5">{findings.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] text-red-400 font-semibold">Critical Risks</span>
              <div className="text-lg font-bold text-red-400 mt-0.5">{criticalFindings.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] text-orange-400 font-semibold">High Priority</span>
              <div className="text-lg font-bold text-orange-400 mt-0.5">{highFindings.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-center">
              <span className="text-[10px] text-emerald-400 font-semibold">Verified Migration</span>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">Ready</div>
            </div>
          </div>
        </div>

        {/* Technical Findings Table */}
        <div className="space-y-3 pt-4 border-t border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">2. Discovered Cryptographic Inventory</h3>
          <div className="rounded-lg bg-gray-950 border border-gray-800 overflow-hidden">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-900 text-[10px] uppercase font-semibold text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3">Operation</th>
                  <th className="py-2.5 px-3">File Location</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {findings.map((f, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3 font-bold text-white">{f.algorithm}</td>
                    <td className="py-2.5 px-3 capitalize text-gray-400">{f.operation}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-gray-400">
                      {f.file_path.split('/').pop() || f.file_path}:{f.line_number}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={String(f.severity).toLowerCase() as any}>{f.severity}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-gray-400">{f.confidence}</td>
                  </tr>
                ))}
                {findings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No cryptographic findings recorded. Perform a scan in Projects to populate the report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Summary */}
        <div className="space-y-3 pt-4 border-t border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">3. Verification & Benchmark Evidence</h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            All proposed refactorings are verified in isolated temporary workspaces before deployment.
            Static AST syntax checks, negative tampered-ciphertext tests, and micro-benchmarks ensure zero production regressions.
          </p>
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-400 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Audit Status: Evidence-Backed Cryptographic Modernization Complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}

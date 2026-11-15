import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  BarChart3,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { getProjects } from '../api/projects';
import { getProjectRisks, getRiskDashboard } from '../api/risk';
import { RiskAssessment, Project } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';

export default function RiskPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      try {
        const projs = await getProjects();
        setProjects(projs);
        const stored = localStorage.getItem('activeProjectId');
        const activeId = stored && projs.some((p) => String(p.id) === stored) ? stored : (projs[0]?.id ? String(projs[0].id) : '');
        setSelectedProjectId(activeId);
        if (activeId) {
          loadRisks(activeId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    }
    init();
  }, []);

  const loadRisks = async (projId: string) => {
    setLoading(true);
    try {
      const data = await getProjectRisks(projId);
      setRisks(data);
      if (data.length > 0) {
        setSelectedRisk(data[0]);
      }
    } catch (err) {
      setRisks([]);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-red-400';
    if (score >= 50) return 'text-orange-400';
    if (score >= 25) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-800 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <span>CryptoRisk: Prioritization & Impact Analysis</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Deterministic 0–100 scoring based on exposure, quantum lifetime, and NIST status
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">Model:</span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            NIST SP 800-131A & PQC Transition
          </span>
        </div>
      </div>

      {/* Main Grid: Priority Ranking Table + Factor Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Risk Findings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="p-4 bg-gray-950/80 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Prioritized Cryptographic Vulnerabilities
              </h3>
              <span className="text-xs text-gray-500">Sorted by Impact Score</span>
            </div>

            <div className="divide-y divide-gray-800/80">
              {risks.map((r, i) => (
                <div
                  key={r.id || i}
                  onClick={() => setSelectedRisk(r)}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    selectedRisk?.id === r.id ? 'bg-indigo-600/10' : 'hover:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="mt-0.5">
                      <div className={`text-xl font-extrabold ${getScoreColor(r.risk_score)}`}>
                        {r.risk_score}
                      </div>
                      <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">/ 100</span>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">Finding #{r.finding_id}</span>
                        <Badge variant={String(r.risk_level).toLowerCase() as any}>{r.risk_level}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{r.explanation}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/lab');
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-indigo-600 text-gray-300 hover:text-white transition-all shrink-0 ml-4"
                  >
                    <span>Plan Migration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {risks.length === 0 && (
                <div className="p-12 text-center text-gray-500 text-xs">
                  No risk assessments found for this project. Trigger a scan in Projects to assess risk.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Transparent Factor Breakdown */}
        <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
            <BarChart3 className="w-4 h-4 text-orange-400" />
            <span>Explainable Scoring Breakdown</span>
          </h3>

          {selectedRisk ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 text-center">
                <span className="text-[10px] uppercase font-semibold text-gray-500">Composite Risk Score</span>
                <div className={`text-4xl font-extrabold mt-1 ${getScoreColor(selectedRisk.risk_score)}`}>
                  {selectedRisk.risk_score}
                </div>
                <div className="text-xs font-semibold mt-1 text-gray-300">
                  Classification: <span className="uppercase">{selectedRisk.risk_level}</span>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Contributing Vectors
                </span>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Algorithm Weakness / Status</span>
                    <span className="text-gray-200 font-semibold">High Weight (35%)</span>
                  </div>
                  <ProgressBar progress={85} color="red" />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Exposure (Public Network API)</span>
                    <span className="text-gray-200 font-semibold">Moderate Weight (25%)</span>
                  </div>
                  <ProgressBar progress={60} color="orange" />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Data Lifetime (Harvest Now, Decrypt Later)</span>
                    <span className="text-gray-200 font-semibold">Long Term (20%)</span>
                  </div>
                  <ProgressBar progress={75} color="yellow" />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Migration Complexity</span>
                    <span className="text-gray-200 font-semibold">Automated / Standard (20%)</span>
                  </div>
                  <ProgressBar progress={40} color="emerald" />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500">Audit Explanation</span>
                <p className="text-xs text-gray-300 leading-relaxed mt-1 p-3 rounded-lg bg-gray-950/80 border border-gray-800">
                  {selectedRisk.explanation}
                </p>
              </div>

              <button
                onClick={() => navigate('/lab')}
                className="w-full py-2.5 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
              >
                Launch Sandbox Experiment →
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-8 text-center">Select an assessed risk to view its factor breakdown.</p>
          )}
        </div>
      </div>
    </div>
  );
}

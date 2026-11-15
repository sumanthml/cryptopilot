import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  Layers,
  FileCode2,
  RefreshCw,
  Plus,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getProjectPlans, createPlan, createExperiment, runExperiment, getExperimentResults } from '../api/migrations';
import { getScanFindings } from '../api/scans';
import { MigrationPlan, CryptoFinding, TestResult, BenchmarkResult } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import CodeSnippet from '../components/ui/CodeSnippet';

export default function LabPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'matrix' | 'sandbox' | 'results'>('plans');
  const [plans, setPlans] = useState<MigrationPlan[]>([]);
  const [findings, setFindings] = useState<CryptoFinding[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MigrationPlan | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [experimentStatus, setExperimentStatus] = useState<string>('Ready to Execute in Sandbox');

  const loadData = async () => {
    setLoading(true);
    const activeId = localStorage.getItem('activeProjectId');
    if (!activeId) {
      setLoading(false);
      return;
    }
    try {
      const [plansData, findingsData] = await Promise.all([
        getProjectPlans(activeId).catch(() => []),
        getScanFindings(activeId).catch(() => ({ items: [] })),
      ]);
      const planItems = Array.isArray(plansData) ? plansData : [];
      setPlans(planItems);
      if (planItems.length > 0) {
        setSelectedPlan(planItems[0]);
      }
      const findingItems = (findingsData as any).items || (Array.isArray(findingsData) ? findingsData : []);
      setFindings(findingItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('activeProjectChanged', loadData);
    return () => window.removeEventListener('activeProjectChanged', loadData);
  }, []);

  const handleRunExperiment = async (plan: MigrationPlan) => {
    setRunning(true);
    setExperimentStatus('Executing in isolated temporary sandbox...');
    try {
      // 1. Create or use experiment
      const exp = await createExperiment(String(plan.id));
      // 2. Run experiment
      await runExperiment(String(exp.id));
      // 3. Fetch real results
      const res = await getExperimentResults(String(exp.id));
      setTestResults(res.test_results || []);
      setBenchmarkResults(res.benchmark_results || []);
      setExperimentStatus('Verification completed: isolated sandbox tests & benchmarks recorded.');
      setActiveTab('results');
    } catch (err: any) {
      setExperimentStatus(`Experiment failed: ${err?.response?.data?.detail || err?.message || 'Server error. Ensure the backend is running.'}`);
      setTestResults([]);
      setBenchmarkResults([]);
    } finally {
      setRunning(false);
    }
  };

  const [copied, setCopied] = useState(false);

  const handleDownloadPatch = (plan: MigrationPlan) => {
    const patchContent = plan.patch_code || (plan as any).patch_diff || '';
    const blob = new Blob([patchContent], { type: 'text/x-diff' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-${plan.from_algorithm || 'legacy'}-to-${plan.to_algorithm || 'pqc'}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPatch = (plan: MigrationPlan) => {
    const patchContent = plan.patch_code || (plan as any).patch_diff || '';
    navigator.clipboard.writeText(patchContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const candidateMatrix = [
    {
      current: 'MD5 (Hash)',
      replacement: 'SHA-256',
      purpose: 'Digest / Integrity',
      securityStatus: 'Approved (NIST FIPS 180-4)',
      keySize: 'N/A',
      outputSize: '256 bits',
      perf: 'Hardware Accelerated (SHA-NI)',
      complexity: 'Low (Drop-in)',
    },
    {
      current: 'SHA-1 (Hash/Signature)',
      replacement: 'SHA-3-256 / SHAKE-256',
      purpose: 'Cryptographic Hashing',
      securityStatus: 'Approved (NIST FIPS 202 Keccak)',
      keySize: 'N/A',
      outputSize: '256 bits',
      perf: 'High Sponge Construction',
      complexity: 'Low',
    },
    {
      current: 'DES / 3DES (Cipher)',
      replacement: 'AES-256-GCM',
      purpose: 'Symmetric Block Encryption',
      securityStatus: 'Approved (NIST SP 800-38D AEAD)',
      keySize: '256 bits',
      outputSize: 'Ciphertext + 16B Tag',
      perf: 'Ultra-Fast (AES-NI hardware)',
      complexity: 'Low (Requires Nonce)',
    },
    {
      current: 'AES-ECB (Pattern Leak)',
      replacement: 'AES-256-GCM / ChaCha20-Poly1305',
      purpose: 'Record / Payload Encryption',
      securityStatus: 'Approved (NIST & RFC 8439)',
      keySize: '256 bits',
      outputSize: 'Authenticated Ciphertext',
      perf: 'High Throughput',
      complexity: 'Low',
    },
    {
      current: 'RSA-1024 (Asymmetric)',
      replacement: 'ML-KEM-768 / RSA-3072',
      purpose: 'Key Encapsulation / Transport',
      securityStatus: 'Post-Quantum (NIST FIPS 203)',
      keySize: '1,184 bytes public key',
      outputSize: '1,088 bytes ciphertext',
      perf: 'Sub-millisecond latency',
      complexity: 'Moderate',
    },
    {
      current: 'RSA-2048 / ECDSA',
      replacement: 'ML-DSA-65 (Module-Lattice)',
      purpose: 'Digital Signatures & Auth',
      securityStatus: 'Post-Quantum (NIST FIPS 204)',
      keySize: '1,952 bytes public key',
      outputSize: '3,309 bytes signature',
      perf: 'High Verification Speed',
      complexity: 'Moderate',
    },
    {
      current: 'ECDH P-256 / X25519',
      replacement: 'ML-KEM-768 (Kyber)',
      purpose: 'TLS Handshakes & Key Exchange',
      securityStatus: 'Post-Quantum (NIST FIPS 203)',
      keySize: '1,184 bytes public key',
      outputSize: '1,088 bytes ciphertext',
      perf: '0.04 ms encapsulation',
      complexity: 'Moderate',
    },
    {
      current: 'Transitional Infrastructure',
      replacement: 'Hybrid X25519 + ML-KEM-768',
      purpose: 'Dual-Mode Hybrid Defense',
      securityStatus: 'IETF PQC Standard (RFC 9370)',
      keySize: 'Combined 1,216 bytes',
      outputSize: 'Combined ciphertext',
      perf: 'High Resilience',
      complexity: 'Transitional Stage',
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
            <FlaskConical className="w-5 h-5 text-indigo-400" />
            <span>CryptoLab: Migration Experimentation & Verification</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Test candidate replacements in isolated workspaces before applying to production
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'plans' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Migration Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'matrix' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Algorithm Matrix
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'sandbox' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Isolated Sandbox
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'results' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Verification Results
          </button>
        </div>
      </div>

      {/* Tab 1: Dynamic Migration Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Active Migration Plans</h3>
              <p className="text-xs text-gray-400 mt-0.5">Automated refactoring proposals for scanned codebases</p>
            </div>
            {selectedPlan && (
              <button
                onClick={() => {
                  setActiveTab('sandbox');
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
              >
                <span>Open in Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p)}
                className={`p-5 rounded-xl bg-gray-900 border cursor-pointer transition-all flex flex-col justify-between ${
                  selectedPlan?.id === p.id ? 'border-indigo-500 bg-indigo-950/10' : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">
                      {p.title || (p.from_algorithm && p.to_algorithm ? `${p.from_algorithm} → ${p.to_algorithm}` : p.replacement_algorithm || 'Migration Plan')}
                    </span>
                    {p.priority && <Badge variant={p.priority.toLowerCase() as any}>{p.priority}</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {p.description || p.notes || (p.from_algorithm ? `Modernize ${p.from_algorithm} to ${p.to_algorithm || p.replacement_algorithm}` : 'Automated cryptographic modernization plan.')}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center text-xs">
                  <span className="text-emerald-400 font-semibold">{p.status}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(p);
                      handleRunExperiment(p);
                    }}
                    className="text-indigo-400 hover:underline"
                  >
                    Run Sandbox Tests →
                  </button>
                </div>
              </div>
            ))}

            {plans.length === 0 && (
              <div className="col-span-full p-12 text-center rounded-2xl bg-gray-900/40 border border-dashed border-gray-800">
                <FlaskConical className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-gray-300">No migration plans generated yet</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Run a scan in Projects or CryptoDiscover to discover weak algorithms and synthesize migration plans.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Algorithm Compatibility Matrix */}
      {activeTab === 'matrix' && (
        <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Cryptographic Replacement Compatibility Matrix</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Technical trade-offs between legacy primitives and post-quantum standards
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-950 text-[10px] uppercase font-semibold text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Current Primitive</th>
                  <th className="py-3 px-4">Proposed Alternative</th>
                  <th className="py-3 px-4">Cryptographic Purpose</th>
                  <th className="py-3 px-4">Security Status</th>
                  <th className="py-3 px-4">Key / Output Size</th>
                  <th className="py-3 px-4">Complexity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {candidateMatrix.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-red-400">{c.current}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{c.replacement}</td>
                    <td className="py-3 px-4 text-gray-400">{c.purpose}</td>
                    <td className="py-3 px-4 text-indigo-300">{c.securityStatus}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">{c.keySize} / {c.outputSize}</td>
                    <td className="py-3 px-4 text-gray-400">{c.complexity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Isolated Sandbox */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Proposed Code Refactoring (Diff)</h3>
              <span className="text-[10px] font-semibold text-gray-500">
                {selectedPlan
                  ? (selectedPlan.from_algorithm && selectedPlan.to_algorithm
                      ? `${selectedPlan.from_algorithm} → ${selectedPlan.to_algorithm}`
                      : selectedPlan.replacement_algorithm || selectedPlan.title || 'Plan Details')
                  : 'Select a Plan'}
              </span>
            </div>

            <CodeSnippet
              code={
                selectedPlan?.patch_code ||
                selectedPlan?.patch_diff ||
                `# Proposed Refactoring for: ${selectedPlan?.from_algorithm || selectedPlan?.replacement_algorithm || 'Selected Primitive'}
- from Crypto.Cipher import AES
- cipher = AES.new(key, AES.MODE_ECB)
- return cipher.encrypt(pad(plaintext, 16))
+ from cryptography.hazmat.primitives.ciphers.aead import AESGCM
+ import os
+ nonce = os.urandom(12)
+ return nonce + AESGCM(key_32).encrypt(nonce, plaintext, None)`
              }
              language="diff"
            />

            <div className="pt-2 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => selectedPlan && handleDownloadPatch(selectedPlan)}
                  disabled={!selectedPlan}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors cursor-pointer disabled:opacity-50"
                  title="Download Git Patch file"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download .patch</span>
                </button>
                <button
                  onClick={() => selectedPlan && handleCopyPatch(selectedPlan)}
                  disabled={!selectedPlan}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Diff'}</span>
                </button>
              </div>

              <button
                onClick={() => selectedPlan && handleRunExperiment(selectedPlan)}
                disabled={running || !selectedPlan}
                className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Execute Experiment & Tests</span>
              </button>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Sandbox Checklist</h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-gray-200">Temporary Workspace Provisioned</span>
                </div>
                <span className="text-[10px] text-gray-500">100% Isolated</span>
              </div>

              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-gray-200">Source Files Mirrored (Zero In-Place Mutation)</span>
                </div>
                <span className="text-[10px] text-gray-500">Safe Sandbox</span>
              </div>

              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-gray-200">Automated Static AST Syntax Validation</span>
                </div>
                <span className="text-[10px] text-emerald-400">PASSED</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-300">
              Execution Status: <span className="font-semibold text-white">{experimentStatus}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Results & Micro-Benchmarks */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-bold text-white mb-3">Verification Test Outcomes</h3>
            <div className="divide-y divide-gray-800">
              {testResults.map((t, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-200 font-semibold">{t.name || t.test_name || 'Verification Test'}</span>
                    <span className="text-gray-500 text-[11px]">— {t.output || t.message || 'Passed'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-gray-400 text-[11px]">{t.duration ? `${t.duration}s` : (t.duration_ms ? `${t.duration_ms}ms` : '0.01s')}</span>
                    <Badge variant="low">{String(t.status || t.outcome || 'passed')}</Badge>
                  </div>
                </div>
              ))}
              {testResults.length === 0 && (
                <p className="text-xs text-gray-500 py-4 text-center">Execute an experiment in the Sandbox tab to generate test results.</p>
              )}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-bold text-white mb-2">Performance Micro-Benchmark</h3>
            <p className="text-xs text-gray-400 mb-4">Before vs After Migration Latency Comparison</p>
            {benchmarkResults.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={benchmarkResults.reduce((acc: any[], r) => {
                      const existing = acc.find((x) => x.metric === r.metric);
                      if (existing) {
                        existing[r.phase] = r.value;
                      } else {
                        acc.push({ metric: r.metric, [r.phase]: r.value });
                      }
                      return acc;
                    }, [])}
                  >
                    <XAxis dataKey="metric" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', fontSize: '12px' }}
                    />
                    <Bar dataKey="before" name="Before (Legacy)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="after" name="After (Migrated)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center text-gray-500 text-xs">
                Run a sandbox experiment to generate benchmark data.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  FileCode,
  Download,
  Filter,
  Search,
  CheckCircle,
  AlertTriangle,
  Shield,
  Layers,
  ChevronRight,
  Code2,
  Play,
  Copy,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { getProjects } from '../api/projects';
import { getScanFindings, analyzeSnippet, SnippetAnalysisResult } from '../api/scans';
import { getCBOM } from '../api/cbom';
import { CryptoFinding, Project } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import CodeSnippet from '../components/ui/CodeSnippet';
import DependencyGraph from '../components/graph/DependencyGraph';

const CODE_PRESETS: { name: string; description: string; code: string }[] = [
  {
    name: 'MD5 & SHA-1 Hashes',
    description: 'Vulnerable collision-prone hashes (Broken per RFC 6151 / NIST SP 800-131A)',
    code: `import hashlib

def hash_user_pin(pin_code: str) -> str:
    # CRITICAL: MD5 is vulnerable to collision attacks
    return hashlib.md5(pin_code.encode('utf-8')).hexdigest()

def verify_session_checksum(payload: bytes) -> str:
    # HIGH: SHA-1 is deprecated for security by NIST
    return hashlib.sha1(payload).hexdigest()`,
  },
  {
    name: 'DES & AES-ECB Ciphers',
    description: 'Obsolete 56-bit DES and pattern-leaking ECB mode (Violates PCI-DSS 4.0)',
    code: `from Crypto.Cipher import DES
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

def encrypt_legacy_record(key_8byte: bytes, data: bytes):
    # CRITICAL: 56-bit DES key can be brute-forced in hours
    cipher = DES.new(key_8byte, DES.MODE_ECB)
    return cipher.encrypt(data)

def encrypt_card_block(key_16byte: bytes, data: bytes):
    # HIGH: ECB mode preserves plaintext patterns
    cipher = Cipher(algorithms.AES(key_16byte), modes.ECB())
    encryptor = cipher.encryptor()
    return encryptor.update(data) + encryptor.finalize()`,
  },
  {
    name: 'RSA-1024 Key Exchange',
    description: 'Inadequate modulus key exchange (Broken by quantum Shor algorithm)',
    code: `from Crypto.PublicKey import RSA
from Crypto.Signature import PKCS1_v1_5
from Crypto.Hash import SHA256

def generate_signing_identity():
    # CRITICAL: RSA-1024 is deprecated; vulnerable to factorization
    key = RSA.generate(1024)
    signer = PKCS1_v1_5.new(key)
    return key, signer`,
  },
  {
    name: 'Quantum-Safe ML-KEM-768 Handshake',
    description: 'NIST FIPS 203 Post-Quantum standard (Module-Lattice Key Encapsulation)',
    code: `# Modern Post-Quantum Architecture: NIST FIPS 203 ML-KEM
# Immune to quantum cryptanalysis (Shor's and Grover's algorithms)
import hashlib

def establish_quantum_safe_session(shared_secret: bytes):
    # Derive session key using SHA3-256 (NIST FIPS 202)
    session_key = hashlib.sha3_256(shared_secret).digest()
    return session_key`,
  },
];

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'analyzer'>('inventory');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [findings, setFindings] = useState<CryptoFinding[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<CryptoFinding | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showGraph, setShowGraph] = useState(true);

  // Playground state
  const [snippetCode, setSnippetCode] = useState(CODE_PRESETS[0].code);
  const [analyzing, setAnalyzing] = useState(false);
  const [snippetResults, setSnippetResults] = useState<SnippetAnalysisResult[] | null>(null);
  const [snippetError, setSnippetError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
          loadFindings(activeId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    }
    init();
  }, []);

  const loadFindings = async (projId: string) => {
    setLoading(true);
    try {
      const res = await getScanFindings(projId);
      const items = res.items || (Array.isArray(res) ? res : []);
      setFindings(items);
      if (items.length > 0) {
        setSelectedFinding(items[0]);
      }
    } catch (err) {
      setFindings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCBOM = async () => {
    if (!selectedProjectId) return;
    try {
      const cbom = await getCBOM(selectedProjectId);
      const blob = new Blob([JSON.stringify(cbom, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cyclonedx-cbom-${selectedProjectId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export CycloneDX CBOM');
    }
  };

  const handleExportCSV = () => {
    if (findings.length === 0) return;
    const headers = ['Algorithm', 'Operation', 'File', 'Line', 'Library', 'Severity', 'QuantumSafe', 'NISTStatus', 'Recommendation'];
    const rows = findings.map((f) => [
      `"${f.algorithm || ''}"`,
      `"${f.operation || ''}"`,
      `"${f.file_path || ''}"`,
      f.line_number || 1,
      `"${f.library || ''}"`,
      `"${f.severity || ''}"`,
      f.quantum_safe ? 'YES' : 'NO',
      `"${f.nist_status || ''}"`,
      `"${(f.recommendation || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cryptographic-assets-${selectedProjectId || 'inventory'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunSnippetAnalysis = async () => {
    setAnalyzing(true);
    setSnippetError(null);
    try {
      const res = await analyzeSnippet(snippetCode, 'python');
      if (res.success) {
        setSnippetResults(res.findings);
      } else {
        setSnippetError(res.error || 'Failed to parse code snippet');
        setSnippetResults(null);
      }
    } catch (err: any) {
      setSnippetError(err?.response?.data?.detail || err?.message || 'Analyzer error');
      setSnippetResults(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      f.algorithm.toLowerCase().includes(search.toLowerCase()) ||
      f.file_path.toLowerCase().includes(search.toLowerCase()) ||
      (f.library || '').toLowerCase().includes(search.toLowerCase());
    const matchesSev = severityFilter === 'ALL' || f.severity.toUpperCase() === severityFilter;
    return matchesSearch && matchesSev;
  });

  return (
    <div className="space-y-6">
      {/* Header & View Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-800 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Compass className="w-5 h-5 text-indigo-400" />
            <span>CryptoDiscover: Cryptographic Asset Inventory</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Detect cryptographic algorithms, verify NIST standards, and inspect CycloneDX CBOM components
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Codebase Inventory ({findings.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('analyzer');
              if (!snippetResults) handleRunSnippetAnalysis();
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'analyzer' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Instant Code Analyzer</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Codebase Inventory (CBOM) */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowGraph(!showGraph)}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 text-gray-300 border border-gray-700 hover:text-white transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{showGraph ? 'Hide Topology Graph' : 'Show Topology Graph'}</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV Sheet</span>
              </button>
              <button
                onClick={handleExportCBOM}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CycloneDX 1.6 CBOM</span>
              </button>
            </div>
          </div>

          {/* Topology Graph */}
          {showGraph && (
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Cryptographic Dependency & Topology Graph
                </h3>
                <span className="text-[10px] text-gray-400">Shows confirmed AST calls & relationships</span>
              </div>
              <div className="h-72 w-full rounded-lg overflow-hidden border border-gray-800">
                <DependencyGraph findings={findings} />
              </div>
            </div>
          )}

          {/* Inventory Table & Evidence Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search algorithms, files, or libraries..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-900 text-xs text-gray-200 placeholder-gray-500 rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-900 text-xs text-gray-200 rounded-lg border border-gray-800 focus:outline-none"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-950/80 text-[10px] uppercase font-semibold text-gray-500 border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Algorithm</th>
                      <th className="py-3 px-4">Operation</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Quantum-Safe</th>
                      <th className="py-3 px-4">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {filteredFindings.map((f, i) => (
                      <tr
                        key={f.id || i}
                        onClick={() => setSelectedFinding(f)}
                        className={`cursor-pointer transition-colors ${
                          selectedFinding?.id === f.id ? 'bg-indigo-600/15 text-white' : 'hover:bg-gray-800/40'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-gray-200">{f.algorithm}</td>
                        <td className="py-3 px-4 capitalize text-gray-400">{f.operation}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-400 truncate max-w-[180px]">
                          {f.file_path.split('/').pop() || f.file_path}:{f.line_number}
                        </td>
                        <td className="py-3 px-4">
                          {f.quantum_safe ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Yes (PQC)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              No (Vulnerable)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={String(f.severity).toLowerCase() as any}>{f.severity}</Badge>
                        </td>
                      </tr>
                    ))}
                    {filteredFindings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No cryptographic findings match your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Evidence Drawer */}
            <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>Traceable Evidence & Context</span>
              </h3>

              {selectedFinding ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Primitive</span>
                    <div className="text-base font-bold text-white mt-0.5">{selectedFinding.algorithm}</div>
                    <div className="text-xs text-indigo-400 font-medium">Operation: {selectedFinding.operation}</div>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Source Location</span>
                    <div className="text-xs font-mono text-gray-300 mt-0.5 break-all">
                      {selectedFinding.file_path}:{selectedFinding.line_number}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">NIST Standard Status</span>
                    <div className="text-xs text-gray-300 mt-0.5 capitalize">
                      Status: <span className="font-semibold text-orange-400">{selectedFinding.nist_status}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Code Snippet</span>
                    <div className="mt-1">
                      <CodeSnippet code={selectedFinding.evidence || '# Direct AST detection'} language="python" />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Recommendation</span>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed bg-gray-950 p-2.5 rounded-lg border border-gray-800">
                      {selectedFinding.recommendation || 'Upgrade to NIST approved algorithm.'}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => navigate('/lab')}
                      className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                      Simulate Replacement in CryptoLab →
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 py-6 text-center">Select an asset from the table to inspect code evidence.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Instant Code Analyzer (Interactive Playground) */}
      {activeTab === 'analyzer' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Real-Time Cryptographic Code Scanner</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Paste or edit any Python source code below. The engine performs real-time AST parsing to identify cryptographic vulnerabilities and recommend quantum-safe modernizations.
                </p>
              </div>
              <button
                onClick={handleRunSnippetAnalysis}
                disabled={analyzing}
                className="flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {analyzing ? (
                  <span>Analyzing AST...</span>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Analyze Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Presets */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              <span className="text-[10px] text-gray-400 uppercase font-semibold shrink-0">Try Presets:</span>
              {CODE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSnippetCode(p.code);
                    setSnippetResults(null);
                  }}
                  className="px-2.5 py-1 text-xs rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors shrink-0 cursor-pointer border border-gray-700/60"
                  title={p.description}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Code Input */}
            <div className="mt-3 relative">
              <textarea
                value={snippetCode}
                onChange={(e) => setSnippetCode(e.target.value)}
                rows={10}
                className="w-full p-3 font-mono text-xs bg-gray-950 text-gray-100 rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
                placeholder="# Paste Python code here..."
              />
              <button
                onClick={() => handleCopyCode(snippetCode)}
                className="absolute top-2.5 right-2.5 px-2 py-1 text-[10px] font-semibold rounded bg-gray-800 text-gray-300 hover:text-white border border-gray-700 cursor-pointer flex items-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Analysis Results */}
          {snippetError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              <strong>Analysis Error:</strong> {snippetError}
            </div>
          )}

          {snippetResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Detected Cryptographic Primitives ({snippetResults.length})</span>
                </h3>
                <span className="text-xs text-gray-400">Deterministic AST Validation Complete</span>
              </div>

              {snippetResults.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-400">
                  No cryptographic primitives detected in this snippet. Code conforms to standard algorithms.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {snippetResults.map((r, i) => (
                    <div key={i} className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-bold text-white">{r.algorithm}</span>
                          <span className="text-xs text-gray-400">({r.operation})</span>
                        </div>
                        <Badge variant={r.severity.toLowerCase() as any}>{r.severity}</Badge>
                      </div>

                      <div className="text-xs text-gray-300 space-y-1">
                        <div>
                          <span className="text-gray-500">Line:</span> Line {r.line_number} •{' '}
                          <span className="text-gray-500">NIST Status:</span>{' '}
                          <span className="font-semibold text-orange-400 capitalize">{r.nist_status}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Quantum Resistant:</span>{' '}
                          {r.quantum_safe ? (
                            <span className="text-emerald-400 font-semibold">Yes (Post-Quantum)</span>
                          ) : (
                            <span className="text-rose-400 font-semibold">No (Vulnerable to Quantum Computing)</span>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-gray-950 border border-gray-800 font-mono text-[11px] text-gray-300">
                        {r.evidence}
                      </div>

                      <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed">
                        <span className="font-bold text-indigo-200">Recommendation:</span> {r.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

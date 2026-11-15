import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Play,
  Trash2,
  RefreshCw,
  FileCode2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  FolderUp,
  Folder,
  UploadCloud,
  FileArchive,
  X,
  Sparkles,
} from 'lucide-react';
import JSZip from 'jszip';
import { getProjects, createProject, deleteProject, scanProject, loadSampleProject, removeSampleProject } from '../api/projects';
import { getScanStatus, ScanStatusResponse } from '../api/scans';
import { Project } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');
  const [folderFileCount, setFolderFileCount] = useState<number>(0);
  const [zipping, setZipping] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Active method in modal: 'folder' | 'path' | 'zip'
  const [uploadMethod, setUploadMethod] = useState<'folder' | 'path' | 'zip'>('folder');

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Live Scan Modal State
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [activeScan, setActiveScan] = useState<{
    scanId: string;
    projectId: string;
    projectName: string;
    progress: number;
    step: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    totalFindings: number;
    errorMessage?: string;
  } | null>(null);

  const pollIntervalRef = useRef<any>(null);
  const navigate = useNavigate();

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setZipping(true);
    try {
      const zip = new JSZip();
      let extractedFolderName = '';
      let count = 0;

      for (let i = 0; i < fileList.length; i++) {
        const item = fileList[i];
        const relPath = item.webkitRelativePath || item.name;
        if (!extractedFolderName && item.webkitRelativePath) {
          extractedFolderName = item.webkitRelativePath.split('/')[0];
        }
        zip.file(relPath, item);
        count++;
      }

      const folderTitle = extractedFolderName || 'selected-project';
      setSelectedFolderName(folderTitle);
      setFolderFileCount(count);
      if (!name.trim()) {
        setName(folderTitle);
      }

      // Generate in-memory zip bundle
      const blob = await zip.generateAsync({ type: 'blob' });
      const packedFile = new File([blob], `${folderTitle}.zip`, { type: 'application/zip' });
      setFile(packedFile);
    } catch (err) {
      console.error('Failed to package folder into zip:', err);
      alert('Error reading folder files. Please try again or provide local path.');
    } finally {
      setZipping(false);
    }
  };

  const handleClearFolder = () => {
    setSelectedFolderName('');
    setFolderFileCount(0);
    setFile(null);
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createProject({
        name,
        description,
        sourcePath: sourcePath.trim() || undefined,
        file: file || undefined,
      });
      setCreateModalOpen(false);
      setName('');
      setDescription('');
      setSourcePath('');
      setFile(null);
      setSelectedFolderName('');
      setFolderFileCount(0);
      await loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScan = async (project: Project) => {
    try {
      const res = await scanProject(String(project.id));
      const scanId = String(res.id || (res as any).scan_id);

      setActiveScan({
        scanId,
        projectId: String(project.id),
        projectName: project.name,
        progress: 15,
        step: 'Initializing cryptographic AST scanner...',
        status: 'running',
        totalFindings: 0,
      });
      setScanModalOpen(true);

      // Start live polling every 700ms
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes: ScanStatusResponse = await getScanStatus(scanId);
          setActiveScan((prev) =>
            prev
              ? {
                  ...prev,
                  progress: statusRes.progress,
                  step: statusRes.step,
                  status: statusRes.status,
                  totalFindings: statusRes.total_findings,
                  errorMessage: statusRes.error_message,
                }
              : null
          );

          if (statusRes.status === 'completed' || statusRes.status === 'failed') {
            clearInterval(pollIntervalRef.current);
            loadProjects();
            localStorage.setItem('activeProjectId', String(project.id));
            window.dispatchEvent(new Event('activeProjectChanged'));
          }
        } catch (pollErr) {
          console.warn('Poll status error', pollErr);
        }
      }, 700);
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Scan failed to trigger');
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Delete this project and all its scan evidence permanently?')) return;
    try {
      await deleteProject(projectId);
      if (localStorage.getItem('activeProjectId') === projectId) {
        localStorage.removeItem('activeProjectId');
      }
      await loadProjects();
      window.dispatchEvent(new Event('projectsUpdated'));
      window.dispatchEvent(new Event('activeProjectChanged'));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete project');
    }
  };

  const handleLoadSample = async () => {
    try {
      const sample = await loadSampleProject();
      localStorage.setItem('activeProjectId', String(sample.id));
      await loadProjects();
      window.dispatchEvent(new Event('projectsUpdated'));
      window.dispatchEvent(new Event('activeProjectChanged'));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load sample project');
    }
  };

  const handleRemoveSample = async () => {
    if (!confirm('Remove sample demonstration project? You can re-add it at any time.')) return;
    try {
      await removeSampleProject();
      localStorage.removeItem('activeProjectId');
      await loadProjects();
      window.dispatchEvent(new Event('projectsUpdated'));
      window.dispatchEvent(new Event('activeProjectChanged'));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove sample project');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hasSampleProject = projects.some((p) => p.is_demo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Project Registry</h1>
          <p className="text-xs text-gray-400 mt-1">
            Register codebases for cryptographic discovery, risk assessment, and post-quantum migration
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasSampleProject ? (
            <button
              onClick={handleRemoveSample}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 hover:text-white transition-all cursor-pointer"
              title="Remove sample demonstration project"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Sample</span>
            </button>
          ) : (
            <button
              onClick={handleLoadSample}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-indigo-500/40 transition-all cursor-pointer"
              title="Load pre-configured sample financial gateway"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Load Sample Data</span>
            </button>
          )}

          <button
            onClick={() => {
              setCreateModalOpen(true);
              handleClearFolder();
            }}
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Codebase</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((p) => (
          <div
            key={p.id}
            className="p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <FileCode2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    <span className="text-[10px] text-gray-500">ID: {p.id} • {p.source_type}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-3 line-clamp-2">
                {p.description || 'No description provided for this codebase.'}
              </p>

              {p.source_path && (
                <p className="text-[10px] text-gray-500 mt-2 font-mono truncate" title={p.source_path}>
                  📁 {p.source_path}
                </p>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-800/80 flex items-center justify-between">
              <button
                onClick={() => handleScan(p)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Trigger Live Scan</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    localStorage.setItem('activeProjectId', String(p.id));
                    window.dispatchEvent(new Event('activeProjectChanged'));
                    navigate('/discover');
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  View Inventory
                </button>
                <button
                  onClick={() => handleDelete(String(p.id))}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full p-16 text-center rounded-2xl bg-gray-900/50 border border-dashed border-gray-800">
            <FolderGit2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-300">No projects registered yet</h3>
            <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto">
              Click "Register New Codebase" to choose your project folder from your computer.
            </p>
            <button
              onClick={() => {
                setCreateModalOpen(true);
                handleClearFolder();
              }}
              className="mt-5 inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Codebase</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Scan Progress Modal */}
      <Modal
        isOpen={scanModalOpen}
        onClose={() => {
          if (activeScan?.status === 'completed' || activeScan?.status === 'failed') {
            setScanModalOpen(false);
          }
        }}
        title={`Cryptographic Discovery: ${activeScan?.projectName || 'Project'}`}
      >
        <div className="space-y-5 py-2">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {activeScan?.status === 'completed' ? (
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle className="w-5 h-5" />
                </div>
              ) : activeScan?.status === 'failed' ? (
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-white">
                  {activeScan?.status === 'completed'
                    ? 'Scan Complete'
                    : activeScan?.status === 'failed'
                    ? 'Scan Encountered Error'
                    : 'Cryptographic Scan in Progress'}
                </h4>
                <p className="text-xs text-gray-400">Scan ID: #{activeScan?.scanId}</p>
              </div>
            </div>
            <span className="text-lg font-black font-mono text-indigo-400">
              {activeScan?.progress || 0}%
            </span>
          </div>

          {/* Animated Progress Bar */}
          <ProgressBar progress={activeScan?.progress || 0} color="indigo" />

          {/* Current Step Description */}
          <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-gray-300">Current Phase</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                {activeScan?.status}
              </span>
            </div>
            <p className="text-indigo-300 font-mono text-[11px] leading-relaxed">
              {activeScan?.step || 'Executing AST analysis...'}
            </p>
          </div>

          {/* Results Summary */}
          {activeScan?.status === 'completed' && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-medium">Discovered Cryptographic Primitives:</span>
                <span className="text-lg font-bold text-white font-mono">{activeScan.totalFindings}</span>
              </div>
              <button
                onClick={() => {
                  setScanModalOpen(false);
                  navigate('/discover');
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30"
              >
                <span>Inspect Discovered Cryptographic Inventory</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeScan?.status === 'failed' && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 text-xs text-red-300">
              {activeScan.errorMessage || 'Scan failed to complete.'}
            </div>
          )}
        </div>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register New Source Repository"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Project Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. sample-project, AuthServer, PaymentGateway"
              className="w-full px-3 py-2 bg-gray-950 text-gray-100 text-xs rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Purpose, security requirements, data classification..."
              className="w-full px-3 py-2 bg-gray-950 text-gray-100 text-xs rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Select Source Method Tabs */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">How do you want to provide your code?</label>
            <div className="grid grid-cols-3 gap-2 bg-gray-950 p-1 rounded-lg border border-gray-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setUploadMethod('folder')}
                className={`py-1.5 px-2 rounded-md flex items-center justify-center space-x-1.5 transition-colors ${
                  uploadMethod === 'folder' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>Select Folder</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod('path')}
                className={`py-1.5 px-2 rounded-md flex items-center justify-center space-x-1.5 transition-colors ${
                  uploadMethod === 'path' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Local Path</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod('zip')}
                className={`py-1.5 px-2 rounded-md flex items-center justify-center space-x-1.5 transition-colors ${
                  uploadMethod === 'zip' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileArchive className="w-3.5 h-3.5" />
                <span>Upload .zip</span>
              </button>
            </div>
          </div>

          {/* Option 1: Select Folder via OS Directory Picker */}
          {uploadMethod === 'folder' && (
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
              <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderSelect}
                // @ts-ignore - webkitdirectory is standard in Chromium / WebKit
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
              />

              {!selectedFolderName ? (
                <div
                  onClick={() => folderInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-xl p-6 text-center transition-all bg-gray-900/40 hover:bg-indigo-950/10"
                >
                  <FolderUp className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-white">Click to Select Entire Project Folder</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Selects your entire folder (including subfolders like src/, config/, tests/)
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Folder Selected: {selectedFolderName}</p>
                      <p className="text-[11px] text-emerald-300">
                        {zipping ? 'Packaging files into bundle...' : `${folderFileCount} files packaged and ready to scan`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearFolder}
                    className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-800"
                    title="Choose different folder"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Option 2: Local Directory Path */}
          {uploadMethod === 'path' && (
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
              <label className="block text-xs font-medium text-gray-300">
                Desktop Directory Path
              </label>
              <input
                type="text"
                value={sourcePath}
                onChange={(e) => {
                  setSourcePath(e.target.value);
                  if (!name.trim() && e.target.value.trim()) {
                    const parts = e.target.value.replace(/\\/g, '/').split('/').filter(Boolean);
                    if (parts.length > 0) setName(parts[parts.length - 1]);
                  }
                }}
                placeholder="e.g. C:\Users\suman\OneDrive\Desktop\CryptoPilot\sample-project"
                className="w-full px-3 py-2 bg-gray-900 text-gray-100 text-xs rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[11px] text-gray-500">
                Type or paste the full local path to any project folder on your desktop.
              </p>
            </div>
          )}

          {/* Option 3: Zip Upload */}
          {uploadMethod === 'zip' && (
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
              <label className="block text-xs font-medium text-gray-300">
                Source Archive (.zip file)
              </label>
              <input
                type="file"
                ref={zipInputRef}
                accept=".zip"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  if (f && !name.trim()) {
                    setName(f.name.replace(/\.zip$/i, ''));
                  }
                }}
                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || zipping}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-md shadow-indigo-600/30"
            >
              {submitting ? 'Registering...' : zipping ? 'Bundling Folder...' : 'Register Codebase'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

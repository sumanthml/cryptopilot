import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Sparkles, FolderKanban, Trash2, Plus, RefreshCw } from 'lucide-react';
import { getProjects, loadSampleProject, removeSampleProject } from '../../api/projects';
import { Project } from '../../types';

interface TopBarProps {
  onOpenAssistant?: () => void;
}

export default function TopBar({ onOpenAssistant }: TopBarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0) {
        const stored = localStorage.getItem('activeProjectId');
        if (stored && data.some((p) => String(p.id) === stored)) {
          setSelectedProjectId(stored);
        } else {
          setSelectedProjectId(String(data[0].id));
          localStorage.setItem('activeProjectId', String(data[0].id));
        }
      } else {
        setSelectedProjectId('');
        localStorage.removeItem('activeProjectId');
      }
    } catch {
      // Handled silently
    }
  };

  useEffect(() => {
    loadProjects();

    const handleProjectsUpdated = () => {
      loadProjects();
    };

    const handleActiveChanged = () => {
      const stored = localStorage.getItem('activeProjectId');
      if (stored) setSelectedProjectId(stored);
    };

    window.addEventListener('projectsUpdated', handleProjectsUpdated);
    window.addEventListener('activeProjectChanged', handleActiveChanged);

    return () => {
      window.removeEventListener('projectsUpdated', handleProjectsUpdated);
      window.removeEventListener('activeProjectChanged', handleActiveChanged);
    };
  }, []);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProjectId(val);
    localStorage.setItem('activeProjectId', val);
    window.dispatchEvent(new Event('activeProjectChanged'));
  };

  const handleLoadSample = async () => {
    setActionLoading(true);
    try {
      const sample = await loadSampleProject();
      localStorage.setItem('activeProjectId', String(sample.id));
      await loadProjects();
      window.dispatchEvent(new Event('projectsUpdated'));
      window.dispatchEvent(new Event('activeProjectChanged'));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load sample project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveSample = async () => {
    if (!confirm('Remove the sample demonstration project and its findings? You can re-add it at any time.')) return;
    setActionLoading(true);
    try {
      await removeSampleProject();
      localStorage.removeItem('activeProjectId');
      await loadProjects();
      window.dispatchEvent(new Event('projectsUpdated'));
      window.dispatchEvent(new Event('activeProjectChanged'));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove sample project');
    } finally {
      setActionLoading(false);
    }
  };

  const activeProject = projects.find((p) => String(p.id) === selectedProjectId);
  const hasSampleProject = projects.some((p) => p.is_demo);

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-gray-900 border-b border-gray-800 shrink-0">
      {/* Project Selector & Search & Quick Sample Controls */}
      <div className="flex items-center space-x-3 flex-1 max-w-3xl">
        {/* Project Dropdown */}
        <div className="flex items-center space-x-2 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700/60 shrink-0">
          <FolderKanban className="w-4 h-4 text-indigo-400 shrink-0" />
          <select
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer pr-3 font-medium max-w-[200px] truncate"
          >
            {projects.length === 0 ? (
              <option value="" className="bg-gray-900 text-gray-400">No projects registered</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-gray-900 text-gray-200">
                  {p.name} {p.is_demo ? '(Demo)' : ''}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Dynamic Sample Control Buttons in TopBar */}
        {hasSampleProject ? (
          <button
            onClick={handleRemoveSample}
            disabled={actionLoading}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 hover:text-white transition-all shrink-0"
            title="Remove sample demo project and its scan data"
          >
            {actionLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Remove Sample</span>
          </button>
        ) : (
          <button
            onClick={handleLoadSample}
            disabled={actionLoading}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 hover:text-white transition-all shrink-0"
            title="Load pre-configured sample financial gateway to explore"
          >
            {actionLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="hidden sm:inline">Load Sample Data</span>
          </button>
        )}

        {/* Quick New Project Button */}
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700/80 border border-gray-700/50 transition-all shrink-0"
          title="Register new project"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">New Project</span>
        </button>

        {/* Global Search Box */}
        <div className="relative flex-1 hidden lg:block">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search cryptographic algorithms, files, CVEs..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-800/50 text-gray-200 placeholder-gray-500 rounded-lg border border-gray-700/60 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Action Badges & AI Quick Launcher */}
      <div className="flex items-center space-x-3 shrink-0 ml-4">
        <button
          onClick={onOpenAssistant}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 transition-colors"
          title="Open AI Crypto Copilot"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Guidance</span>
        </button>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="hidden md:inline">Deterministic Verified</span>
        </div>

        <div className="relative p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/80 cursor-pointer transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500"></span>
        </div>
      </div>
    </header>
  );
}

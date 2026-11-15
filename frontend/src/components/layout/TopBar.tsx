import React, { useEffect, useState } from 'react';
import { Search, Bell, ShieldAlert, Sparkles, FolderKanban } from 'lucide-react';
import { getProjects } from '../../api/projects';
import { Project } from '../../types';

interface TopBarProps {
  onOpenAssistant?: () => void;
}

export default function TopBar({ onOpenAssistant }: TopBarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    async function loadProjects() {
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
        }
      } catch (err) {
        // Handled silently
      }
    }
    loadProjects();
  }, []);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProjectId(val);
    localStorage.setItem('activeProjectId', val);
    window.dispatchEvent(new Event('activeProjectChanged'));
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-gray-900 border-b border-gray-800 shrink-0">
      {/* Project Selector & Search */}
      <div className="flex items-center space-x-4 flex-1 max-w-xl">
        <div className="flex items-center space-x-2 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700/60">
          <FolderKanban className="w-4 h-4 text-indigo-400 shrink-0" />
          <select
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="bg-transparent text-sm text-gray-200 focus:outline-none cursor-pointer pr-4 font-medium"
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

        <div className="relative flex-1 hidden md:block">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search cryptographic algorithms, files, CVEs..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-800/50 text-gray-200 placeholder-gray-500 rounded-lg border border-gray-700/60 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Action Badges & AI Quick Launcher */}
      <div className="flex items-center space-x-3">
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
          <span>Deterministic Verified</span>
        </div>

        <div className="relative p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/80 cursor-pointer transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500"></span>
        </div>
      </div>
    </header>
  );
}

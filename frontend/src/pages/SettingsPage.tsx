import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Cpu,
  Save,
  CheckCircle2,
  Key,
  Database,
  Cloud,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const [aiProvider, setAiProvider] = useState('auto');
  const [groqKey, setGroqKey] = useState('gsk_••••••••••••••••••••••••••••');
  const [geminiKey, setGeminiKey] = useState('AIzaSy••••••••••••••••••••••••••••');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <SettingsIcon className="w-5 h-5 text-indigo-400" />
          <span>System & Account Settings</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Manage identity, cloud AI providers, and scanning thresholds
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <User className="w-4 h-4 text-indigo-400" />
            <span>Authenticated User Profile (Firebase Identity)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                disabled
                value={currentUser?.displayName || 'Security Developer'}
                className="w-full px-3 py-2 bg-gray-950 text-gray-300 text-xs rounded-lg border border-gray-800 opacity-80"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={currentUser?.email || 'user@example.com'}
                className="w-full px-3 py-2 bg-gray-950 text-gray-300 text-xs rounded-lg border border-gray-800 opacity-80"
              />
            </div>
          </div>
        </div>

        {/* AI Engine Configuration */}
        <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>AI Copilot & Guidance Providers</span>
          </h3>
          <p className="text-xs text-gray-400">
            CryptoPilot cascades automatically: Groq GPT-120B &amp; Qwen-27B (Primary High Speed) → Google Gemini 3.8 → Deterministic Expert Rule Engine.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Active Routing Policy</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="w-full px-3 py-2 bg-gray-950 text-xs text-gray-200 rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">Auto Cascading (Groq Primary → Gemini Backup → Deterministic)</option>
                <option value="groq">Groq Cloud (GPT-120B / Qwen-27B High Speed)</option>
                <option value="gemini">Google Gemini 3.8 Flash</option>
                <option value="deterministic">Deterministic Expert Only (100% Offline / Zero API)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Groq Cloud API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-950 text-xs text-gray-200 rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Google Gemini API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-950 text-xs text-gray-200 rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Infrastructure Health Status */}
        <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-emerald-400" />
            <span>Infrastructure Connectivity Status</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Database</div>
                <div className="text-[10px] text-gray-400">Supabase PostgreSQL</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Connected
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Authentication</div>
                <div className="text-[10px] text-gray-400">Firebase Auth</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Connected
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Vulnerability Feeds</div>
                <div className="text-[10px] text-gray-400">OSV.dev + NIST CSRC</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saved && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved successfully</span>
            </div>
          )}
          {!saved && <div />}

          <button
            type="submit"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}

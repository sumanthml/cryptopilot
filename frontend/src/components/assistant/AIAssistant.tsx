import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, RefreshCw, FolderKanban, Check, Copy } from 'lucide-react';
import { askAI } from '../../api/ai';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  provider?: string;
  timestamp: string;
  projectAttached?: boolean;
}

const PAGE_CONTEXT_DESCRIPTIONS: Record<string, string> = {
  '/dashboard': 'Executive Overview: Real-time cryptographic inventory, post-quantum readiness & migration audit.',
  '/projects': 'Project Registry: Manage registered codebases, trigger scans, and inspect source directories.',
  '/discover': 'CryptoDiscover Module: Evidence-based cryptographic inventory, AST detections, and interactive dependency graph with CBOM export.',
  '/risk': 'CryptoRisk Module: 0-100 explainable risk scoring, contributing factor breakdowns, and prioritized migration candidates.',
  '/lab': 'CryptoLab Module: Isolated migration sandboxes, candidate algorithm comparison matrix, automated tests, and performance benchmarks.',
  '/watch': 'CryptoWatch Module: Real-time vulnerability advisories (OSV/CISA/NIST) with automated 2-hour threat intelligence crawler.',
  '/reports': 'Audit & Reporting: Export executive summaries, technical findings, and audit trails.',
  '/settings': 'System Settings: Configure theme, AI credentials, and scanner thresholds.',
};

export default function AIAssistant({ isOpen, onClose, currentPath }: AIAssistantProps) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello! I am your CryptoPilot AI Security Copilot. I analyze your active project findings, generate production-grade code refactoring diffs, and provide authoritative guidance on NIST SP 800-131A Rev 2 and Post-Quantum Cryptography standards (FIPS 203 ML-KEM, FIPS 204 ML-DSA). How can I assist you?',
      provider: 'CryptoPilot Copilot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateActiveProject = () => {
      setActiveProjectId(localStorage.getItem('activeProjectId'));
    };
    updateActiveProject();
    window.addEventListener('activeProjectChanged', updateActiveProject);
    return () => window.removeEventListener('activeProjectChanged', updateActiveProject);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (textToSend?: string) => {
    const question = textToSend || input;
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const pageInfo = PAGE_CONTEXT_DESCRIPTIONS[currentPath] || `Current page: ${currentPath}`;
      const context = `User is currently on: ${currentPath}. ${pageInfo}`;
      const res = await askAI(question, context, activeProjectId || undefined);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        provider: res.provider || 'AI Copilot',
        projectAttached: res.project_context_attached,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'NIST Expert Guidance: Check detected algorithms against NIST SP 800-131A Rev 2. Upgrade weak hashes (MD5, SHA-1) to SHA-256 or SHA-3, upgrade RSA < 2048 to RSA-3072 or ML-DSA (FIPS 204), and replace ECB/CBC modes with AES-256-GCM AEAD.',
        provider: 'NIST Fallback Rule',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-[430px] max-w-[calc(100vw-2rem)] h-[620px] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-white">CryptoPilot Copilot</h3>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Live Groq 120B
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 mt-0.5">
              <FolderKanban className="w-3 h-3 text-indigo-400" />
              <span>{activeProjectId ? `Project #${activeProjectId} Linked` : 'No Project Selected'}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-3 py-2 bg-gray-900/90 border-b border-gray-800/80 flex items-center space-x-1.5 overflow-x-auto text-[11px] scrollbar-none">
        <button
          onClick={() => handleSend('Explain the critical cryptographic risks in my active project and how to fix them')}
          className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 whitespace-nowrap border border-gray-700/60 transition-colors"
        >
          Fix Project Risks
        </button>
        <button
          onClick={() => handleSend('Give me a step-by-step Post-Quantum Cryptography (PQC) migration plan')}
          className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 whitespace-nowrap border border-gray-700/60 transition-colors"
        >
          PQC Roadmap
        </button>
        <button
          onClick={() => handleSend('Show Python code refactoring diff to replace MD5 and SHA-1 with SHA-256')}
          className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 whitespace-nowrap border border-gray-700/60 transition-colors"
        >
          MD5/SHA1 Patch
        </button>
        <button
          onClick={() => handleSend('What are the key requirements of NIST SP 800-131A Rev 2?')}
          className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 whitespace-nowrap border border-gray-700/60 transition-colors"
        >
          NIST 800-131A
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-gray-950/60">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                  : 'bg-gray-800/95 text-gray-200 border border-gray-700/60 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{m.text}</div>
            </div>
            <div className="flex items-center space-x-2 mt-1 px-1">
              {m.projectAttached && (
                <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                  Project Context Linked
                </span>
              )}
              {m.provider && (
                <span className="text-[9px] font-medium text-indigo-400/90">
                  {m.provider}
                </span>
              )}
              <span className="text-[9px] text-gray-500">{m.timestamp}</span>
              {m.sender === 'assistant' && (
                <button
                  onClick={() => copyCode(m.text, m.id)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                  title="Copy message"
                >
                  {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center space-x-2 text-xs text-indigo-400 bg-gray-800/70 p-3 rounded-xl border border-gray-700/50 w-fit">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing cryptographic inventory & generating enterprise advice...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-gray-900 border-t border-gray-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about crypto algorithms, PQC, or your code..."
            className="flex-1 px-3 py-2 text-xs bg-gray-950 text-gray-100 placeholder-gray-500 rounded-lg border border-gray-700/70 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-md shadow-indigo-600/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

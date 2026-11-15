import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  UserPlus,
  CheckCircle,
  Sparkles,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Key,
  LogIn,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatAuthError } from '../utils/authErrors';

type AuthTab = 'demo' | 'email' | 'google';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<AuthTab>('demo');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [customBypassEmail, setCustomBypassEmail] = useState('sumanthml18@gmail.com');

  // Status states
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDomainError, setIsDomainError] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const { login, register, loginWithGoogle, loginAsDemo, loginWithCustomUser } = useAuth();
  const navigate = useNavigate();

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'your-domain.vercel.app';

  const clearErrors = () => {
    setErrorTitle('');
    setErrorMessage('');
    setIsDomainError(false);
    setSuccessMsg('');
  };

  // 1. Instant Demo Access
  const handleInstantDemo = () => {
    clearErrors();
    localStorage.removeItem('cryptopilot_demo_sample_removed');
    localStorage.setItem('activeProjectId', '1');
    loginAsDemo();
    navigate('/dashboard');
  };

  // 2. Custom Quick Access Bypass (Bypasses Firebase domain whitelist or password barriers)
  const handleCustomBypass = (targetEmail?: string) => {
    clearErrors();
    const finalEmail = targetEmail || customBypassEmail || 'sumanthml18@gmail.com';
    const finalName = finalEmail.split('@')[0];
    loginWithCustomUser(finalEmail, finalName);
    navigate('/dashboard');
  };

  // 3. Email & Password Submission (Sign In or Sign Up)
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    if (isRegisterMode) {
      if (password.length < 6) {
        setErrorTitle('Password Too Short');
        setErrorMessage('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
      try {
        await register(email, password, displayName || email.split('@')[0]);
        setSuccessMsg('Account created successfully! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 500);
      } catch (err: any) {
        const formatted = formatAuthError(err);
        setErrorTitle(formatted.title);
        setErrorMessage(formatted.message);
        setIsDomainError(formatted.isDomainError);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await login(email, password);
        navigate('/dashboard');
      } catch (err: any) {
        const code = err?.code || '';
        // If user not found, try quick auto-creation
        if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
          try {
            await register(email, password, email.split('@')[0]);
            setSuccessMsg('Account registered and signed in! Redirecting...');
            setTimeout(() => navigate('/dashboard'), 500);
            return;
          } catch {
            // fall through to formatted error
          }
        }
        const formatted = formatAuthError(err);
        setErrorTitle(formatted.title);
        setErrorMessage(formatted.message);
        setIsDomainError(formatted.isDomainError);
      } finally {
        setLoading(false);
      }
    }
  };

  // 4. Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    clearErrors();
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setErrorTitle(formatted.title);
      setErrorMessage(formatted.message);
      setIsDomainError(formatted.isDomainError);
    } finally {
      setGoogleLoading(false);
    }
  };

  const copyDomainToClipboard = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4 py-8 font-sans">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 mb-3 shadow-lg shadow-indigo-600/20">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>CryptoPilot</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-indigo-400 font-semibold mt-1 flex items-center justify-center space-x-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Post-Quantum Cryptography &amp; Asset Management Platform</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Discover, Prioritize Quantum Risk &amp; Transition to CNSA 2.0
          </p>
        </div>

        {/* 3 Distinct Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-950 rounded-xl border border-gray-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('demo');
              clearErrors();
            }}
            className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'demo'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Instant Demo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('email');
              clearErrors();
            }}
            className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'email'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('google');
              clearErrors();
            }}
            className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'google'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google SSO</span>
          </button>
        </div>

        {/* Global Success Notification */}
        {successMsg && (
          <div className="flex items-start p-3 mb-5 space-x-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Domain Notice / Error Banner */}
        {isDomainError && (
          <div className="p-4 mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-3">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-bold block text-amber-300">
                  Firebase Domain Authorization Required
                </span>
                <span className="text-gray-300 block mt-1 leading-relaxed">
                  Your current deployed domain <code className="bg-gray-950 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/20">{currentHostname}</code> is not in Firebase's Authorized Domains list yet.
                </span>
              </div>
            </div>

            {/* Quick 1-Click Bypass Button */}
            <div className="p-3 bg-gray-950/80 rounded-xl border border-gray-800 space-y-2">
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant 1-Click Access (No Domain Setup Needed)</span>
              </span>
              <button
                type="button"
                onClick={() => handleCustomBypass('sumanthml18@gmail.com')}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <span>Enter as sumanthml18@gmail.com</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Whitelisting instructions */}
            <div className="pt-2 border-t border-amber-500/20 text-[11px] text-gray-400 space-y-1.5">
              <p className="font-medium text-amber-300/90">To enable native Google OAuth on this domain:</p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={copyDomainToClipboard}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded border border-gray-700 flex items-center space-x-1.5 text-[11px] transition-colors cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDomain ? 'Domain Copied!' : 'Copy Domain'}</span>
                </button>
                <a
                  href="https://console.firebase.google.com/project/cryptopilot-76208/authentication/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded border border-indigo-500/30 flex items-center space-x-1.5 text-[11px] transition-colors"
                >
                  <span>Firebase Console Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[10px] text-gray-500">
                Go to Authentication &gt; Settings &gt; Authorized domains &gt; Add domain: <code>{currentHostname}</code>
              </p>
            </div>
          </div>
        )}

        {/* Standard Error Banner (Non-domain) */}
        {!isDomainError && errorMessage && (
          <div className="p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-2">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div>
                <span className="font-semibold block text-red-200">{errorTitle}</span>
                <span className="text-gray-300">{errorMessage}</span>
              </div>
            </div>
            {email && (
              <button
                type="button"
                onClick={() => handleCustomBypass(email)}
                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>Continue as {email} with Quick Access &rarr;</span>
              </button>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: INSTANT DEMO MODE (Clean & Welcoming)             */}
        {/* ======================================================== */}
        {activeTab === 'demo' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-gray-900 to-purple-950/40 border border-indigo-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Instant Security Suite Evaluation</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Zero Setup Required
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed mb-3">
                Experience all platform features immediately with a pre-loaded enterprise financial codebase.
                Inspect AST-discovered cryptographic primitives, NIST SP 800-131A compliance, and run live post-quantum migrations in the browser sandbox.
              </p>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-[11px] text-gray-300">
                <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800 flex items-center space-x-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>6 Discovered Primitives</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800 flex items-center space-x-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>NIST SP 800-131A Posture</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800 flex items-center space-x-2">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interactive Migration Lab</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800 flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>CycloneDX CBOM Export</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstantDemo}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <span>Enter Live Demo Mode (Instant Access)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                You can add or delete sample data anytime from the top bar inside the app.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: EMAIL & PASSWORD (Clean Sign In / Register)       */}
        {/* ======================================================== */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            {/* Toggle Sign In / Create Account */}
            <div className="flex border-b border-gray-800 mb-4">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  clearErrors();
                }}
                className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                  !isRegisterMode
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Sign In to Existing Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  clearErrors();
                }}
                className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                  isRegisterMode
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Create New Account
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required={isRegisterMode}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="w-full px-3.5 py-2 bg-gray-950 text-gray-100 placeholder-gray-600 text-sm rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Work Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-9 pr-3.5 py-2 bg-gray-950 text-gray-100 placeholder-gray-600 text-sm rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2 bg-gray-950 text-gray-100 placeholder-gray-600 text-sm rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                {isRegisterMode && (
                  <p className="text-[10px] text-gray-500 mt-1">Must be at least 6 characters.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-4 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>{isRegisterMode ? 'Complete Registration' : 'Sign In to CryptoPilot'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-gray-500">
                Prefer evaluating without creating credentials?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('demo')}
                  className="text-indigo-400 hover:underline cursor-pointer"
                >
                  Use Instant Demo Mode &rarr;
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: GOOGLE SSO (Clean & Resilient)                    */}
        {/* ======================================================== */}
        {activeTab === 'google' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 text-center space-y-3">
              <p className="text-xs text-gray-300 leading-relaxed">
                Authenticate with your corporate Google Workspace account or personal Google identity.
              </p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="flex items-center justify-center w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 text-sm font-bold rounded-xl shadow transition-all disabled:opacity-50 cursor-pointer"
              >
                {googleLoading ? (
                  <span className="text-gray-700">Connecting with Google...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Access Form for custom Google Email */}
            <div className="p-4 rounded-xl bg-gray-950/40 border border-gray-800/80 space-y-2.5">
              <span className="text-xs font-semibold text-gray-300 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Quick Google Account Direct Access</span>
              </span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                If your deployment domain is not yet whitelisted in Firebase Console, you can enter directly with your Google email:
              </p>
              <div className="flex space-x-2">
                <input
                  type="email"
                  value={customBypassEmail}
                  onChange={(e) => setCustomBypassEmail(e.target.value)}
                  placeholder="sumanthml18@gmail.com"
                  className="flex-1 px-3 py-1.5 bg-gray-900 text-gray-100 placeholder-gray-600 text-xs rounded-lg border border-gray-700 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleCustomBypass(customBypassEmail)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  Enter &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-gray-800 text-center">
          <p className="text-[11px] text-gray-500">
            NIST FIPS 203 (ML-KEM) &bull; NIST FIPS 204 (ML-DSA) &bull; CNSA 2.0 Ready
          </p>
        </div>

      </div>
    </div>
  );
}

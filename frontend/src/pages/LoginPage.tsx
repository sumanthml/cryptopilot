import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, UserPlus, CheckCircle, Sparkles, Globe } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [canQuickRegister, setCanQuickRegister] = useState(false);

  const { login, register, loginWithGoogle, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const handleInstantDemo = () => {
    loginAsDemo();
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setCanQuickRegister(false);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || err?.message?.includes('invalid-credential')) {
        try {
          await register(email, password, email.split('@')[0]);
          setSuccessMsg('Account created successfully! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 500);
          return;
        } catch (regErr: any) {
          if (regErr?.code === 'auth/email-already-in-use') {
            setError('Incorrect password for this account. Please verify your credentials or use Instant Demo.');
          } else if (regErr?.code === 'auth/weak-password') {
            setError('Password must be at least 6 characters.');
          } else {
            setError(regErr.message || 'Authentication error. Please check your credentials.');
          }
          setCanQuickRegister(true);
        }
      } else {
        setError(err.message || 'Failed to authenticate. You can also explore instantly via Demo Mode below.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRegister = async () => {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      await register(email, password, email.split('@')[0]);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check password length (min 6 characters).');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in was interrupted. You can explore instantly via Demo Mode.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4 font-sans">
      <div className="w-full max-w-md p-8 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 mb-3 shadow-lg shadow-indigo-600/20">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CryptoPilot</h1>
          <p className="text-xs text-indigo-400 font-semibold mt-1 flex items-center justify-center space-x-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Post-Quantum Cryptography &amp; Asset Management Platform</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Discover, Prioritize Risk &amp; Migrate to Quantum-Safe Standards</p>
        </div>

        {/* 1-Click Instant Demo / Product Tour Banner */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-950/70 via-gray-900 to-purple-950/50 border border-indigo-500/40 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Instant Product Tour</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
              Ready to Explore
            </span>
          </div>
          <p className="text-xs text-gray-300 mb-3 leading-relaxed">
            Try all features immediately with pre-loaded enterprise financial codebase, AST discovery, and sandbox tests.
          </p>
          <button
            type="button"
            onClick={handleInstantDemo}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <span>Enter Live Demo Mode</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-800" />
          <span className="px-3 text-xs text-gray-500 font-medium">or continue with enterprise account</span>
          <div className="flex-1 border-t border-gray-800" />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-2">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
            {canQuickRegister && (
              <button
                type="button"
                onClick={handleQuickRegister}
                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create New Account with this Email</span>
              </button>
            )}
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="flex items-start p-3 mb-5 space-x-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="flex items-center justify-center w-full py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-900 text-sm font-semibold rounded-lg shadow transition-all disabled:opacity-50 mb-4"
        >
          {googleLoading ? (
            <span className="text-gray-700">Connecting to Google...</span>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-9 pr-4 py-2 bg-gray-950 text-gray-100 placeholder-gray-600 text-sm rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-300 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-4 py-2 bg-gray-950 text-gray-100 placeholder-gray-600 text-sm rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to CryptoPilot</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatAuthError } from '../utils/authErrors';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithCustomUser, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorTitle('');
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorTitle('Password Mismatch');
      setErrorMessage('The passwords entered do not match. Please re-enter them.');
      return;
    }

    if (password.length < 6) {
      setErrorTitle('Password Too Short');
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, displayName);
      navigate('/dashboard');
    } catch (err: any) {
      const formatted = formatAuthError(err);
      setErrorTitle(formatted.title);
      setErrorMessage(formatted.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInstantBypass = () => {
    const finalEmail = email || 'developer@cryptopilot.io';
    const finalName = displayName || finalEmail.split('@')[0];
    loginWithCustomUser(finalEmail, finalName);
    navigate('/dashboard');
  };

  const handleInstantDemo = () => {
    loginAsDemo();
    navigate('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4 py-8 font-sans">
      <div className="w-full max-w-md p-8 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 mb-3 shadow-lg shadow-indigo-600/20">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create CryptoPilot Account</h1>
          <p className="text-xs text-gray-400 mt-1">Start auditing cryptographic libraries & quantum vulnerabilities</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 mb-6 space-y-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
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
                onClick={handleInstantBypass}
                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Continue directly as {email} &rarr;
              </button>
            )}
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full pl-9 pr-4 py-2 bg-gray-950 text-gray-100 placeholder-gray-600 text-sm rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                className="w-full pl-9 pr-4 py-2 bg-gray-950 text-gray-100 placeholder-gray-600 text-sm rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Password</label>
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
            <p className="text-[10px] text-gray-500 mt-1">Must be at least 6 characters.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-4 py-2 bg-gray-950 text-gray-100 placeholder-gray-600 text-sm rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-6 cursor-pointer"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        {/* Demo mode shortcut */}
        <div className="mt-5 p-3 rounded-xl bg-gray-950/60 border border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs text-gray-300">Just exploring?</span>
          </div>
          <button
            type="button"
            onClick={handleInstantDemo}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            Try Instant Demo &rarr;
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

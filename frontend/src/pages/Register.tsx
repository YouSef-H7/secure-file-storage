import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.request('/api/auth/register', { 
        method: 'POST', 
        body: JSON.stringify({ email, password }) 
      });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2200);
      } else {
        setError(res.error || 'Identity initialization failed.');
      }
    } catch (err) {
      setError('Critical network failure in registration layer.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-12 text-center shadow-2xl shadow-slate-200/60 border-2 border-gray-200">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2 tracking-tight">Account Created</h2>
          <p className="text-slate-400 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] relative overflow-hidden p-6">
      <div className="w-full max-w-md space-y-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand rounded-2xl mb-4 shadow-xl shadow-brand/25">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 leading-tight">SecureStore</h1>
          <p className="text-slate-400 text-sm">Enterprise File Storage Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/60 p-10 border-2 border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Create your account</h2>
            <p className="text-sm text-slate-400">Sign up to get started</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input 
                type="email" 
                required
                disabled={loading}
                className="w-full bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input 
                type="password" 
                required
                disabled={loading}
                className="w-full bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                <ShieldAlert size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-brand/30 focus:ring-offset-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-200/60 text-center text-sm text-slate-500">
            Already have an account? <Link to="/login" className="text-brand font-medium hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

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
      <div className="min-h-screen flex items-center justify-center bg-black p-4 font-sans">
        <div className="w-full max-w-md bg-[#0d0d0d] border border-[#1a1a1a] rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_25px_rgba(34,197,94,0.4)]"></div>
          <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-700">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Node Provisioned</h2>
          <p className="text-neutral-500 font-medium text-sm">Transferring identity to auth terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6 font-sans">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-2 duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)]"></div>
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="p-5 bg-blue-600/10 rounded-3xl mb-6 shadow-inner">
            <UserPlus className="text-blue-500" size={42} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Identity Registry</h1>
          <p className="text-neutral-500 mt-2 font-medium text-sm">Provision a secure node for your digital footprint.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Institutional Email</label>
            <input 
              type="email" 
              required
              disabled={loading}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-2xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all font-medium disabled:opacity-50"
              placeholder="yousef@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Security Passcode</label>
            <input 
              type="password" 
              required
              disabled={loading}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-2xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all font-medium disabled:opacity-50"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs bg-red-500/5 p-4 rounded-2xl border border-red-500/10 font-bold">
              <ShieldAlert size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Initializing Node...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-10 text-center text-sm font-medium text-neutral-500">
          Already established? <Link to="/login" className="text-blue-500 hover:text-blue-400 font-black transition-colors">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;

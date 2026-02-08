// TEMPORARY QA PAGE — REMOVE BEFORE PRODUCTION
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2, Shield } from 'lucide-react';
import AnimatedLogo from '../components/AnimatedLogo';
import PageTransition from '../components/PageTransition';
import { Toast } from '../lib/toast';
import { api } from '../lib/api';

const TestRegister = () => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'employee' | 'admin'>('employee');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');

    // Client-side access code check
    if (accessCode !== 'SPB2026') {
      setError('Invalid access code.');
      return;
    }

    if (!email || !displayName) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);

    try {
      const data = await api.request('/auth/test-register', {
        method: 'POST',
        body: JSON.stringify({ email, displayName, role, accessCode }),
      });

      if (data.success) {
        Toast.fire({ icon: 'success', title: `Registered as ${data.user.role}` });

        // Full-page redirect so AuthContext.checkAuth() picks up the new session
        setTimeout(() => {
          if (data.user.role === 'admin') {
            window.location.href = '/app';
          } else {
            window.location.href = '/app/employee';
          }
        }, 800);
      } else {
        setError(data.error || 'Registration failed.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
        <div className="w-full max-w-md space-y-10 animate-in fade-in zoom-in duration-500">
          <div className="text-center">
            <AnimatedLogo />
            <p className="text-slate-500 text-sm tracking-wide">Enterprise File Management</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border-2 border-gray-200 p-10">
            {/* QA Warning Banner */}
            <div className="mb-6 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              <span className="text-sm font-medium text-amber-800">QA Testing Only — Not for Production</span>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-1.5">Test Registration</h2>
              <p className="text-sm text-slate-500 leading-relaxed">Create a test account for internal QA</p>
            </div>

            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="qa-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  id="qa-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all text-sm"
                />
              </div>

              {/* Display Name */}
              <div>
                <label htmlFor="qa-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  id="qa-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all text-sm"
                />
              </div>

              {/* Role */}
              <div>
                <label htmlFor="qa-role" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Role
                </label>
                <select
                  id="qa-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'employee' | 'admin')}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all text-sm bg-white"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Access Code */}
              <div>
                <label htmlFor="qa-code" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Access Code
                </label>
                <input
                  id="qa-code"
                  type="password"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter QA access code"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all text-sm"
                />
              </div>

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.02 }}
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-brand/10 focus:ring-2 focus:ring-brand/30 focus:ring-offset-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Registering...' : 'Register & Login'}
              </motion.button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200/60 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Shield size={12} className="text-brand-accent" />
              <span>Internal QA — Protected by Access Code</span>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default TestRegister;

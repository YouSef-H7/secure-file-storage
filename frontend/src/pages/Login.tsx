import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand rounded-xl mb-6 shadow-lg shadow-brand/20">
            <Shield className="text-white fill-current" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-2">SecureStore</h1>
          <p className="text-text-secondary text-sm">Enterprise File Management</p>
        </div>

        <div className="bg-surface rounded-xl shadow-xl shadow-slate-200/50 border border-border p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Welcome back</h2>
            <p className="text-sm text-text-secondary">Please sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-brand/10"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Authenticating...' : 'Sign in using SSO'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border flex items-center justify-center gap-2 text-xs text-text-secondary">
            <Shield size={12} className="text-brand-accent" />
            <span>Protected by Enterprise Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

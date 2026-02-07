import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const LoginPage = () => {
  const [loading, setLoading] = React.useState(false);
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect if already authenticated
  React.useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin') {
        navigate('/app', { replace: true });
      } else if (user.role === 'employee') {
        navigate('/app/employee', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="w-full max-w-md space-y-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand rounded-2xl mb-8 shadow-xl shadow-brand/25">
            <Shield className="text-white fill-current" size={26} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-2">SecureStore</h1>
          <p className="text-slate-500 text-sm tracking-wide">Enterprise File Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-slate-200/80 p-10">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-1.5">Welcome back</h2>
            <p className="text-sm text-slate-500 leading-relaxed">Please sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-brand/10 focus:ring-2 focus:ring-brand/30 focus:ring-offset-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Authenticating...' : 'Sign in using SSO'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200/60 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Shield size={12} className="text-brand-accent" />
            <span>Protected by Enterprise Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

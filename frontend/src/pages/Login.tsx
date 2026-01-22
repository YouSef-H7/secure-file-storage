import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';

/**
 * Login page - redirects to backend OIDC flow
 * Backend handles OAuth redirect to OCI Identity Domain
 */
const LoginPage = () => {
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    // Redirect to backend auth endpoint (backend handles OCI redirect)
    window.location.href = 'http://localhost:3000/auth/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050509] via-[#04040b] to-[#060712] p-6 font-sans">
      <div className="w-full max-w-md bg-[#050510] border border-neutral-900 rounded-[2.5rem] p-10 shadow-[0_32px_90px_rgba(15,23,42,0.85)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_28px_rgba(37,99,235,0.45)]"></div>

        <div className="flex flex-col items-center mb-10 text-center">
          <div className="p-5 bg-blue-500/10 rounded-3xl mb-6 border border-blue-500/15 shadow-[0_16px_40px_rgba(37,99,235,0.25)]">
            <ShieldCheck className="text-blue-400" size={42} />
          </div>
          <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">
            Access Node [BFF OIDC]
          </h1>
          <p className="text-neutral-500 mt-2 font-medium text-sm">
            Authenticate via Oracle Cloud Identity
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold py-4 rounded-2xl transition-all shadow-[0_18px_45px_rgba(37,99,235,0.4)] active:scale-[0.985] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050510]"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Redirecting…' : 'Sign In with OCI'}
          </button>
        </form>

        <p className="mt-10 text-center text-sm font-medium text-neutral-500">
          New to the cluster?{' '}
          <Link
            to="/register"
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            Initialize Identity
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

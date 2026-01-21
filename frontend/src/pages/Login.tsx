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
    <div className="min-h-screen flex items-center justify-center bg-black p-6 font-sans">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]"></div>

        <div className="flex flex-col items-center mb-10 text-center">
          <div className="p-5 bg-blue-600/10 rounded-3xl mb-6 border border-blue-600/10 shadow-inner">
            <ShieldCheck className="text-blue-500" size={42} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
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
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Redirecting…' : 'Sign In with OCI'}
          </button>
        </form>

        <p className="mt-10 text-center text-sm font-medium text-neutral-500">
          New to the cluster?{' '}
          <Link
            to="/register"
            className="text-blue-500 hover:text-blue-400 font-black transition-colors"
          >
            Initialize Identity
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

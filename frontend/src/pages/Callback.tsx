import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Callback page for backend OIDC flow
 * Backend redirects here after successful authentication with session cookie set
 * We simply redirect to /app and let ProtectedLayout verify the session
 */
export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    // Small delay to ensure session cookie is set, then redirect to app
    const timer = setTimeout(() => {
      if (isMounted) {
        navigate("/app", { replace: true });
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050509] via-[#04040b] to-[#060712] px-6">
      <div className="text-center bg-[#050510] border border-neutral-900 rounded-2xl px-8 py-10 shadow-[0_22px_70px_rgba(15,23,42,0.85)]">
        <div className="text-xl font-semibold text-slate-50">Signing you in…</div>
        <div className="text-sm text-neutral-500 mt-2">
          Please wait
        </div>
      </div>
    </div>
  );
}


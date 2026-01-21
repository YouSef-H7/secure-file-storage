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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="text-xl font-semibold">Signing you in…</div>
        <div className="text-sm opacity-70 mt-2">
          Please wait
        </div>
      </div>
    </div>
  );
}


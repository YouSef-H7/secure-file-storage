import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="text-center bg-white rounded-2xl px-8 py-10 shadow-lg border border-slate-200">
        <Loader2 size={32} className="text-slate-400 animate-spin mx-auto mb-4" />
        <div className="text-lg font-semibold text-slate-900">Signing you in…</div>
        <div className="text-sm text-slate-600 mt-2">
          Please wait
        </div>
      </div>
    </div>
  );
}

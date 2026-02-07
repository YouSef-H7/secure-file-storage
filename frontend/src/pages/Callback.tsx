import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function Callback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    (async () => {
      const ok = await checkAuth();
      navigate(ok ? "/app" : "/login", { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] px-6">
      <div className="text-center bg-white rounded-2xl px-8 py-10 shadow-sm border-2 border-gray-200">
        <Loader2 size={28} className="text-brand animate-spin mx-auto mb-4" />
        <div className="text-base font-semibold text-slate-900">Signing you in…</div>
        <div className="text-sm text-slate-400 mt-2">
          Please wait
        </div>
      </div>
    </div>
  );
}

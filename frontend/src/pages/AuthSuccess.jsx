import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function AuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const name = params.get("name");
    const email = params.get("email");
    const role = params.get("role");

    if (token) localStorage.setItem("token", token);
    if (name || email || role) {
      localStorage.setItem("user", JSON.stringify({ name, email, role }));
    }

    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "company") navigate("/company", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="cv-auth-page flex min-h-screen items-center justify-center bg-[#020617] px-6 text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
        <h2 className="text-lg font-semibold text-slate-100">Signing you in...</h2>
        <p className="mt-2 text-sm text-slate-400">Please wait while we finish the secure handoff.</p>
      </div>
    </div>
  );
}

export default AuthSuccess;

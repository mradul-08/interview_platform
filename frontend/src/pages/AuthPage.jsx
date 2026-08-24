/**
 * AuthPage — CodeVerse · Student Login v3.0
 *
 * Single centered card. Student-only (company/admin moved out — not part
 * of this phase). Modern glassmorphism + a lightweight 3D backdrop that
 * matches CodeVerse's actual accent color (tokens.css --accent: #ffa116),
 * not a generic role-colored gradient.
 *
 * Logic: identical API contract as before for student — /api/auth/login,
 * /api/auth/register, Google OAuth, forgot-password + verify-email token
 * flow. Nothing here is faked; every button hits a real endpoint.
 */

import { useEffect, useRef, useMemo, useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Text } from "@react-three/drei";
import {
  Eye, EyeOff, Lock, User, Mail,
  CheckCircle2, XCircle, ArrowRight,
} from "lucide-react";
import api from "../api/api";

/* ── Theme (pulled from tokens.css, not a made-up role palette) ───── */
const THEME = {
  primary: "#ffa116",
  secondary: "#ffb84d",
  glow: "rgba(255,161,22,0.32)",
  glowStrong: "rgba(255,161,22,0.55)",
  bg: "rgba(255,161,22,0.07)",
  border: "rgba(255,161,22,0.25)",
  text: "#ffd699",
  grad: "linear-gradient(135deg, #ff9800 0%, #ffa116 100%)",
  orb1: "#c2660a",
  orb2: "#7a3b06",
};

/* ── Zod schema — student only ──────────────────────────────────── */
const authSchema = z
  .object({
    mode: z.enum(["signin", "signup"]),
    identifier: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    fullName: z.string().optional(),
    username: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "signin") {
      if (!data.identifier?.trim())
        ctx.addIssue({ code: "custom", path: ["identifier"], message: "Email or username required." });
      if (!data.password?.trim())
        ctx.addIssue({ code: "custom", path: ["password"], message: "Password required." });
    } else {
      if (!data.fullName?.trim())
        ctx.addIssue({ code: "custom", path: ["fullName"], message: "Full name required." });
      if (!data.username?.trim())
        ctx.addIssue({ code: "custom", path: ["username"], message: "Username required." });
      if (!data.email?.trim())
        ctx.addIssue({ code: "custom", path: ["email"], message: "Email required." });
      if (!data.password?.trim())
        ctx.addIssue({ code: "custom", path: ["password"], message: "Password required." });
      if (data.password && data.confirmPassword && data.password !== data.confirmPassword)
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords don't match." });
    }
  });

/* ── 3D Background: floating code particles + glowing orbs ────────── */
const CODE_SNIPPETS = [
  "</>", "{ }", "[ ]", "O(log n)", "async", "await", "npm i", "return",
  "for()", "=>", "===", "n+1", "0x", "func()",
];

function CodeParticle({ position, text, color, speed, size }) {
  const meshRef = useRef();
  const t = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    t.current += delta * speed;
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(t.current) * 0.6;
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.z = Math.sin(t.current * 0.5) * 0.15;
    }
  });

  return (
    <Text
      ref={meshRef}
      position={position}
      fontSize={size * 0.24}
      color={color}
      fillOpacity={0.72}
      anchorX="center"
      anchorY="middle"
      outlineColor="#120b05"
      outlineWidth={0.018}
    >
      {text}
    </Text>
  );
}

function FloatingOrb({ position, color, scale, speed, distort }) {
  return (
    <Float speed={speed} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh position={position} scale={scale}>
          <sphereGeometry args={[1, 24, 24]} />
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={distort}
          speed={2}
          roughness={0.15}
          metalness={0.7}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.42}
        />
        <mesh scale={1.015}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={THEME.secondary} transparent opacity={0.1} wireframe />
        </mesh>
      </mesh>
    </Float>
  );
}

function Scene3D() {
  const particleCount = typeof window !== "undefined" && window.innerWidth <= 640 ? 10 : 18;
  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        text: CODE_SNIPPETS[i % CODE_SNIPPETS.length],
        position: [
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 6 - 4,
        ],
        color: i % 3 === 0 ? THEME.primary : i % 3 === 1 ? THEME.secondary : "#9a6125",
        speed: 0.3 + Math.random() * 0.4,
        size: 0.8 + Math.random() * 1.1,
      })),
    [particleCount]
  );

  return (
    <>
      <fog attach="fog" args={["#151515", 10, 24]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[5, 5, 3]} intensity={2.4} color={THEME.primary} />
      <pointLight position={[-5, -3, 3]} intensity={0.9} color={THEME.secondary} />

      <FloatingOrb position={[-7, 2.4, -8]} color={THEME.orb1} scale={1.75} speed={1.4} distort={0.35} />
      <FloatingOrb position={[7, -2.4, -9]} color={THEME.orb2} scale={1.25} speed={1.9} distort={0.42} />
      <FloatingOrb position={[6, 3.4, -10]} color={THEME.primary} scale={0.62} speed={2.2} distort={0.25} />

      {particles.map((p) => (
        <CodeParticle key={p.id} {...p} />
      ))}
    </>
  );
}

/* ── Toast ───────────────────────────────────────────────────────── */
function Toast({ toast, onDismiss }) {
  const isError = toast.type === "error";
  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-start gap-3 min-w-[280px] max-w-sm rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur-xl"
      style={{
        background: isError ? "rgba(220,38,38,0.14)" : "rgba(74,222,170,0.14)",
        borderColor: isError ? "rgba(220,38,38,0.3)" : "rgba(74,222,170,0.3)",
      }}
    >
      {isError ? (
        <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
      ) : (
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
      )}
      <p className="text-sm leading-5 flex-1" style={{ color: isError ? "#fca5a5" : "#9beac2" }}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity mt-0.5"
      >
        ×
      </button>
    </motion.div>
  );
}

/* ── Field + Input ───────────────────────────────────────────────── */
function Field({ label, icon: Icon, error, children }) {
  return (
    <div style={{ display: "flex", minWidth: 0, flexDirection: "column", gap: 8 }}>
      <label
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest"
        style={{ color: "rgba(255,220,170,0.82)" }}
      >
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-400">
          <XCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

function Input({ className = "", ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = props.type === "password";
  return (
    <div className="relative">
      <input
        {...props}
        type={isPassword && show ? "text" : props.type}
        className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 ${isPassword ? "pr-11" : ""}
          border bg-white/[0.04] text-slate-100 placeholder:text-slate-500
          focus:bg-white/[0.07] ${className}`}
        style={{ borderColor: "rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.025)" }}
        onFocus={(e) => { e.target.style.borderColor = THEME.primary; e.target.style.boxShadow = `0 0 0 3px ${THEME.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`; e.target.style.background = "rgba(255,161,22,0.06)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.025)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [support, setSupport] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loadingAction, setLoadingAction] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: {
      mode: "signin",
      identifier: "", email: "", password: "", confirmPassword: "",
      fullName: "", username: "",
    },
  });

  useEffect(() => {
    setValue("mode", mode, { shouldValidate: false });
  }, [mode, setValue]);

  const pushToast = (type, message) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  };

  const startOAuth = async () => {
    setLoadingAction("google");
    try {
      await api.get(`/api/auth/set-role?role=student`);
    } catch {
      /* OAuth redirect remains the source of truth. */
    }
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/auth/google`;
  };

  const onSubmit = async (data) => {
    setLoadingAction("submit");
    try {
      if (mode === "signin") {
        const payload = { identifier: data.identifier, email: data.identifier, password: data.password, role: "student" };
        const res = await api.post("/api/auth/login", payload);
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        pushToast("success", res.data.message || "Logged in!");
        navigate("/dashboard");
        return;
      }
      const payload = {
        role: "student",
        fullName: data.fullName,
        name: data.fullName,
        username: data.username,
        email: data.email,
        password: data.password,
      };
      const reg = await api.post("/api/auth/register", payload);
      pushToast("success", reg.data.message || "Account created!");
      const loginRes = await api.post("/api/auth/login", {
        identifier: data.email, email: data.email, password: data.password, role: "student",
      });
      localStorage.setItem("token", loginRes.data.token);
      localStorage.setItem("user", JSON.stringify(loginRes.data.user));
      navigate("/dashboard");
    } catch (err) {
      pushToast("error", err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoadingAction("");
    }
  };

  const requestUserToken = async (kind) => {
    const email = (watch("email") || watch("identifier") || "").trim();
    if (!email) {
      pushToast("error", "Enter your email first.");
      return;
    }
    setLoadingAction(kind);
    try {
      const endpoint = kind === "verify" ? "/api/auth/request-verification" : "/api/auth/request-password-reset";
      const res = await api.post(endpoint, { email });
      const token = res.data?.verificationToken || res.data?.resetToken || "";
      setSupport({ kind: kind === "verify" ? "verify" : "password", email, token });
      pushToast("success", token ? `Dev token: ${token}` : res.data?.message || "Token sent.");
    } catch (err) {
      pushToast("error", err.response?.data?.message || "Unable to generate token.");
    } finally {
      setLoadingAction("");
    }
  };

  const submitSupport = async (e) => {
    e.preventDefault();
    if (!support) return;
    const fd = new FormData(e.currentTarget);
    const token = String(fd.get("token") || support.token || "").trim();
    const newPassword = String(fd.get("newPassword") || "").trim();
    setLoadingAction("support");
    try {
      if (support.kind === "verify") {
        const res = await api.post("/api/auth/verify-email", { email: support.email, token });
        pushToast("success", res.data?.message || "Email verified.");
      } else {
        const res = await api.post("/api/auth/reset-password", { email: support.email, token, newPassword });
        pushToast("success", res.data?.message || "Password reset complete.");
      }
      setSupport(null);
    } catch (err) {
      pushToast("error", err.response?.data?.message || "Action failed.");
    } finally {
      setLoadingAction("");
    }
  };

  const loading = isSubmitting || Boolean(loadingAction);

  return (
    <div
      className="relative flex min-h-screen items-start justify-center overflow-x-hidden overflow-y-auto bg-[#1a1a1a] px-4 py-8 text-white sm:py-10"
      style={{ minHeight: "100svh", padding: "clamp(16px, 4vw, 40px) clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}
    >
      {/* Toast stack */}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={(id) => setToasts((prev) => prev.filter((x) => x.id !== id))} />
          ))}
        </AnimatePresence>
      </div>

      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 10], fov: 55 }} dpr={[1, 1.25]}>
            <Scene3D />
          </Canvas>
        </Suspense>
      </div>

      {/* Ambient glow + vignette */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 55% at 50% 40%, ${THEME.glow}, transparent 60%),
                       linear-gradient(to bottom, rgba(26,26,26,0.35) 0%, rgba(26,26,26,0.9) 100%)`,
        }}
      />
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-30"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Card */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-[420px] rounded-3xl border backdrop-blur-2xl shadow-2xl"
        style={{
          width: "100%",
          maxWidth: "min(420px, 100%)",
          boxSizing: "border-box",
          margin: "0 auto",
          overflow: "hidden",
          borderRadius: 28,
          background: "rgba(20,20,20,0.82)",
          borderColor: "rgba(255,161,22,0.18)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: `0 0 0 1px rgba(255,161,22,0.05), 0 32px 80px rgba(0,0,0,0.72), 0 0 60px ${THEME.glow}`,
        }}
      >
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${THEME.primary}, transparent)`, opacity: 0.9 }} />
        <div className="p-6 sm:p-8" style={{ display: "flex", flexDirection: "column", gap: "clamp(18px, 3vw, 24px)" }}>
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="relative flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "#080d20", border: "1px solid rgba(255,161,22,0.35)", boxShadow: `0 0 24px ${THEME.glow}`, overflow: "hidden" }}
            >
              <img src="/branding/codeverse-favicon.png" alt="CodeVerse logo" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight text-white">CodeVerse</p>
              <p className="mt-1 text-xs text-slate-400">Grind smarter. Interview better.</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div
            className="flex rounded-xl border p-1"
            style={{ borderColor: "rgba(255,161,22,0.2)", background: "rgba(255,255,255,0.035)" }}
          >
            {["signin", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200"
                style={{
                  background: mode === m ? THEME.grad : "transparent",
                  color: mode === m ? "#1a1a1a" : "#8a8a8a",
                }}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <input type="hidden" {...register("mode")} />
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit(onSubmit)}
              className=""
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {mode === "signup" && (
                <>
                  <Field label="Full Name" icon={User} error={errors.fullName?.message}>
                    <Input placeholder="Your name" {...register("fullName")} />
                  </Field>
                  <Field label="Username" error={errors.username?.message}>
                    <Input placeholder="Pick a username" {...register("username")} />
                  </Field>
                  <Field label="Email" icon={Mail} error={errors.email?.message}>
                    <Input type="email" placeholder="you@example.com" {...register("email")} />
                  </Field>
                </>
              )}

              {mode === "signin" && (
                <Field label="Email or Username" icon={User} error={errors.identifier?.message}>
                  <Input placeholder="you@example.com or username" {...register("identifier")} />
                </Field>
              )}

              {mode === "signin" ? (
                <Field label="Password" icon={Lock} error={errors.password?.message}>
                  <Input type="password" placeholder="Enter password" {...register("password")} />
                </Field>
              ) : (
                <div className="grid min-w-0 grid-cols-1 gap-3">
                  <Field label="Password" icon={Lock} error={errors.password?.message}>
                    <Input type="password" placeholder="Create password" {...register("password")} />
                  </Field>
                  <Field label="Confirm" error={errors.confirmPassword?.message}>
                    <Input type="password" placeholder="Repeat password" {...register("confirmPassword")} />
                  </Field>
                </div>
              )}

              {/* OAuth */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">or</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
              </div>
              <button
                type="button"
                onClick={startOAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl border py-3 text-sm font-semibold text-slate-300 transition-all duration-200 hover:text-white disabled:opacity-50"
                style={{ borderColor: "rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.92)", color: "#202020" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.primary; e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = `0 0 22px ${THEME.glow}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"; e.currentTarget.style.background = "rgba(255,255,255,0.92)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: THEME.grad, boxShadow: `0 0 28px ${THEME.glow}, 0 4px 12px rgba(0,0,0,0.4)`, color: "#1a1a1a" }}
              >
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    {mode === "signin" ? "Enter Dashboard" : "Create Account"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Support actions */}
          <div className="grid grid-cols-2 gap-2" style={{ gap: 10 }}>
            <button
              type="button"
              onClick={() => requestUserToken("password")}
              disabled={loading}
              className="rounded-xl border py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-all duration-200 hover:border-white/20 disabled:opacity-40"
              style={{ minHeight: 52, borderColor: "rgba(255,161,22,0.16)", background: "rgba(255,161,22,0.035)", color: "#ad8b5d", fontSize: 10, lineHeight: 1.25, letterSpacing: "0.1em" }}
            >
              Forgot password
            </button>
            <button
              type="button"
              onClick={() => requestUserToken("verify")}
              disabled={loading}
              className="rounded-xl border py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-all duration-200 hover:border-white/20 disabled:opacity-40"
              style={{ minHeight: 52, borderColor: "rgba(255,161,22,0.16)", background: "rgba(255,161,22,0.035)", color: "#ad8b5d", fontSize: 10, lineHeight: 1.25, letterSpacing: "0.1em" }}
            >
              Verify email
            </button>
          </div>

          {/* Support panel */}
          <AnimatePresence>
            {support && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
                onSubmit={submitSupport}
              >
                <div
                  className="rounded-2xl border p-4 space-y-3 mt-1"
                  style={{ borderColor: THEME.border, background: THEME.bg }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: THEME.primary }}>
                      {support.kind === "verify" ? "Verify Email" : "Reset Password"}
                    </p>
                    <button type="button" onClick={() => setSupport(null)} className="text-slate-500 hover:text-slate-300 text-xs">
                      ✕
                    </button>
                  </div>
                  <Field label="Token">
                    <Input name="token" placeholder="Paste token" defaultValue={support.token || ""} />
                  </Field>
                  {support.kind !== "verify" && (
                    <Field label="New Password">
                      <Input name="newPassword" type="password" placeholder="New password" />
                    </Field>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl py-2.5 text-sm font-bold transition-all duration-200"
                    style={{ background: THEME.grad, color: "#1a1a1a", opacity: loading ? 0.6 : 1 }}
                  >
                    {loading ? "Working..." : "Submit"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-[10px] leading-4 text-slate-600">
            Your dashboard loads automatically after a successful login.
          </p>
        </div>

        {/* Card bottom glow */}
        <div
          className="h-px rounded-b-3xl w-full"
          style={{ background: `linear-gradient(to right, transparent, ${THEME.border}, transparent)` }}
        />
      </motion.div>
    </div>
  );
}

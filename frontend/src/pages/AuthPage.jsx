/**
 * AuthPage — CodeVerse
 *
 * Redesign notes:
 * - All original logic is untouched: zod schema, react-hook-form wiring, every
 *   API call (login/register/OAuth/admin-reset/verify/forgot-password), toast
 *   system, and role-based redirects work exactly as before.
 * - New: an interactive 3D role-constellation (React Three Fiber) that reacts
 *   to whichever role is selected, and a dashboard-explainer panel pulling
 *   real feature content from the CodeVerse spec (DSA sheets, mock rooms,
 *   candidate pipeline, admin console) so the page also sells the product,
 *   not just the form.
 *
 * Deps used beyond the original file (install if missing):
 *   npm i framer-motion @react-three/fiber @react-three/drei lucide-react
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import {
  GraduationCap,
  Building2,
  ShieldCheck,
  Code2,
  ListChecks,
  Video,
  Users,
  Search,
  ClipboardList,
  Kanban,
  Database,
  BarChart3,
  LogIn,
  ChevronRight,
} from "lucide-react";
import api from "../api/api";

/* ------------------------------------------------------------------ */
/* Role content — grounded in the actual CodeVerse feature spec        */
/* ------------------------------------------------------------------ */

const roleMeta = {
  student: {
    title: "Student",
    badge: "Open access",
    icon: GraduationCap,
    description:
      "Create an account instantly and enter the student dashboard with email, username, or OAuth.",
    pitch:
      "Practice like LeetCode, mock-interview like Pramp, and stay accountable with people who are grinding the same sheet as you.",
    features: [
      { icon: Code2, title: "Coding practice", desc: "Judge0-backed editor across C++, Java, Python, and JS with instant verdicts." },
      { icon: ListChecks, title: "DSA sheets", desc: "Track progress through Genesis 75, Ascend Sheet, and company-tagged sets." },
      { icon: Video, title: "Mock interview rooms", desc: "Peer rooms with a shared editor, webcam, and a scored evaluation form." },
      { icon: Users, title: "Networking & streaks", desc: "Connect with peers and keep a shared daily streak alive." },
    ],
  },
  company: {
    title: "Company",
    badge: "Business verified",
    icon: Building2,
    description:
      "Register with official business details and activate immediately after validation.",
    pitch:
      "Source and screen candidates the way a hiring team actually works — discovery, assessments, live rounds, one pipeline.",
    features: [
      { icon: Search, title: "Candidate discovery", desc: "Filter by skills, college, DSA score, and rank to shortlist fast." },
      { icon: ClipboardList, title: "Assessments", desc: "Create timed coding assessments and review ranked submissions." },
      { icon: Video, title: "Interview rooms", desc: "Run live technical rounds with screen share and a shared code editor." },
      { icon: Kanban, title: "Pipeline tracking", desc: "Move candidates from Applied through Selected in one dashboard." },
    ],
  },
  admin: {
    title: "Admin",
    badge: "Mailbox locked",
    icon: ShieldCheck,
    description:
      "Only the approved mailbox can request a reset or use the private key to enter.",
    pitch:
      "Full editorial and platform control, locked behind a private key and a mailbox nobody else can touch.",
    features: [
      { icon: Database, title: "Content control", desc: "Add, edit, or retire problems, test cases, and DSA sheets." },
      { icon: ShieldCheck, title: "Key-protected login", desc: "Restricted mailbox plus a private key — no public signup path." },
      { icon: BarChart3, title: "Platform oversight", desc: "Watch leaderboards, reports, and company activity from one console." },
    ],
  },
};

const ACCENT = {
  student: {
    ring: "border-cyan-300/40",
    glow: "shadow-[0_0_0_1px_rgba(103,232,249,0.18)]",
    bg: "bg-cyan-300/10",
    text: "text-cyan-100",
    softText: "text-cyan-200/70",
    dot: "bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.9)]",
    chip: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    grad: "from-cyan-300 via-sky-400 to-indigo-400",
    hex: "#67e8f9",
  },
  company: {
    ring: "border-violet-300/40",
    glow: "shadow-[0_0_0_1px_rgba(196,181,253,0.18)]",
    bg: "bg-violet-300/10",
    text: "text-violet-100",
    softText: "text-violet-200/70",
    dot: "bg-violet-300 shadow-[0_0_20px_rgba(196,181,253,0.9)]",
    chip: "border-violet-300/20 bg-violet-300/10 text-violet-100",
    grad: "from-violet-300 via-fuchsia-400 to-indigo-400",
    hex: "#c4b5fd",
  },
  admin: {
    ring: "border-amber-300/40",
    glow: "shadow-[0_0_0_1px_rgba(252,211,77,0.18)]",
    bg: "bg-amber-300/10",
    text: "text-amber-100",
    softText: "text-amber-200/70",
    dot: "bg-amber-300 shadow-[0_0_20px_rgba(252,211,77,0.9)]",
    chip: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    grad: "from-amber-300 via-orange-400 to-rose-400",
    hex: "#fcd34d",
  },
};

/* ------------------------------------------------------------------ */
/* Schema — unchanged from the original implementation                */
/* ------------------------------------------------------------------ */

const authSchema = z
  .object({
    role: z.enum(["student", "company", "admin"]),
    mode: z.enum(["signin", "signup"]),
    identifier: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    fullName: z.string().optional(),
    username: z.string().optional(),
    companyName: z.string().optional(),
    officialEmail: z.string().optional(),
    website: z.string().optional(),
    linkedinPage: z.string().optional(),
    registrationNumber: z.string().optional(),
    hrName: z.string().optional(),
    hrEmail: z.string().optional(),
    companyLogo: z.string().optional(),
    privateKey: z.string().optional(),
    resetToken: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "signin") {
      if (data.role === "student" && !data.identifier?.trim()) {
        ctx.addIssue({ code: "custom", path: ["identifier"], message: "Email or username is required." });
      }
      if (data.role === "company" && !data.email?.trim()) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "Official email is required." });
      }
      if (data.role === "admin") {
        if (!data.email?.trim()) ctx.addIssue({ code: "custom", path: ["email"], message: "Admin email is required." });
        if (!data.privateKey?.trim()) ctx.addIssue({ code: "custom", path: ["privateKey"], message: "Private key is required." });
      }
      if (!data.password?.trim() && data.role !== "admin") {
        ctx.addIssue({ code: "custom", path: ["password"], message: "Password is required." });
      }
    }

    if (data.mode === "signup") {
      if (data.role === "student") {
        if (!data.fullName?.trim()) ctx.addIssue({ code: "custom", path: ["fullName"], message: "Full name is required." });
        if (!data.username?.trim()) ctx.addIssue({ code: "custom", path: ["username"], message: "Username is required." });
        if (!data.email?.trim()) ctx.addIssue({ code: "custom", path: ["email"], message: "Email is required." });
        if (!data.password?.trim()) ctx.addIssue({ code: "custom", path: ["password"], message: "Password is required." });
      }

      if (data.role === "company") {
        ["companyName", "officialEmail", "website", "linkedinPage", "registrationNumber", "hrName", "hrEmail", "password"].forEach(
          (field) => {
            if (!data[field]?.trim()) ctx.addIssue({ code: "custom", path: [field], message: "This field is required." });
          }
        );
      }

      if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
      }
    }
  });

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:bg-white/8";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* 3D role constellation — signature visual element                    */
/* ------------------------------------------------------------------ */

function ConstellationNodes({ activeRole }) {
  const groupRef = useRef();

  const nodes = useMemo(() => {
    const clusters = ["student", "company", "admin"];
    const pts = [];
    clusters.forEach((cluster, ci) => {
      const angleOffset = (ci / clusters.length) * Math.PI * 2;
      for (let i = 0; i < 14; i += 1) {
        const r = 1.5 + Math.random() * 0.9;
        const theta = angleOffset + (Math.random() - 0.5) * 1.5;
        const phi = Math.random() * Math.PI;
        pts.push({
          cluster,
          position: [
            r * Math.sin(phi) * Math.cos(theta),
            (Math.random() - 0.5) * 2.1,
            r * Math.sin(phi) * Math.sin(theta),
          ],
        });
      }
    });
    return pts;
  }, []);

  const edges = useMemo(() => {
    const lines = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        if (nodes[i].cluster !== nodes[j].cluster) continue;
        const [ax, ay, az] = nodes[i].position;
        const [bx, by, bz] = nodes[j].position;
        const dist = Math.hypot(ax - bx, ay - by, az - bz);
        if (dist < 1.05) lines.push({ points: [nodes[i].position, nodes[j].position], cluster: nodes[i].cluster });
      }
    }
    return lines;
  }, [nodes]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.14;
  });

  return (
    <group ref={groupRef}>
      {edges.map((edge, i) => (
        <Line
          key={i}
          points={edge.points}
          color={edge.cluster === activeRole ? ACCENT[edge.cluster].hex : "#1e293b"}
          transparent
          opacity={edge.cluster === activeRole ? 0.55 : 0.2}
          lineWidth={1}
        />
      ))}
      {nodes.map((n, i) => (
        <mesh key={i} position={n.position}>
          <sphereGeometry args={[n.cluster === activeRole ? 0.06 : 0.035, 12, 12]} />
          <meshBasicMaterial
            color={ACCENT[n.cluster].hex}
            transparent
            opacity={n.cluster === activeRole ? 1 : 0.28}
          />
        </mesh>
      ))}
    </group>
  );
}

function RoleConstellation({ activeRole }) {
  return (
    <div className="relative h-[260px] w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent">
      <Canvas camera={{ position: [0, 0, 5], fov: 48 }}>
        <ambientLight intensity={0.9} />
        <ConstellationNodes activeRole={activeRole} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[#03050d] to-transparent px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
        <span>node_map.render()</span>
        <span className={ACCENT[activeRole].softText}>{activeRole}.cluster</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function TerminalEyebrow({ role }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 font-mono text-[11px] text-slate-400">
      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
      <span>$ codeverse access --role={role}</span>
    </div>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed right-4 top-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cx(
            "min-w-[280px] max-w-sm rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur",
            toast.type === "error"
              ? "border-rose-400/20 bg-rose-500/15 text-rose-100"
              : "border-emerald-400/20 bg-emerald-500/15 text-emerald-100"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm leading-5">{toast.message}</p>
            <button type="button" className="text-xs uppercase tracking-[0.18em] text-white/60" onClick={() => onDismiss(toast.id)}>
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleCard({ role, active, onClick }) {
  const meta = roleMeta[role];
  const accent = ACCENT[role];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-3xl border p-4 text-left transition",
        active ? cx(accent.ring, accent.bg, accent.glow) : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/7"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cx("flex h-8 w-8 items-center justify-center rounded-xl border", active ? accent.ring : "border-white/10 bg-white/5")}>
            <Icon className={cx("h-4 w-4", active ? accent.text : "text-slate-400")} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-100">{meta.title}</p>
            <p className={cx("mt-0.5 text-[10px] uppercase tracking-[0.18em]", active ? accent.softText : "text-slate-500")}>{meta.badge}</p>
          </div>
        </div>
        <div className={cx("h-3 w-3 rounded-full", active ? accent.dot : "bg-slate-600")} />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-300">{meta.description}</p>
    </button>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-[11px] leading-4 text-slate-500">{hint}</span> : null}
      {error ? <span className="mt-2 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

function FeatureGrid({ role }) {
  const meta = roleMeta[role];
  const accent = ACCENT[role];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={role}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="grid gap-3 sm:grid-cols-2"
      >
        {meta.features.map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <div
              key={feature.title}
              className="group rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-cyan-950/10 backdrop-blur transition hover:border-white/20 hover:bg-white/7"
            >
              <span className={cx("flex h-8 w-8 items-center justify-center rounded-xl border", accent.ring, accent.bg)}>
                <FeatureIcon className={cx("h-4 w-4", accent.text)} />
              </span>
              <p className="mt-3 text-sm font-semibold text-white">{feature.title}</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-400">{feature.desc}</p>
            </div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function AuthPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [mode, setMode] = useState("signin");
  const [support, setSupport] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loadingAction, setLoadingAction] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: {
      role: "student",
      mode: "signin",
      identifier: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      username: "",
      companyName: "",
      officialEmail: "",
      website: "",
      linkedinPage: "",
      registrationNumber: "",
      hrName: "",
      hrEmail: "",
      companyLogo: "",
      privateKey: "",
      resetToken: "",
      newPassword: "",
    },
  });

  const currentRole = watch("role");
  const currentMode = watch("mode");
  const selectedRole = useMemo(() => roleMeta[currentRole], [currentRole]);
  const accent = ACCENT[currentRole];

  useEffect(() => {
    setValue("role", role, { shouldDirty: false, shouldTouch: false, shouldValidate: true });
    setValue("mode", mode, { shouldDirty: false, shouldTouch: false, shouldValidate: true });
  }, [mode, role, setValue]);

  const pushToast = (type, message) => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => setToasts((items) => items.filter((item) => item.id !== id));

  const redirectByRole = (userRole) => {
    if (userRole === "admin") navigate("/admin");
    else if (userRole === "company") navigate("/company");
    else {
      navigate("/dashboard");
    }
  };

  const startOAuth = async (provider) => {
    setLoadingAction(provider);
    try {
      await api.get(`/api/auth/set-role?role=${role}`);
    } catch {
      // non-blocking
    }
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/auth/${provider}`;
  };

  const onSubmit = async (data) => {
    setLoadingAction("submit");
    try {
      if (data.mode === "signin") {
        const payload =
          data.role === "student"
            ? { identifier: data.identifier, email: data.identifier, password: data.password, role: data.role }
            : data.role === "company"
              ? { email: data.email, identifier: data.email, password: data.password, role: data.role }
              : { email: data.email, password: data.privateKey, role: "admin" };

        const res = await api.post("/api/auth/login", payload);
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        pushToast("success", res.data.message || "Logged in successfully.");
        redirectByRole(res.data.user.role);
        return;
      }

      const payload =
        data.role === "student"
          ? {
              role: "student",
              fullName: data.fullName,
              name: data.fullName,
              username: data.username,
              email: data.email,
              password: data.password,
            }
          : {
              role: "company",
              companyName: data.companyName,
              officialEmail: data.officialEmail,
              email: data.officialEmail,
              password: data.password,
              website: data.website,
              linkedinPage: data.linkedinPage,
              companyWebsite: data.website,
              companyLinkedinUrl: data.linkedinPage,
              registrationNumber: data.registrationNumber,
              hrName: data.hrName,
              hrEmail: data.hrEmail,
              companyLogo: data.companyLogo,
              companyVerificationNotes: "",
              companyIndustry: "",
            };

      const registerRes = await api.post("/api/auth/register", payload);
      pushToast("success", registerRes.data.message || "Account created successfully.");

      const loginPayload =
        data.role === "student"
          ? { identifier: data.email, email: data.email, password: data.password, role: "student" }
          : { identifier: data.officialEmail, email: data.officialEmail, password: data.password, role: "company" };
      const loginRes = await api.post("/api/auth/login", loginPayload);
      localStorage.setItem("token", loginRes.data.token);
      localStorage.setItem("user", JSON.stringify(loginRes.data.user));
      redirectByRole(loginRes.data.user.role);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (data.role === "admin" ? "Admin login failed." : "Something went wrong.");
      pushToast("error", message);
    } finally {
      setLoadingAction("");
    }
  };

  const requestReset = async () => {
    const email = watch("email");
    if (!email?.trim()) {
      pushToast("error", "Enter the admin email first.");
      return;
    }
    setLoadingAction("admin-reset");
    try {
      const res = await api.post("/api/auth/admin/request-reset", { email });
      pushToast("success", res.data?.resetToken ? `Reset token: ${res.data.resetToken}` : res.data?.message || "Reset token requested.");
      setSupport({ kind: "admin-reset", token: res.data?.resetToken || "", email });
    } catch (error) {
      pushToast("error", error.response?.data?.message || "Unable to request reset.");
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
      pushToast("success", token ? `Dev token: ${token}` : res.data?.message || "Token requested.");
    } catch (error) {
      pushToast("error", error.response?.data?.message || "Unable to generate token.");
    } finally {
      setLoadingAction("");
    }
  };

  const submitSupport = async (event) => {
    event.preventDefault();
    if (!support) return;
    const formData = new FormData(event.currentTarget);
    const token = String(formData.get("token") || support.token || "").trim();
    const newPassword = String(formData.get("newPassword") || "").trim();
    setLoadingAction("support");
    try {
      if (support.kind === "admin-reset") {
        const res = await api.post("/api/auth/admin/reset-password", {
          email: support.email,
          token,
          newPassword,
        });
        pushToast("success", res.data?.message || "Admin password updated.");
      } else if (support.kind === "verify") {
        const res = await api.post("/api/auth/verify-email", { email: support.email, token });
        pushToast("success", res.data?.message || "Email verified.");
      } else if (support.kind === "password") {
        const res = await api.post("/api/auth/reset-password", { email: support.email, token, newPassword });
        pushToast("success", res.data?.message || "Password reset complete.");
      }
      setSupport(null);
    } catch (error) {
      pushToast("error", error.response?.data?.message || "Action failed.");
    } finally {
      setLoadingAction("");
    }
  };

  const loading = isSubmitting || Boolean(loadingAction);
  const isStudent = currentRole === "student";
  const isCompany = currentRole === "company";
  const isAdmin = currentRole === "admin";

  return (
    <div className="cv-auth-page min-h-screen overflow-hidden bg-[#03050d] text-white">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.20),transparent_32%),linear-gradient(135deg,#03050d_0%,#06091a_50%,#020617_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex items-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="max-w-2xl">
            <TerminalEyebrow role={role} />

            <h1 className="mt-6 text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl">
              One console for prep, mocks, and hiring.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              CodeVerse folds the tools you'd normally split across a coding judge, a mock-interview site, and a networking feed
              into one platform — students grind and connect, companies discover and screen, admins keep the content honest.
            </p>

            {/* Role-linked pitch, syncs with the console on the right */}
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className={cx("mt-6 flex items-start gap-3 rounded-2xl border p-4", ACCENT[role].ring, ACCENT[role].bg)}
              >
                {(() => {
                  const RoleIcon = roleMeta[role].icon;
                  return <RoleIcon className={cx("mt-0.5 h-5 w-5 shrink-0", ACCENT[role].text)} />;
                })()}
                <p className="text-sm leading-6 text-slate-200">{roleMeta[role].pitch}</p>
              </motion.div>
            </AnimatePresence>

            {/* Interactive 3D role constellation */}
            <div className="mt-6">
              <RoleConstellation activeRole={role} />
            </div>

            {/* Dashboard explainer — three fully working roles */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  What the {roleMeta[role].title.toLowerCase()} dashboard does
                </p>
                <div className="flex gap-1.5">
                  {["student", "company", "admin"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={cx(
                        "h-1.5 w-6 rounded-full transition",
                        role === item ? ACCENT[item].dot : "bg-white/10 hover:bg-white/20"
                      )}
                      aria-label={`Preview ${item} dashboard`}
                    />
                  ))}
                </div>
              </div>
              <FeatureGrid role={role} />
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/10 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Why one platform</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Most prep stacks mean juggling a judge-style site for problems, a separate peer-mock tool, and a networking feed
                on the side. CodeVerse keeps the practice, the mock rooms, the connections, and the hiring pipeline under one
                login — with the login gate itself acting as the trust boundary between three genuinely different roles.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center px-6 pb-12 lg:px-8 lg:py-12">
          <div className="w-full rounded-[32px] border border-white/10 bg-slate-950/80 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Role Access Console</p>
                <p className="mt-1 text-xs text-slate-400">Use the right path for your account type.</p>
              </div>
              <div className={cx("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", accent.ring, accent.bg, accent.text)}>
                {selectedRole.title}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["student", "company", "admin"].map((item) => (
                <RoleCard key={item} role={item} active={role === item} onClick={() => setRole(item)} />
              ))}
            </div>

            <div className="mt-6 flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={cx(
                  "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition",
                  mode === "signin" ? cx(accent.bg, accent.text) : "text-slate-400 hover:text-white"
                )}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={cx(
                  "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition",
                  mode === "signup" ? cx(accent.bg, accent.text) : "text-slate-400 hover:text-white"
                )}
              >
                Create account
              </button>
            </div>
            <input type="hidden" {...register("role")} />
            <input type="hidden" {...register("mode")} />

            <AnimatePresence mode="wait">
              <motion.form
                key={`${currentRole}-${currentMode}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-6 space-y-4"
                onSubmit={handleSubmit(onSubmit)}
              >
                {isStudent && currentMode === "signin" ? (
                  <Field label="Email or username" error={errors.identifier?.message}>
                    <input className={inputClass} placeholder="name@example.com or username" {...register("identifier")} />
                  </Field>
                ) : null}

                {isCompany && currentMode === "signin" ? (
                  <Field label="Official email" hint="Business email only." error={errors.email?.message}>
                    <input className={inputClass} placeholder="hr@company.com" {...register("email")} />
                  </Field>
                ) : null}

                {isAdmin && currentMode === "signin" ? (
                  <>
                    <Field label="Admin email" hint="Restricted to mradulgarg2005@gmail.com" error={errors.email?.message}>
                      <input className={inputClass} placeholder="mradulgarg2005@gmail.com" {...register("email")} />
                    </Field>
                    <Field label="Private key" error={errors.privateKey?.message}>
                      <input className={inputClass} type="password" placeholder="Enter private key" {...register("privateKey")} />
                    </Field>
                  </>
                ) : null}

                {currentMode === "signup" && isStudent ? (
                  <>
                    <Field label="Full name" error={errors.fullName?.message}>
                      <input className={inputClass} placeholder="Your full name" {...register("fullName")} />
                    </Field>
                    <Field label="Username" error={errors.username?.message}>
                      <input className={inputClass} placeholder="choose-a-username" {...register("username")} />
                    </Field>
                    <Field label="Email" error={errors.email?.message}>
                      <input className={inputClass} placeholder="name@example.com" {...register("email")} />
                    </Field>
                  </>
                ) : null}

                {currentMode === "signup" && isCompany ? (
                  <>
                    <Field label="Company name" error={errors.companyName?.message}>
                      <input className={inputClass} placeholder="CodeVerse Pvt Ltd" {...register("companyName")} />
                    </Field>
                    <Field label="Official email" error={errors.officialEmail?.message}>
                      <input className={inputClass} placeholder="hr@company.com" {...register("officialEmail")} />
                    </Field>
                    <Field label="Website" error={errors.website?.message}>
                      <input className={inputClass} placeholder="https://company.com" {...register("website")} />
                    </Field>
                    <Field label="LinkedIn page" error={errors.linkedinPage?.message}>
                      <input className={inputClass} placeholder="https://www.linkedin.com/company/..." {...register("linkedinPage")} />
                    </Field>
                    <Field label="Registration number" error={errors.registrationNumber?.message}>
                      <input className={inputClass} placeholder="Registration / GST / CIN" {...register("registrationNumber")} />
                    </Field>
                    <Field label="HR name" error={errors.hrName?.message}>
                      <input className={inputClass} placeholder="HR contact name" {...register("hrName")} />
                    </Field>
                    <Field label="HR email" error={errors.hrEmail?.message}>
                      <input className={inputClass} placeholder="hr@company.com" {...register("hrEmail")} />
                    </Field>
                    <Field label="Company logo URL" error={errors.companyLogo?.message}>
                      <input className={inputClass} placeholder="https://..." {...register("companyLogo")} />
                    </Field>
                  </>
                ) : null}

                {currentMode === "signup" ? (
                  <>
                    <Field label="Password" error={errors.password?.message}>
                      <input className={inputClass} type="password" placeholder="Create password" {...register("password")} />
                    </Field>
                    <Field label="Confirm password" error={errors.confirmPassword?.message}>
                      <input className={inputClass} type="password" placeholder="Repeat password" {...register("confirmPassword")} />
                    </Field>
                  </>
                ) : null}

                {currentMode === "signin" && !isAdmin ? (
                  <Field label="Password" error={errors.password?.message}>
                    <input className={inputClass} type="password" placeholder="Enter password" {...register("password")} />
                  </Field>
                ) : null}

                {currentMode === "signin" && isStudent ? (
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => startOAuth("google")}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      <LogIn className="h-4 w-4" />
                      Continue with Google
                    </button>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className={cx(
                    "flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
                    accent.grad
                  )}
                >
                  {loading ? "Please wait..." : currentMode === "signin" ? "Enter dashboard" : "Create account"}
                  {!loading ? <ChevronRight className="h-4 w-4" /> : null}
                </button>
              </motion.form>
            </AnimatePresence>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={requestReset}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
              >
                Request admin reset token
              </button>
              <button
                type="button"
                onClick={() => requestUserToken("verify")}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/8"
              >
                Verify email
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => requestUserToken("password")}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
              >
                Forgot password
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole((current) => (current === "student" ? "company" : current === "company" ? "admin" : "student"));
                  setMode("signin");
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/8"
              >
                Cycle role
              </button>
            </div>

            {support ? (
              <form className="mt-4 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4" onSubmit={submitSupport}>
                <div className="text-sm font-semibold text-white">
                  {support.kind === "verify" ? "Verify your email" : support.kind === "password" ? "Reset your password" : "Admin reset"}
                </div>
                <div className="text-xs text-slate-400">
                  {support.kind === "verify"
                    ? "Paste the email verification token."
                    : "Use the token sent to your mailbox, then set a new password."}
                </div>
                <Field label="Token">
                  <input className={inputClass} name="token" placeholder="Enter token" defaultValue={support.token || ""} />
                </Field>
                {support.kind !== "verify" ? (
                  <Field label="New password">
                    <input className={inputClass} name="newPassword" type="password" placeholder="New password" />
                  </Field>
                ) : null}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Working..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupport(null)}
                    className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                  >
                    Close
                  </button>
                </div>
              </form>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Student: email, username, Google OAuth</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Company: business email validation</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Admin: private key protected</span>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-slate-500">
              {isAdmin
                ? "Admin access is restricted to the verified mailbox and private key."
                : "Your dashboard will load automatically after a successful login."}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

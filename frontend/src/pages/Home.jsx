


// src/pages/Home.jsx
//
// CodeVerse — Public marketing homepage (v2)
// Stack: React + Vite + React Router + Tailwind CSS + Framer Motion + @react-three/fiber
//
// CHANGES IN THIS PASS (per feedback):
// 1. Copy rewritten from the actual project plan — practice + mock interviews +
//    networking + gamification + company hiring, not a narrow
//    "no fake stats" pitch. Sheet names "Blind 75" / "Striver" removed and
//    replaced with CodeVerse's own original sheet names: "Genesis 75" (foundation
//    set) and "Ascend Sheet" (advanced/company-pattern set).
// 2. Feature cards now carry a faint per-card background motif (a large, soft,
//    semi-transparent glyph behind the content) instead of sitting on flat black,
//    and each icon is unique to what that card actually does.
// 3. Every CTA is auth-aware: logged-in users are routed to the REAL app page
//    that button refers to (e.g. "Browse problems" -> /dashboard/problems).
//    Logged-out users get a small modal asking them to log in first, with a
//    "Go to login" button — nothing silently does nothing or routes wrong.
// 4. The old bottom CTA banner (with its own button) is gone. Replaced with a
//    4-card "why CodeVerse" benefits section, with real gaps between cards.
// 5. Navbar: removed the separate "Sign in" link — "Get started" is the only
//    auth entry point (it already opens the combined sign-in/sign-up page).
//
// Install (if not already present):
//   npm install @react-three/fiber @react-three/drei three framer-motion react-router-dom
//
// Add once to index.html <head> or index.css:
//   @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ──────────────────────────────────────────────────────────────────────────
   AUTH HELPERS — every CTA on this page goes through these two functions so
   behavior is consistent: logged-in -> real app route, logged-out -> prompt.
   ────────────────────────────────────────────────────────────────────────── */
function getAuth() {
  const token = localStorage.getItem("token");
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch { /* malformed local user data is treated as an empty user */ }
  return { loggedIn: !!token, role: user.role };
}

function dashboardHomeFor(role) {
  if (role === "admin") return "/admin";
  if (role === "company") return "/company";
  return "/dashboard";
}

/* ──────────────────────────────────────────────────────────────────────────
   3D SIGNATURE: a binary-tree graph floating in space, edges pulsing with
   light packets — the literal shape of the problems this product teaches.
   ────────────────────────────────────────────────────────────────────────── */
function buildTree(depth = 4) {
  const nodes = [];
  const edges = [];
  const spacingX = 2.6;
  const spacingY = 1.7;

  function place(level, indexInLevel, count, parentIdx) {
    if (level > depth) return;
    const x = (indexInLevel - (count - 1) / 2) * (spacingX / Math.pow(1.55, level));
    const y = (depth / 2 - level) * spacingY;
    const z = (Math.random() - 0.5) * 1.4;
    const idx = nodes.length;
    nodes.push({ pos: [x, y, z], level });
    if (parentIdx !== null) edges.push([parentIdx, idx]);
    if (level < depth) {
      place(level + 1, indexInLevel * 2, count * 2, idx);
      place(level + 1, indexInLevel * 2 + 1, count * 2, idx);
    }
  }
  place(0, 0, 1, null);
  return { nodes, edges };
}

function GraphTree() {
  const groupRef = useRef();
  const { nodes, edges } = useMemo(() => buildTree(4), []);
  const pulses = useRef(
    Array.from({ length: 14 }, () => ({
      edge: edges[Math.floor(Math.random() * edges.length)],
      t: Math.random(),
      speed: 0.12 + Math.random() * 0.16,
    }))
  );
  const pulseRefs = useRef([]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.08;
    }
    pulses.current.forEach((p, i) => {
      p.t += delta * p.speed;
      if (p.t > 1) {
        p.t = 0;
        p.edge = edges[Math.floor(Math.random() * edges.length)];
      }
      const mesh = pulseRefs.current[i];
      if (!mesh) return;
      const a = nodes[p.edge[0]].pos;
      const b = nodes[p.edge[1]].pos;
      mesh.position.set(
        a[0] + (b[0] - a[0]) * p.t,
        a[1] + (b[1] - a[1]) * p.t,
        a[2] + (b[2] - a[2]) * p.t
      );
      const fade = Math.sin(p.t * Math.PI);
      mesh.material.opacity = fade;
    });
  });

  return (
    <group ref={groupRef} position={[1.4, 0, 0]}>
      {edges.map(([a, b], i) => {
        const start = new THREE.Vector3(...nodes[a].pos);
        const end = new THREE.Vector3(...nodes[b].pos);
        const mid = start.clone().lerp(end, 0.5);
        const dir = end.clone().sub(start);
        const len = dir.length();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize()
        );
        return (
          <mesh key={i} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.012, 0.012, len, 6]} />
            <meshBasicMaterial color="#4F46E5" transparent opacity={0.35} />
          </mesh>
        );
      })}

      {nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[n.level === 0 ? 0.14 : 0.08 - n.level * 0.006, 16, 16]} />
          <meshStandardMaterial
            color={n.level % 2 === 0 ? "#22D3EE" : "#6366F1"}
            emissive={n.level % 2 === 0 ? "#22D3EE" : "#6366F1"}
            emissiveIntensity={0.6}
            roughness={0.35}
          />
        </mesh>
      ))}

      {pulses.current.map((_, i) => (
        <mesh key={`pulse-${i}`} ref={(el) => (pulseRefs.current[i] = el)}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color="#F8FAFC" transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}

function HeroScene() {
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 0, 9], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.7} />
        <pointLight position={[5, 5, 5]} intensity={1.1} color="#22D3EE" />
        <pointLight position={[-5, -3, 4]} intensity={0.8} color="#6366F1" />
        <fog attach="fog" args={["#05070D", 8, 18]} />
        <GraphTree />
      </Canvas>
    </div>
  );
}

function AuroraWash() {
  return (
    <>
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[560px] w-[560px] rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-[30%] left-[-15%] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-[110px]" />
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   LOGIN PROMPT MODAL — shown when a logged-out user clicks any app-bound CTA
   ────────────────────────────────────────────────────────────────────────── */
function LoginPromptModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-[20px] border border-white/10 bg-[#0A0D1A] p-7 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-[14px] bg-indigo-500/15 border border-indigo-400/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h3 className="font-display text-[18px] font-semibold text-slate-50">Log in to continue</h3>
            <p className="mt-2 text-[13px] leading-[1.6] text-slate-400">
              This part of CodeVerse lives in your dashboard. Sign in or create a
              free account to keep going.
            </p>
            <Link
              to="/login"
              className="mt-6 block w-full rounded-[12px] bg-gradient-to-r from-indigo-400 to-cyan-300 px-5 py-3 text-[13.5px] font-semibold text-[#05070D] hover:brightness-110 transition-all"
            >
              Go to login →
            </Link>
            <button
              onClick={onClose}
              className="mt-3 w-full text-[12.5px] text-slate-500 hover:text-slate-300 py-1"
            >
              Not now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   NAVBAR — single auth entry point ("Get started"), everything else
   auth-aware via goApp()
   ────────────────────────────────────────────────────────────────────────── */
function Navbar({ goApp }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Problems", path: "/dashboard/problems" },
    { label: "Sheets", path: "/dashboard/sheets" },
    { label: "Leaderboard", path: "/dashboard/leaderboard" },
  ];

  const handleGetStarted = () => {
    const { loggedIn, role } = getAuth();
    navigate(loggedIn ? dashboardHomeFor(role) : "/login");
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#05070D]/85 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8 h-[68px] flex items-center gap-8">
        <a href="#top" className="flex items-center gap-2.5 shrink-0">
          <span className="h-8 w-8 overflow-hidden rounded-[10px] shadow-[0_0_20px_rgba(34,211,238,0.35)]">
            <img src="/branding/codeverse-logo-reference.png" alt="CodeVerse" className="h-full w-full object-cover object-center" />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-slate-50">
            CodeVerse
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-7 mx-auto">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => goApp(l.path)}
              className="text-[13.5px] font-medium text-slate-400 hover:text-slate-100 transition-colors"
            >
              {l.label}
            </button>
          ))}
          <a href="#roadmap" className="text-[13.5px] font-medium text-slate-400 hover:text-slate-100 transition-colors">
            Roadmap
          </a>
        </nav>

        <div className="hidden md:flex items-center shrink-0">
          <button
            onClick={handleGetStarted}
            className="text-[13.5px] font-semibold text-[#05070D] bg-gradient-to-r from-indigo-400 to-cyan-300 rounded-[10px] px-4 py-2.5 shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:brightness-110 transition-all"
          >
            Get started →
          </button>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden ml-auto p-2 text-slate-300"
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
            )}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/[0.06] bg-[#05070D]/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-6 py-5 flex flex-col gap-4">
              {links.map((l) => (
                <button
                  key={l.label}
                  onClick={() => { setOpen(false); goApp(l.path); }}
                  className="text-left text-[14px] font-medium text-slate-300"
                >
                  {l.label}
                </button>
              ))}
              <a href="#roadmap" onClick={() => setOpen(false)} className="text-[14px] font-medium text-slate-300">
                Roadmap
              </a>
              <button
                onClick={() => { setOpen(false); handleGetStarted(); }}
                className="mt-2 text-[14px] font-semibold text-[#05070D] bg-gradient-to-r from-indigo-400 to-cyan-300 rounded-[10px] px-4 py-2.5 text-center"
              >
                Get started →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   HERO
   ────────────────────────────────────────────────────────────────────────── */
function Hero({ goApp }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handleMouse = useCallback(
    (e) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 14);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 10);
    },
    [mouseX, mouseY]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [handleMouse]);

  return (
    <section id="top" className="relative min-h-screen overflow-hidden bg-[#05070D]">
      <AuroraWash />
      <motion.div style={{ x: springX, y: springY }} className="absolute inset-0">
        <HeroScene />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#05070D] via-[#05070D]/85 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 pt-44 pb-28 lg:pt-52 lg:pb-36">
        <div className="max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 mb-7"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-medium tracking-wide text-slate-300 font-mono">
              ONE PLATFORM — PRACTICE, INTERVIEW, NETWORK, GET HIRED
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-[44px] leading-[1.05] sm:text-[56px] font-semibold tracking-tight text-slate-50"
          >
            Think in graphs,
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              ship in interviews.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 text-[16px] leading-[1.7] text-slate-400 max-w-md"
          >
            CodeVerse takes you from your first accepted submission to your next
            offer — coding practice, company-tagged questions, mock interviews,
            peer learning and a hiring pipeline recruiters actually use, all in
            one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <button
              onClick={() => goApp("/dashboard")}
              className="rounded-[12px] bg-gradient-to-r from-indigo-400 to-cyan-300 px-6 py-3.5 text-[14px] font-semibold text-[#05070D] shadow-[0_8px_30px_rgba(99,102,241,0.35)] hover:brightness-110 transition-all"
            >
              Start solving — it's free
            </button>
            <button
              onClick={() => goApp("/dashboard/problems")}
              className="rounded-[12px] border border-white/10 bg-white/[0.02] px-6 py-3.5 text-[14px] font-medium text-slate-200 hover:bg-white/[0.06] transition-colors"
            >
              Browse the problem bank
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11.5px] text-slate-500"
          >
            <span>C++ · Java · Python · JS</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>Genesis 75 seeded</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>Company-tagged questions</span>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500">
        <span className="text-[10.5px] font-mono tracking-widest uppercase">scroll</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STATUS STRIP — honest numbers, no invented social proof
   ────────────────────────────────────────────────────────────────────────── */
function StatusStrip() {
  const items = [
    { label: "DSA topics tracked", value: "21" },
    { label: "Curated sheets", value: "Genesis 75 + Ascend" },
    { label: "Languages supported", value: "4" },
    { label: "Points per Hard problem", value: "30" },
  ];
  return (
    <section className="relative bg-[#05070D] border-y border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {items.map((it, i) => (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="font-mono text-[22px] font-semibold text-slate-50 tracking-tight">{it.value}</div>
            <div className="mt-1 text-[12px] text-slate-500">{it.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   FEATURE CARD BACKGROUND MOTIFS — one large, faint, on-brand glyph per card
   instead of a flat empty panel. Pure SVG, no external images, themed to
   exactly what that card does.
   ────────────────────────────────────────────────────────────────────────── */
const MOTIFS = {
  workbench: (
    <svg viewBox="0 0 200 200" className="absolute -right-6 -bottom-8 h-44 w-44 opacity-[0.07]">
      <rect x="20" y="30" width="160" height="120" rx="10" stroke="#22D3EE" strokeWidth="3" fill="none" />
      <line x1="20" y1="58" x2="180" y2="58" stroke="#22D3EE" strokeWidth="3" />
      <circle cx="38" cy="44" r="4" fill="#22D3EE" />
      <circle cx="52" cy="44" r="4" fill="#22D3EE" />
    </svg>
  ),
  sheet: (
    <svg viewBox="0 0 200 200" className="absolute -right-8 -bottom-8 h-44 w-44 opacity-[0.08]">
      <rect x="40" y="20" width="120" height="160" rx="10" stroke="#6366F1" strokeWidth="3" fill="none" />
      {[50, 75, 100, 125, 150].map((y, i) => (
        <line key={i} x1="58" y1={y} x2={i % 2 ? 130 : 145} y2={y} stroke="#6366F1" strokeWidth="3" />
      ))}
    </svg>
  ),
  company: (
    <svg viewBox="0 0 200 200" className="absolute -right-6 -bottom-10 h-44 w-44 opacity-[0.07]">
      <rect x="40" y="60" width="120" height="110" rx="6" stroke="#22D3EE" strokeWidth="3" fill="none" />
      <rect x="70" y="30" width="60" height="40" rx="4" stroke="#22D3EE" strokeWidth="3" fill="none" />
      <line x1="40" y1="100" x2="160" y2="100" stroke="#22D3EE" strokeWidth="2" />
    </svg>
  ),
  tracking: (
    <svg viewBox="0 0 200 200" className="absolute -right-6 -bottom-6 h-44 w-44 opacity-[0.08]">
      <polyline points="20,150 60,110 95,135 140,70 180,90" fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" />
      <circle cx="140" cy="70" r="5" fill="#6366F1" />
    </svg>
  ),
  streak: (
    <svg viewBox="0 0 200 200" className="absolute -right-8 -bottom-6 h-44 w-44 opacity-[0.08]">
      <path d="M100 30c30 35 45 65 30 95a35 35 0 01-65 0c-7-22 3-40 15-50-2 12 4 20 12 20 10 0 14-8 8-20z" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  ),
  leaderboard: (
    <svg viewBox="0 0 200 200" className="absolute -right-6 -bottom-4 h-44 w-44 opacity-[0.08]">
      <rect x="35" y="110" width="35" height="60" stroke="#22D3EE" strokeWidth="3" fill="none" />
      <rect x="82" y="70" width="35" height="100" stroke="#22D3EE" strokeWidth="3" fill="none" />
      <rect x="129" y="95" width="35" height="75" stroke="#22D3EE" strokeWidth="3" fill="none" />
    </svg>
  ),
};

const FEATURES = [
  {
    title: "Problem workbench",
    desc: "A split-screen coding editor with real starter code in C++, Java, Python and JavaScript — filter by topic, difficulty or company before you even open a problem.",
    motif: "workbench",
    path: "/dashboard/problems",
    icon: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Genesis 75 & Ascend Sheet",
    desc: "Two structured sheets, built in-house for CodeVerse — Genesis 75 for the foundations, the Ascend Sheet once you're past it — tracked against your real accepted submissions.",
    motif: "sheet",
    path: "/dashboard/sheets",
    icon: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Company-tagged questions",
    desc: "Filter the bank by the companies you're actually interviewing with, synced from a continuously updated source so the tags stay current.",
    motif: "company",
    path: "/dashboard/problems",
    icon: <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Honest progress tracking",
    desc: "A 90-day coding heatmap, per-topic completion bars, and a placement-readiness score built from a transparent formula — sections with no data say so, instead of faking it.",
    motif: "tracking",
    path: "/dashboard",
    icon: <path d="M3 3v18h18M7 14l4-4 4 4 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Daily challenge & streaks",
    desc: "One rotating challenge a day, current and longest streak tracking, and shared streaks you can run with a practice partner so neither of you skips a day alone.",
    motif: "streak",
    path: "/dashboard",
    icon: <path d="M12 2s5 5.5 5 10a5 5 0 01-10 0c0-1.7.8-3 1.5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Points, leaderboard & hiring",
    desc: "Easy/Medium/Hard problems award 10/20/30 points on first acceptance, ranking you globally — and the same profile is what companies see when they search for candidates.",
    motif: "leaderboard",
    path: "/dashboard/leaderboard",
    icon: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

function Features({ goApp }) {
  return (
    <section className="relative bg-[#05070D] py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-xl mb-16">
          <span className="text-[11.5px] font-mono uppercase tracking-widest text-cyan-300/80">What's live today</span>
          <h2 className="mt-4 font-display text-[34px] sm:text-[40px] font-semibold tracking-tight text-slate-50">
            Built for the grind, not the demo.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-slate-400">
            Every card below maps to a real, working page in the product —
            click one and you'll land exactly there, not somewhere generic.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {FEATURES.map((f, i) => (
            <motion.button
              key={f.title}
              onClick={() => goApp(f.path)}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
              className="group relative overflow-hidden rounded-[18px] border border-white/[0.07] bg-white/[0.02] p-6 text-left hover:border-indigo-400/30 hover:bg-white/[0.04] transition-colors"
            >
              {MOTIFS[f.motif]}
              <div className="relative z-10">
                <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 border border-white/10 text-cyan-300 mb-5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">{f.icon}</svg>
                </div>
                <h3 className="font-display text-[16px] font-semibold text-slate-50">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-slate-400">{f.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open this →
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ROADMAP — real, ordered build phases
   ────────────────────────────────────────────────────────────────────────── */
function Roadmap() {
  const phases = [
    { n: "01", label: "Core practice", status: "live", desc: "Problems, sheets, submissions, leaderboard" },
    { n: "02", label: "Aptitude & contests", status: "building", desc: "Timed MCQ tests, platform-wide contests" },
    { n: "03", label: "Mock interviews", status: "planned", desc: "Peer rooms with shared editor & evaluation forms" },
    { n: "04", label: "Networking & hiring", status: "planned", desc: "Connections, peer learning, messaging, company hiring pipeline" },
  ];
  const dot = { live: "bg-cyan-300", building: "bg-amber-400", planned: "bg-slate-600" };

  return (
    <section id="roadmap" className="relative bg-[#05070D] border-t border-white/[0.06] py-28">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mb-14 max-w-xl">
          <span className="text-[11.5px] font-mono uppercase tracking-widest text-indigo-300/80">Build order</span>
          <h2 className="mt-4 font-display text-[32px] sm:text-[36px] font-semibold tracking-tight text-slate-50">
            Where CodeVerse is headed, in the order it's getting built.
          </h2>
        </div>

        <div className="relative pl-8 border-l border-white/10">
          {phases.map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative mb-12 last:mb-0"
            >
              <span className={`absolute -left-[37px] top-1 h-2.5 w-2.5 rounded-full ${dot[p.status]}`} />
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-mono text-[12px] text-slate-500">{p.n}</span>
                <h3 className="font-display text-[18px] font-semibold text-slate-50">{p.label}</h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 border border-white/10 rounded-full px-2 py-0.5">
                  {p.status}
                </span>
              </div>
              <p className="mt-2 text-[13.5px] text-slate-400 max-w-md">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   BENEFITS — replaces the old bottom CTA banner. Four real reasons this
   product is different, with generous gaps between cards.
   ────────────────────────────────────────────────────────────────────────── */
const BENEFITS = [
  {
    title: "One profile, not five tabs",
    desc: "Your problems solved, sheets, streak and points all live under one identity — the same profile recruiters see when they search for candidates.",
    icon: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-5 0-8 2.5-8 5v1h16v-1c0-2.5-3-5-8-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Accountability that's hard to fake",
    desc: "Heatmaps, streaks and a readiness score computed from real submissions — and shared streaks with a practice partner so consistency isn't a solo habit.",
    icon: <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Practice that looks like the real thing",
    desc: "Company-tagged questions and peer mock-interview rooms with a shared editor mean the first time you face this format isn't in the actual interview.",
    icon: <path d="M17 8c0 2-2.5 6-5 6S7 10 7 8a5 5 0 0110 0zM5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Built by someone solving the same problem",
    desc: "CodeVerse is built by a student prepping for the exact placements it's meant to help with — every feature ships because it was actually needed, not roadmapped.",
    icon: <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

function Benefits() {
  return (
    <section className="relative bg-[#05070D] py-28 border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-xl mb-16">
          <span className="text-[11.5px] font-mono uppercase tracking-widest text-cyan-300/80">Why CodeVerse</span>
          <h2 className="mt-4 font-display text-[32px] sm:text-[38px] font-semibold tracking-tight text-slate-50">
            Not another problem list. A whole prep cycle.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="relative rounded-[20px] border border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-transparent p-7"
            >
              <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 border border-white/10 text-cyan-300 mb-5">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">{b.icon}</svg>
              </div>
              <h3 className="font-display text-[17px] font-semibold text-slate-50">{b.title}</h3>
              <p className="mt-2.5 text-[13.5px] leading-[1.7] text-slate-400">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   FOOTER
   ────────────────────────────────────────────────────────────────────────── */
function Footer({ goApp }) {
  return (
    <footer className="relative bg-[#05070D] border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-7 overflow-hidden rounded-[9px]">
            <img src="/branding/codeverse-logo-reference.png" alt="CodeVerse" className="h-full w-full object-cover object-center" />
          </span>
          <span className="font-display text-[14px] font-semibold text-slate-200">CodeVerse</span>
          <span className="font-mono text-[11px] text-slate-600 ml-2">Built solo. Still shipping.</span>
        </div>
        <div className="flex items-center gap-6 text-[12.5px] text-slate-500">
          <button onClick={() => goApp("/dashboard/problems")} className="hover:text-slate-300 transition-colors">Problems</button>
          <a href="#roadmap" className="hover:text-slate-300 transition-colors">Roadmap</a>
          <button onClick={() => goApp("/dashboard")} className="hover:text-slate-300 transition-colors">Dashboard</button>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   PAGE
   ────────────────────────────────────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Single source of truth for "this button leads into the real app":
  // logged in -> navigate there for real; logged out -> ask them to log in.
  const goApp = useCallback((path) => {
    const { loggedIn } = getAuth();
    if (loggedIn) navigate(path);
    else setShowLoginPrompt(true);
  }, [navigate]);

  return (
    <div className="cv-public-page font-sans antialiased" style={{ fontFamily: "Inter, sans-serif" }}>
      <style>{`
        .font-display { font-family: "Space Grotesk", Inter, sans-serif; }
        .font-mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
      `}</style>
      <Navbar goApp={goApp} />
      <Hero goApp={goApp} />
      <StatusStrip />
      <Features goApp={goApp} />
      <Roadmap />
      <Benefits />
      <Footer goApp={goApp} />
      <LoginPromptModal open={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}

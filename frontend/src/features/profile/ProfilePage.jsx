import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BriefcaseBusiness, Check, Code2, ExternalLink, FileText, MapPin, Pencil, Plus, Save, Share2, Sparkles, X } from "lucide-react";
import api from "../../api/api";
import { CollectionDisplay, default as ProfileCollections } from "./ProfileCollections";
import SchoolEducationModal from "./SchoolEducationModal";
import ActivityHeatmap from "./ActivityHeatmap";
import useRealtimeSocket from "../../realtime/useRealtimeSocket";
import "./profile.css";
import "./profileMedia.css";
import "./profileLayoutFix.css";

const emptyProfile = {
  username: "",
  displayName: "",
  headline: "",
  about: "",
  location: "",
  openToWork: false,
  socialLinks: { github: "", linkedin: "", portfolio: "" },
  education: [],
  skills: [],
  developerInfo: { primaryRole: "", experienceLevel: "", preferredLanguages: [], interests: [] },
  projects: [],
  achievements: [],
  certifications: [],
  privacy: { showEducation: true, showStats: true, showActivity: true },
};

const profileMediaRules = {
  avatar: { label: "Avatar", types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 5 * 1024 * 1024, sizeLabel: "5 MB" },
  resume: { label: "Resume", types: ["application/pdf"], maxBytes: 10 * 1024 * 1024, sizeLabel: "10 MB" },
};

function normalizeProfile(profile = {}) {
  return {
    ...emptyProfile,
    ...profile,
    socialLinks: { ...emptyProfile.socialLinks, ...(profile.socialLinks || {}) },
    education: Array.isArray(profile.education) ? profile.education : [],
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    developerInfo: { ...emptyProfile.developerInfo, ...(profile.developerInfo || {}) },
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
    privacy: { ...emptyProfile.privacy, ...(profile.privacy || {}) },
  };
}

function initials(name) {
  return String(name || "CV").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CV";
}

function normalizeUsernameForSave(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 30);
}

function Field({ label, value, onChange, placeholder, multiline = false }) {
  const Component = multiline ? "textarea" : "input";
  const fieldId = useId();
  return <label className="profile-field" htmlFor={fieldId}><span>{label}</span><Component id={fieldId} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={multiline ? 5 : undefined} /></label>;
}

function EmptySection({ children }) {
  return <span className="profile-empty">{children}</span>;
}

function PracticeAnalyticsPanel({ stats }) {
  void stats;
/*
  const panels = [{ key: "dsaAnalytics", title: "DSA detail", subtitle: "Coding submissions, accepted solutions and topic references", topicsLabel: "Topics" }, { key: "aptitudeAnalytics", title: "Aptitude detail", subtitle: "Independent MCQ attempts, categories and revision topics", topicsLabel: "Topics" }];
  return <section className="profile-section cv-card"><div className="profile-section-heading"><div><span className="profile-section-kicker">PRACTICE BREAKDOWN</span><h2>DSA & Aptitude, separately</h2></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>{panels.map(({ key, title, subtitle, topicsLabel }) => { const item = stats?.[key] || {}; return <div key={key} style={{ padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 12, background: "var(--bg-elevated)" }}><strong style={{ color: "var(--text-primary)", fontSize: 16 }}>{title}</strong><p style={{ color: "var(--text-tertiary)", fontSize: 11, lineHeight: 1.5, margin: "6px 0 14px" }}>{subtitle}</p><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>{[[item.attempted || 0, "Attempted"], [item.solved || 0, "Solved"], [`${item.accuracy || 0}%`, "Accuracy"]].map(([value, label]) => <div key={label}><b style={{ display: "block", color: "var(--text-primary)", fontSize: 18 }}>{value}</b><small style={{ color: "var(--text-tertiary)", fontSize: 10 }}>{label}</small></div>)}</div><div style={{ marginTop: 15 }}><small style={{ color: "var(--text-tertiary)", fontSize: 10 }}>{topicsLabel}</small>{item.topics?.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>{item.topics.slice(0, 8).map((topic) => <span key={topic.name} style={{ padding: "5px 8px", borderRadius: 7, color: "var(--text-secondary)", background: "var(--bg-surface)", fontSize: 10 }}>{topic.name} · {topic.accuracy}%</span>)}</div> : <p className="profile-empty">No practice data yet.</p>}</div>; })}</div></section>;
}

*/
}
function MediaControls({ profile, busy, onUpload, onRemove }) {
  return <section className="profile-media-card cv-card" aria-busy={Boolean(busy)}><div><span className="profile-section-kicker">PROFILE MEDIA</span><h2>Make it yours</h2><p>Use a clear avatar and a public resume to help people recognize your work.</p></div><div className="profile-media-actions"><label className="profile-upload-button">{busy === "avatar" ? "Uploading…" : "Change avatar"}<input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose avatar image" onChange={(event) => onUpload(event, "avatar")} disabled={Boolean(busy)} /></label>{profile.avatar?.url && <button type="button" className="profile-remove-button" onClick={() => onRemove("avatar")} disabled={Boolean(busy)}>{busy === "delete-avatar" ? "Removing…" : "Remove avatar"}</button>}<label className="profile-upload-button">{busy === "resume" ? "Uploading…" : "Upload resume"}<input type="file" accept="application/pdf,.pdf" aria-label="Choose resume PDF" onChange={(event) => onUpload(event, "resume")} disabled={Boolean(busy)} /></label>{profile.resume?.url && <button type="button" className="profile-remove-button" onClick={() => onRemove("resume")} disabled={Boolean(busy)}>{busy === "delete-resume" ? "Removing…" : "Remove resume"}</button>}</div></section>;
}

/* eslint-disable-next-line no-unused-vars */
function PracticeAnalytics({ stats }) {
  const panels = [{ key: "dsaAnalytics", title: "DSA detail", subtitle: "Coding submissions and topic references" }, { key: "aptitudeAnalytics", title: "Aptitude detail", subtitle: "Independent MCQ attempts and revision topics" }];
  return <section className="profile-section cv-card"><div className="profile-section-heading"><div><span className="profile-section-kicker">PRACTICE BREAKDOWN</span><h2>DSA & Aptitude, separately</h2></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>{panels.map((panel) => { const item = stats?.[panel.key] || {}; return <div key={panel.key} style={{ padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 12, background: "var(--bg-elevated)" }}><strong style={{ color: "var(--text-primary)", fontSize: 16 }}>{panel.title}</strong><p style={{ color: "var(--text-tertiary)", fontSize: 11, lineHeight: 1.5, margin: "6px 0 14px" }}>{panel.subtitle}</p><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>{[[item.attempted || 0, "Attempted"], [item.solved || 0, "Solved"], [`${item.accuracy || 0}%`, "Accuracy"]].map(([value, label]) => <div key={label}><b style={{ display: "block", color: "var(--text-primary)", fontSize: 18 }}>{value}</b><small style={{ color: "var(--text-tertiary)", fontSize: 10 }}>{label}</small></div>)}</div><div style={{ marginTop: 15 }}><small style={{ color: "var(--text-tertiary)", fontSize: 10 }}>Topics</small>{item.topics?.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>{item.topics.slice(0, 8).map((topic) => <span key={topic.name} style={{ padding: "5px 8px", borderRadius: 7, color: "var(--text-secondary)", background: "var(--bg-surface)", fontSize: 10 }}>{topic.name} - {topic.accuracy}%</span>)}</div> : <p className="profile-empty">No practice data yet.</p>}</div>;</div>; })}</div></section>;
}

/* eslint-disable-next-line no-unused-vars */
function SubmissionActivityGraph({ activities = [] }) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const entries = activities.filter((item) => item.createdAt && new Date(item.createdAt).toISOString().slice(0, 10) === key);
    return { key, label: date.toLocaleDateString(undefined, { weekday: "short" }), total: entries.length, accepted: entries.filter((item) => item.verdict === "Accepted").length };
  });
  const max = Math.max(...days.map((day) => day.total), 1);
  const total = activities.length;
  const accepted = activities.filter((item) => item.verdict === "Accepted").length;
  return <div className="submission-activity-graph"><div className="submission-graph-summary"><span><b>{total}</b> recent submissions</span><span><b>{accepted}</b> accepted</span><span><b>{total ? Math.round((accepted / total) * 100) : 0}%</b> success rate</span></div><div className="submission-chart" role="img" aria-label="Coding submissions over the last seven days">{days.map((day) => <div className="submission-chart-day" key={day.key} title={`${day.key}: ${day.total} submissions, ${day.accepted} accepted`}><div className="submission-chart-bars"><span className="submission-bar-total" style={{ height: `${Math.max((day.total / max) * 100, day.total ? 12 : 4)}%` }} /><span className="submission-bar-accepted" style={{ height: `${Math.max((day.accepted / max) * 100, day.accepted ? 12 : 4)}%` }} /></div><strong>{day.total}</strong><small>{day.label}</small></div>)}</div><div className="submission-chart-legend"><span><i className="legend-total" /> All submissions</span><span><i className="legend-accepted" /> Accepted</span><em>Last 7 days</em></div></div>;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stats, setStats] = useState(null);
  const [schoolEducationOpen, setSchoolEducationOpen] = useState(false);
  const [profileModalNode, setProfileModalNode] = useState(null);
  const profileModalRef = useRef(null);
  const profileEditTriggerRef = useRef(null);

  const loadProfile = async ({ background = false } = {}) => {
    if (!background) setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/profile/me");
      const next = normalizeProfile(response.data?.profile);
      setProfile(next);
      setDraft(next);
      setCompletion(response.data?.completion || null);
      setStats(response.data?.stats || null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load your profile.");
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => {
    if (!editing) { setProfileModalNode(null); return undefined; }
    const timer = window.setTimeout(() => {
      setProfileModalNode(document.querySelector(".profile-modal"));
      profileModalRef.current?.focus();
    }, 0);
    const handleModalKeyDown = (event) => {
      if (event.key === "Escape") {
        setEditing(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(profileModalRef.current?.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])") || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleModalKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleModalKeyDown);
      if (profileEditTriggerRef.current && document.contains(profileEditTriggerRef.current)) profileEditTriggerRef.current.focus();
    };
  }, [editing]);
  useRealtimeSocket({
    "profile:updated": () => loadProfile({ background: true }),
    "coding:analytics-updated": () => loadProfile({ background: true }),
    "aptitude:analytics-updated": () => loadProfile({ background: true }),
    "aptitude:activity-updated": () => loadProfile({ background: true }),
    "gamification:updated": () => loadProfile({ background: true }),
  });
  useEffect(() => {
    if (!editing) return undefined;
    const interceptEducationButton = (event) => {
      const button = event.target.closest?.("button");
      if (button?.textContent?.toLowerCase().includes("add education")) {
        event.preventDefault(); event.stopPropagation(); setSchoolEducationOpen(true);
      }
    };
    document.addEventListener("click", interceptEducationButton, true);
    return () => document.removeEventListener("click", interceptEducationButton, true);
  }, [editing]);
  const displayName = profile?.displayName || "Your developer profile";
  const skillNames = useMemo(() => (profile?.skills || []).map((skill) => typeof skill === "string" ? skill : skill.name).filter(Boolean), [profile]);

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const updateNested = (parent, key, value) => setDraft((current) => ({ ...current, [parent]: { ...(current[parent] || {}), [key]: value } }));
  const openProfileEditor = (event) => {
    profileEditTriggerRef.current = event.currentTarget;
    setDraft(normalizeProfile(profile));
    setEditing(true);
  };
  const copyProfileLink = async () => {
    if (!profile?.username) { setNotice("Add a username before sharing your profile."); return; }
    const link = `${window.location.origin}/profile/${profile.username}`;
    const shareData = { title: `${profile.displayName || profile.username} on CodeVerse`, text: profile.headline || "View my CodeVerse developer profile", url: link };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setNotice("Profile share opened.");
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const helper = document.createElement("textarea");
        helper.value = link;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        const copied = document.execCommand("copy");
        helper.remove();
        if (!copied) throw new Error("Clipboard copy was not available");
      }
      setNotice("Public profile link copied to clipboard.");
    } catch {
      window.prompt("Copy your public profile link:", link);
    }
  };

  const uploadMedia = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (mediaBusy) {
      event.target.value = "";
      return;
    }
    const rule = profileMediaRules[type];
    if (!rule) return;
    if (!rule.types.includes(file.type)) {
      setError(`${rule.label} must be ${type === "avatar" ? "a PNG, JPEG, or WebP image" : "a PDF file"}.`);
      event.target.value = "";
      return;
    }
    if (file.size > rule.maxBytes) {
      setError(`${rule.label} must be smaller than ${rule.sizeLabel}.`);
      event.target.value = "";
      return;
    }
    setMediaBusy(type);
    setError("");
    setNotice("");
    try {
      const formData = new FormData();
      formData.append(type, file);
      const response = await api.post(`/api/profile/me/${type}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      const next = normalizeProfile(response.data?.profile);
      setProfile(next);
      setDraft(next);
      setCompletion(response.data?.completion || null);
      setStats(response.data?.stats || stats);
      if (type === "avatar") window.dispatchEvent(new CustomEvent("profile-avatar-updated", { detail: { avatarUrl: next.avatar?.url || "" } }));
      setNotice(`${type === "avatar" ? "Avatar" : "Resume"} updated successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || `Unable to upload ${type}.`);
    } finally {
      setMediaBusy("");
      event.target.value = "";
    }
  };

  const removeMedia = async (type) => {
    if (mediaBusy) return;
    setMediaBusy(`delete-${type}`);
    setError("");
    setNotice("");
    try {
      const response = await api.delete(`/api/profile/me/${type}`);
      const next = normalizeProfile(response.data?.profile);
      setProfile(next);
      setDraft(next);
      setCompletion(response.data?.completion || null);
      if (type === "avatar") window.dispatchEvent(new CustomEvent("profile-avatar-updated", { detail: { avatarUrl: "" } }));
      setNotice(`${type === "avatar" ? "Avatar" : "Resume"} removed.`);
    } catch (err) {
      setError(err.response?.data?.message || `Unable to remove ${type}.`);
    } finally {
      setMediaBusy("");
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        username: normalizeUsernameForSave(draft.username),
        displayName: draft.displayName,
        headline: draft.headline,
        about: draft.about,
        location: draft.location,
        openToWork: Boolean(draft.openToWork),
        socialLinks: draft.socialLinks,
        education: draft.education,
        skills: draft.skills,
        developerInfo: draft.developerInfo,
        projects: draft.projects,
        achievements: draft.achievements,
        privacy: draft.privacy,
      };
      const response = await api.patch("/api/profile/me", payload);
      const next = normalizeProfile(response.data?.profile);
      setProfile(next);
      setDraft(next);
      setCompletion(response.data?.completion || null);
      setStats(response.data?.stats || stats);
      setEditing(false);
      setNotice("Profile saved successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="profile-page"><div className="profile-skeleton profile-skeleton-hero" /><div className="profile-skeleton-grid"><div className="profile-skeleton" /><div className="profile-skeleton" /></div></div>;
  if (error && !profile) return <div className="profile-page"><div className="profile-error"><strong>Profile unavailable</strong><span>{error}</span><button className="cv-button-primary" type="button" onClick={loadProfile}>Try again</button></div></div>;

  return <div className="profile-page">
    <section className="profile-hero cv-card">
      <div className="profile-hero-glow" />
      <div className="profile-hero-content">
        <div className="profile-avatar-wrap"><div className="profile-avatar">{profile.avatar?.url ? <img src={profile.avatar.url} alt="" /> : initials(displayName)}</div><span className="profile-online-dot" /></div>
        <div className="profile-identity"><span className="profile-eyebrow"><Sparkles size={13} /> DEVELOPER PROFILE</span><h1>{displayName}</h1><p className="profile-headline">{profile.headline || "Add a headline that tells people what you build."}</p><div className="profile-meta">{profile.username && <span>@{profile.username}</span>}{profile.location && <span><MapPin size={14} />{profile.location}</span>}{profile.openToWork && <span className="profile-open-badge"><i /> Open to work</span>}</div></div>
        <div className="profile-hero-actions profile-no-print"><button className="cv-button-secondary profile-share-button" type="button" onClick={copyProfileLink} title={profile.username ? "Copy public profile link" : "Add a username to enable sharing"}><Share2 size={15} /> Share</button><button className="cv-button-primary profile-edit-button" type="button" onClick={openProfileEditor}><Pencil size={15} /> Edit profile</button></div>
      </div>
      <div className="profile-hero-links"><a href={profile.socialLinks?.github || "#"} className={!profile.socialLinks?.github ? "disabled" : ""} target="_blank" rel="noreferrer"><Code2 size={16} /> GitHub <ExternalLink size={12} /></a><a href={profile.socialLinks?.linkedin || "#"} className={!profile.socialLinks?.linkedin ? "disabled" : ""} target="_blank" rel="noreferrer"><BriefcaseBusiness size={16} /> LinkedIn <ExternalLink size={12} /></a><a href={profile.socialLinks?.portfolio || "#"} className={!profile.socialLinks?.portfolio ? "disabled" : ""} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Portfolio <ExternalLink size={12} /></a><a href={profile.resume?.url || "#"} className={!profile.resume?.url ? "disabled" : ""} target="_blank" rel="noreferrer"><FileText size={16} /> Resume <ExternalLink size={12} /></a></div>
    </section>

    <MediaControls profile={profile} busy={mediaBusy} onUpload={uploadMedia} onRemove={removeMedia} />
    {notice && <div className="profile-notice" role="status" aria-live="polite"><Check size={16} /> {notice}</div>}
    {error && profile && <div className="profile-inline-error" role="alert">{error}</div>}

    <div className="profile-layout">
      <main className="profile-content">
        <section className="profile-section cv-card profile-about-card"><div className="profile-section-heading"><div><span className="profile-section-kicker">ABOUT ME</span><h2>{profile.about ? `A little about ${profile.displayName || "me"}` : "Tell your story with purpose."}</h2></div><span className="profile-section-number">01</span></div>{(profile.developerInfo?.primaryRole || profile.location || profile.developerInfo?.experienceLevel || profile.openToWork) && <div className="profile-about-highlights">{profile.developerInfo?.primaryRole && <span>{profile.developerInfo.primaryRole}</span>}{profile.location && <span>{profile.location}</span>}{profile.developerInfo?.experienceLevel && <span>{profile.developerInfo.experienceLevel}</span>}{profile.openToWork && <span className="is-positive">Open to work</span>}</div>}<p className="profile-about">{profile.about || <EmptySection>Add a short introduction about what you build, what you are learning, and the problems you enjoy solving.</EmptySection>}</p>{profile.about && <span className="profile-about-footer">Developer profile · CodeVerse</span>}</section>
        <section className="profile-section cv-card profile-skills-card"><div className="profile-section-heading"><div><span className="profile-section-kicker">SKILLS & EXPERTISE</span><h2>What I build with</h2></div><span className="profile-section-number">02</span></div><div className="profile-skill-overview"><span>{skillNames.length} skills listed</span>{profile.developerInfo?.preferredLanguages?.length > 0 && <span>{profile.developerInfo.preferredLanguages.length} preferred languages</span>}</div>{skillNames.length ? <div className="profile-skill-list">{skillNames.map((skill) => <span key={skill}>{skill}</span>)}</div> : <EmptySection>Add your strongest technologies and areas of expertise.</EmptySection>}{profile.developerInfo?.preferredLanguages?.length > 0 && <div className="profile-language-row"><b>Preferred languages</b>{profile.developerInfo.preferredLanguages.map((language) => <span key={language}>{language}</span>)}</div>}</section>
        <section className="profile-section cv-card"><div className="profile-section-heading"><div><span className="profile-section-kicker">EDUCATION</span><h2>Learning journey</h2></div><span className="profile-section-number">03</span></div>{profile.education?.length ? <div className="profile-education-list">{profile.education.map((item, index) => <div className="profile-education" key={`${item.institution}-${index}`}><span className="profile-timeline-dot" /><div><strong>{item.institution || "Institution"}</strong><p>{[item.degree, item.field].filter(Boolean).join(" · ") || "Education details"}</p><small>{item.startYear || "—"} – {item.current ? "Present" : item.endYear || "—"}</small></div></div>)}</div> : <EmptySection>Add your education to help people understand your journey.</EmptySection>}</section>
        <section className="profile-section cv-card"><div className="profile-section-heading"><div><span className="profile-section-kicker">CODING STATISTICS</span><h2>Proof of practice</h2></div></div><div className="profile-stat-grid">{[[stats?.problemsSolved || 0, "Problems solved"], [stats?.acceptedSubmissions || 0, "Accepted"], [stats?.currentStreak || 0, "Current streak"], [stats?.points || 0, "Points"]].map(([value, label]) => <div className="profile-stat-card" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>
        <PracticeAnalyticsPanel stats={stats} />
        <ActivityHeatmap data={stats?.activityHeatmap || []} dsaData={stats?.dsaHeatmap || []} aptitudeData={stats?.aptitudeHeatmap || []} stats={stats} api={api} />
        <CollectionDisplay profile={profile} />
        {profile.privacy?.showActivity !== false && <section className="profile-section cv-card"><div className="profile-section-heading"><div><span className="profile-section-kicker">RECENT ACTIVITY</span><h2>Latest submissions</h2></div></div>{stats?.recentActivity?.length ? <div className="profile-activity-list">{stats.recentActivity.map((activity, index) => <div className="profile-activity-row" key={`${activity.createdAt}-${index}`}><span className={`profile-activity-dot ${activity.verdict === "Accepted" ? "is-accepted" : ""}`} /><div><strong>{activity.problem?.title || "Code submission"}</strong><small>{activity.verdict} · {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : "Recently"}</small></div><span className="profile-activity-difficulty">{activity.problem?.difficulty || "Practice"}</span></div>)}</div> : <p className="profile-empty">Your recent coding activity will appear here.</p>}</section>}
      </main>
      <aside className="profile-sidebar">
        <section className="profile-completion cv-card"><div className="profile-completion-head"><div><span className="profile-section-kicker">PROFILE STRENGTH</span><h2>{completion?.percentage || 0}% complete</h2></div><span className="profile-progress-ring" style={{ "--progress": `${completion?.percentage || 0}%` }}>{completion?.percentage || 0}</span></div><div className="profile-progress"><span style={{ width: `${completion?.percentage || 0}%` }} /></div><p>{completion?.percentage >= 80 ? "Your profile is ready to make a strong first impression." : "Complete a few more sections to make your profile stand out."}</p><button type="button" className="cv-button-secondary profile-complete-button" onClick={openProfileEditor}>{completion?.percentage ? "Improve profile" : "Complete profile"} <span>→</span></button></section>
        <section className="profile-section profile-quick cv-card"><span className="profile-section-kicker">QUICK SNAPSHOT</span><div className="profile-snapshot"><div><strong>{skillNames.length}</strong><span>Skills</span></div><div><strong>{profile.education?.length || 0}</strong><span>Education</span></div><div><strong>{profile.developerInfo?.preferredLanguages?.length || 0}</strong><span>Languages</span></div></div></section>
      </aside>
    </div>

    <div className="profile-editor-only"><ProfileCollections profile={profile} api={api} onSaved={(data) => { const next = normalizeProfile(data?.profile); setProfile(next); setDraft(next); setCompletion(data?.completion || completion); setStats(data?.stats || stats); setNotice("Profile sections saved successfully."); }} /></div>
    {editing && profileModalNode && createPortal(<div className="profile-language-editor"><span className="profile-section-kicker">LANGUAGES</span><Field label="Preferred languages" value={(draft.developerInfo?.preferredLanguages || []).join(", ")} onChange={(value) => updateNested("developerInfo", "preferredLanguages", value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="JavaScript, Java, Python" /><small>Separate languages with commas, then click Save profile.</small></div>, profileModalNode)}
    {schoolEducationOpen && <SchoolEducationModal profile={profile} api={api} onClose={() => setSchoolEducationOpen(false)} onSaved={(data) => { const next = normalizeProfile(data?.profile); setProfile(next); setDraft(next); setCompletion(data?.completion || completion); setStats(data?.stats || stats); setNotice("School education saved successfully."); }} />}

    {editing && <div className="profile-modal-backdrop" role="presentation"><form ref={profileModalRef} className="profile-modal cv-card" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title" tabIndex="-1" onSubmit={saveProfile}><div className="profile-modal-head"><div><span className="profile-section-kicker">PROFILE EDITOR</span><h2 id="profile-editor-title">Shape your developer identity</h2><p>Save incomplete sections anytime and continue later.</p></div><button type="button" className="profile-close" onClick={() => setEditing(false)} aria-label="Close editor"><X size={20} /></button></div><div className="profile-form-grid"><Field label="Username" value={draft.username} onChange={(value) => updateDraft("username", value)} placeholder="your-username" /><Field label="Display name" value={draft.displayName} onChange={(value) => updateDraft("displayName", value)} placeholder="Mradul Garg" /><Field label="Headline" value={draft.headline} onChange={(value) => updateDraft("headline", value)} placeholder="Full Stack Developer" /><Field label="Location" value={draft.location} onChange={(value) => updateDraft("location", value)} placeholder="India" /><div className="profile-form-full"><Field label="About you" value={draft.about} onChange={(value) => updateDraft("about", value)} placeholder="What do you build and care about?" multiline /></div><Field label="GitHub URL" value={draft.socialLinks.github} onChange={(value) => updateNested("socialLinks", "github", value)} placeholder="https://github.com/username" /><Field label="LinkedIn URL" value={draft.socialLinks.linkedin} onChange={(value) => updateNested("socialLinks", "linkedin", value)} placeholder="https://linkedin.com/in/username" /><Field label="Portfolio URL" value={draft.socialLinks.portfolio} onChange={(value) => updateNested("socialLinks", "portfolio", value)} placeholder="https://yourportfolio.dev" /><label className="profile-toggle"><input type="checkbox" checked={Boolean(draft.openToWork)} onChange={(event) => updateDraft("openToWork", event.target.checked)} /><span /><b>Open to work</b></label></div><div className="profile-form-block"><div className="profile-form-block-head"><div><span className="profile-section-kicker">SKILLS</span><p>Add technologies one by one.</p></div><button type="button" className="profile-add-button" onClick={() => updateDraft("skills", [...(draft.skills || []), { name: "" }])}><Plus size={15} /> Add skill</button></div><div className="profile-edit-list">{(draft.skills || []).map((skill, index) => <div className="profile-edit-row" key={`skill-${index}`}><input value={typeof skill === "string" ? skill : skill.name || ""} onChange={(event) => { const next = [...draft.skills]; next[index] = { ...(typeof next[index] === "object" ? next[index] : {}), name: event.target.value }; updateDraft("skills", next); }} placeholder="React" /><button type="button" onClick={() => updateDraft("skills", draft.skills.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove skill"><X size={16} /></button></div>)}</div></div><div className="profile-form-block"><div className="profile-form-block-head"><div><span className="profile-section-kicker">EDUCATION</span><p>Keep your latest learning milestone visible.</p></div><button type="button" className="profile-add-button" onClick={() => updateDraft("education", [...(draft.education || []), { institution: "", degree: "", field: "", startYear: "", endYear: "", current: false }])}><Plus size={15} /> Add education</button></div>{(draft.education || []).map((item, index) => <div className="profile-education-edit" key={`education-${index}`}><Field label="Institution" value={item.institution} onChange={(value) => { const next = [...draft.education]; next[index] = { ...next[index], institution: value }; updateDraft("education", next); }} placeholder="University / school" /><Field label="Degree" value={item.degree} onChange={(value) => { const next = [...draft.education]; next[index] = { ...next[index], degree: value }; updateDraft("education", next); }} placeholder="B.Tech" /><Field label="Field" value={item.field} onChange={(value) => { const next = [...draft.education]; next[index] = { ...next[index], field: value }; updateDraft("education", next); }} placeholder="Computer Science" /></div>)}</div><div className="profile-modal-actions"><button type="button" className="cv-button-secondary" onClick={() => setEditing(false)}>Cancel</button><button type="submit" className="cv-button-primary" disabled={saving}>{saving ? "Saving…" : <><Save size={15} /> Save profile</>}</button></div></form></div>}
  </div>;
}

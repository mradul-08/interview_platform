import { useEffect, useState } from "react";
import { ArrowLeft, Code2 as Github, ExternalLink, FileText, MapPin } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../../api/api";
import { CollectionDisplay } from "./ProfileCollections";
import ActivityHeatmap from "./ActivityHeatmap";
import "./profile.css";
import "./profileLayoutFix.css";

export default function PublicProfilePage() {
  const { username } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let active = true;
    const endpoint = `/api/profile/${encodeURIComponent(username || "")}`;
    const load = (initial = false) => {
      if (initial) setLoading(true);
      api.get(endpoint, { params: { _ts: Date.now() } })
        .then((response) => { if (active) { setData(response.data); setError(""); } })
        .catch((err) => active && initial && setError(err.response?.data?.message || "Profile not found"))
        .finally(() => active && initial && setLoading(false));
    };
    load(true);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 15000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [username, retryNonce]);

  if (loading) return <div className="profile-page"><div className="profile-skeleton profile-skeleton-hero" /><div className="profile-skeleton-grid"><div className="profile-skeleton" /><div className="profile-skeleton" /></div></div>;
  if (error || !data?.profile) return <div className="profile-page"><div className="profile-error"><strong>Profile unavailable</strong><span>{error || "This profile is not public."}</span>{error && <button type="button" className="cv-button-primary" onClick={() => setRetryNonce((value) => value + 1)}>Try again</button>}<Link className="cv-button-secondary" to={location.state?.fromStudyGroup || "/dashboard/profile"}><ArrowLeft size={15} /> {location.state?.fromStudyGroup ? "Back to group" : "Back to profile"}</Link></div></div>;

  const profile = { ...data.profile, activityStats: null };
  const initials = String(profile.displayName || profile.username || "CV").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="profile-page public-profile-page">
    <Link to={location.state?.fromStudyGroup || "/dashboard/profile"} className="profile-back-link"><ArrowLeft size={15} /> {location.state?.fromStudyGroup ? "Back to group" : "My profile"}</Link>
    <section className="recruiter-snapshot cv-card"><div><span className="profile-section-kicker">RECRUITER SNAPSHOT</span><h2>{profile.developerInfo?.primaryRole || profile.headline || "Developer on CodeVerse"}</h2><p>{profile.about || "A developer building skills and solving meaningful problems."}</p></div><div className="recruiter-snapshot-meta">{profile.location && <span>{profile.location}</span>}{profile.developerInfo?.experienceLevel && <span>{profile.developerInfo.experienceLevel}</span>}{profile.openToWork && <span className="is-positive">Open to work</span>}<span>{profile.skills?.length || 0} skills</span><span>{profile.projects?.length || 0} projects</span></div></section>
    {(profile.skills?.length || profile.developerInfo?.preferredLanguages?.length) > 0 && <section className="public-skill-strip cv-card"><div><span className="profile-section-kicker">SKILL SIGNAL</span><h2>Core strengths</h2></div><div className="profile-skill-list">{(profile.skills || []).slice(0, 8).map((skill) => <span key={skill.name}>{skill.name}</span>)}{(profile.developerInfo?.preferredLanguages || []).slice(0, 4).map((language) => <span className="is-language" key={`language-${language}`}>{language}</span>)}</div></section>}
    <section className="profile-hero cv-card"><div className="profile-hero-glow" /><div className="profile-hero-content"><div className="profile-avatar-wrap"><div className="profile-avatar">{profile.avatar?.url ? <img src={profile.avatar.url} alt="" /> : initials}</div></div><div className="profile-identity"><span className="profile-eyebrow">DEVELOPER PROFILE</span><h1>{profile.displayName || profile.username}</h1><p className="profile-headline">{profile.headline || "Developer on CodeVerse"}</p><div className="profile-meta"><span>@{profile.username}</span>{profile.location && <span><MapPin size={14} />{profile.location}</span>}{profile.openToWork && <span className="profile-open-badge"><i /> Open to work</span>}</div></div></div><div className="profile-hero-links">{profile.socialLinks?.github && <a href={profile.socialLinks.github} target="_blank" rel="noreferrer"><Github size={16} /> GitHub <ExternalLink size={12} /></a>}{profile.socialLinks?.linkedin && <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={12} /></a>}{profile.socialLinks?.portfolio && <a href={profile.socialLinks.portfolio} target="_blank" rel="noreferrer">Portfolio <ExternalLink size={12} /></a>}{profile.resume?.url && <a href={profile.resume.url} target="_blank" rel="noreferrer"><FileText size={16} /> Resume <ExternalLink size={12} /></a>}</div></section>
    <div className="profile-layout"><main className="profile-content"><section className="profile-section cv-card"><span className="profile-section-kicker">ABOUT</span><h2>About {profile.displayName || "this developer"}</h2><p className="profile-about">{profile.about || "This developer has not added an introduction yet."}</p></section><section className="profile-section cv-card"><span className="profile-section-kicker">SKILLS</span><h2>Tools and strengths</h2><div className="profile-skill-list">{(profile.skills || []).length ? profile.skills.map((skill) => <span key={skill.name}>{skill.name}</span>) : <p className="profile-empty">No public skills added yet.</p>}</div></section><section className="profile-section cv-card"><span className="profile-section-kicker">EDUCATION</span><h2>Learning journey</h2>{(profile.education || []).length ? profile.education.map((item, index) => <div className="profile-education" key={`${item.institution}-${index}`}><span className="profile-timeline-dot" /><div><strong>{item.institution}</strong><p>{[item.degree, item.field].filter(Boolean).join(" · ")}</p><small>{item.startYear || "—"} – {item.current ? "Present" : item.endYear || "—"}</small></div></div>) : <p className="profile-empty">No public education details added yet.</p>}</section><CollectionDisplay profile={profile} /></main><aside className="profile-sidebar"><section className="profile-completion cv-card"><span className="profile-section-kicker">PROFILE STRENGTH</span><h2>{data.completion?.percentage || 0}% complete</h2><div className="profile-progress"><span style={{ width: `${data.completion?.percentage || 0}%` }} /></div><p>A quick look at how much of this developer profile is complete.</p></section>{data.stats && <section className="profile-section cv-card"><span className="profile-section-kicker">CODING STATISTICS</span><h2>CodeVerse activity</h2><div className="profile-stat-grid"><div className="profile-stat-card"><strong>{data.stats.problemsSolved}</strong><span>Problems solved</span></div><div className="profile-stat-card"><strong>{data.stats.currentStreak}</strong><span>Current streak</span></div><div className="profile-stat-card"><strong>{data.stats.points}</strong><span>Points</span></div><div className="profile-stat-card"><strong>{data.stats.badges?.length || 0}</strong><span>Badges</span></div></div></section>}</aside></div>
    {data.profile.privacy?.showStats !== false && data.profile.privacy?.showActivity !== false && <ActivityHeatmap data={data.stats?.activityHeatmap || []} dsaData={data.stats?.dsaHeatmap || []} aptitudeData={data.stats?.aptitudeHeatmap || []} stats={data.stats} api={api} activityEndpoint={`/api/profile/${encodeURIComponent(profile.username)}/activity`} />}
  </div>;
}

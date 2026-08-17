import { useEffect, useId, useState } from "react";
import { Award, ExternalLink, FolderGit2, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import ActivityHeatmap from "./ActivityHeatmap";
import api from "../../api/api";

const blankProject = { title: "", description: "", technologies: [], sourceUrl: "", liveUrl: "", featured: false };
const blankAchievement = { title: "", description: "", issuer: "", date: "", link: "" };
const blankCertification = { name: "", issuer: "", issuedAt: "", credentialUrl: "" };

function TextInput({ label, value, onChange, placeholder }) {
  const fieldId = useId();
  return <label className="profile-field" htmlFor={fieldId}><span>{label}</span><input id={fieldId} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

export default function ProfileCollections({ profile, onSaved, api }) {
  const [projects, setProjects] = useState(profile.projects || []);
  const [achievements, setAchievements] = useState(profile.achievements || []);
  const [certifications, setCertifications] = useState(profile.certifications || []);
  const [schoolEducation, setSchoolEducation] = useState(profile.schoolEducation || { tenth: {}, twelfth: {} });
  const [privacy, setPrivacy] = useState(profile.privacy || { showEducation: true, showStats: true, showActivity: true });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setProjects(profile.projects || []);
    setAchievements(profile.achievements || []);
    setCertifications(profile.certifications || []);
    setSchoolEducation(profile.schoolEducation || { tenth: {}, twelfth: {} });
    setPrivacy(profile.privacy || { showEducation: true, showStats: true, showActivity: true });
  }, [profile]);

  const save = async () => {
    setSaving(true); setMessage("");
    try {
      const response = await api.patch("/api/profile/me", { projects, achievements, certifications, schoolEducation, privacy });
      onSaved(response.data);
      setMessage("Saved successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save changes.");
    } finally { setSaving(false); }
  };

  const updateItem = (setter, index, key, value) => setter((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const removeItem = (setter, index) => setter((items) => items.filter((_, itemIndex) => itemIndex !== index));

  return <>
    <section className="profile-section cv-card profile-collection-section">
      <div className="profile-section-heading"><div><span className="profile-section-kicker"><FolderGit2 size={13} /> PROJECTS</span><h2>Work worth showing</h2></div><button type="button" className="profile-add-button" onClick={() => setProjects((items) => [...items, { ...blankProject }])}><Plus size={15} /> Add project</button></div>
      {projects.length === 0 && <p className="profile-empty">Add projects to show what you can build.</p>}
      <div className="profile-collection-editor">{projects.map((project, index) => <div className="profile-collection-card" key={`project-${index}`}>
        <div className="profile-collection-card-head"><strong>Project {index + 1}</strong><button type="button" className="profile-danger-button" onClick={() => removeItem(setProjects, index)}><Trash2 size={14} /> Remove</button></div>
        <div className="profile-form-grid"><TextInput label="Title" value={project.title} onChange={(value) => updateItem(setProjects, index, "title", value)} placeholder="CodeVerse" /><TextInput label="Technologies" value={(project.technologies || []).join(", ")} onChange={(value) => updateItem(setProjects, index, "technologies", value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="React, Node.js, MongoDB" /><TextInput label="GitHub URL" value={project.sourceUrl} onChange={(value) => updateItem(setProjects, index, "sourceUrl", value)} placeholder="https://github.com/..." /><TextInput label="Live URL" value={project.liveUrl} onChange={(value) => updateItem(setProjects, index, "liveUrl", value)} placeholder="https://..." /><label className="profile-field profile-form-full"><span>Description</span><textarea rows="3" value={project.description || ""} onChange={(event) => updateItem(setProjects, index, "description", event.target.value)} placeholder="What did you build?" /></label></div>
      </div>)}</div>
    </section>
    <section className="profile-section cv-card profile-collection-section profile-school-editor-section">
      <div className="profile-section-heading"><div><span className="profile-section-kicker">SCHOOL EDUCATION</span><h2>10th & 12th academic record</h2></div></div>
      <div className="school-education-grid">{[["tenth", "10th / Secondary", false], ["twelfth", "12th / Senior Secondary", true]].map(([level, label, hasStream]) => <div className="school-education-card" key={level}><div className="school-education-card-head"><strong>{label}</strong><span>Optional</span></div><div className="profile-form-grid"><TextInput label="School" value={schoolEducation[level]?.school} onChange={(value) => setSchoolEducation((current) => ({ ...current, [level]: { ...(current[level] || {}), school: value } }))} placeholder="School name" /><TextInput label="Board" value={schoolEducation[level]?.board} onChange={(value) => setSchoolEducation((current) => ({ ...current, [level]: { ...(current[level] || {}), board: value } }))} placeholder="CBSE / ICSE / State Board" />{hasStream && <TextInput label="Stream" value={schoolEducation[level]?.stream} onChange={(value) => setSchoolEducation((current) => ({ ...current, [level]: { ...(current[level] || {}), stream: value } }))} placeholder="Science / Commerce / Arts" />}<TextInput label="Passing year" value={schoolEducation[level]?.year || ""} onChange={(value) => setSchoolEducation((current) => ({ ...current, [level]: { ...(current[level] || {}), year: value === "" ? "" : Number(value) } }))} placeholder="2022" /><TextInput label="Percentage" value={schoolEducation[level]?.percentage ?? ""} onChange={(value) => setSchoolEducation((current) => ({ ...current, [level]: { ...(current[level] || {}), percentage: value === "" ? "" : Number(value) } }))} placeholder="85.5" /><TextInput label="Report card PDF URL" value={schoolEducation[level]?.reportCardUrl} onChange={(value) => setSchoolEducation((current) => ({ ...current, [level]: { ...(current[level] || {}), reportCardUrl: value } }))} placeholder="https://.../report-card.pdf" /></div></div>)}</div>
    </section>
    <section className="profile-section cv-card profile-collection-section">
      <div className="profile-section-heading"><div><span className="profile-section-kicker"><ShieldCheck size={13} /> CERTIFICATIONS</span><h2>Credentials that count</h2></div><button type="button" className="profile-add-button" onClick={() => setCertifications((items) => [...items, { ...blankCertification }])}><Plus size={15} /> Add certification</button></div>
      {certifications.length === 0 && <p className="profile-empty">Add relevant certificates and credentials.</p>}
      <div className="profile-collection-editor">{certifications.map((item, index) => <div className="profile-collection-card" key={`certification-${index}`}>
        <div className="profile-collection-card-head"><strong>Certification {index + 1}</strong><button type="button" className="profile-danger-button" onClick={() => removeItem(setCertifications, index)}><Trash2 size={14} /> Remove</button></div>
        <div className="profile-form-grid"><TextInput label="Name" value={item.name} onChange={(value) => updateItem(setCertifications, index, "name", value)} placeholder="AWS Cloud Practitioner" /><TextInput label="Issuer" value={item.issuer} onChange={(value) => updateItem(setCertifications, index, "issuer", value)} placeholder="Amazon Web Services" /><TextInput label="Issued date" value={item.issuedAt ? String(item.issuedAt).slice(0, 10) : ""} onChange={(value) => updateItem(setCertifications, index, "issuedAt", value)} placeholder="2026-01-30" /><TextInput label="Credential URL" value={item.credentialUrl} onChange={(value) => updateItem(setCertifications, index, "credentialUrl", value)} placeholder="https://..." /></div>
      </div>)}</div>
    </section>
    <section className="profile-section cv-card profile-collection-section">
      <div className="profile-section-heading"><div><span className="profile-section-kicker"><Award size={13} /> ACHIEVEMENTS</span><h2>Milestones and recognition</h2></div><button type="button" className="profile-add-button" onClick={() => setAchievements((items) => [...items, { ...blankAchievement }])}><Plus size={15} /> Add achievement</button></div>
      {achievements.length === 0 && <p className="profile-empty">Add awards, hackathons, certifications, or milestones.</p>}
      <div className="profile-collection-editor">{achievements.map((item, index) => <div className="profile-collection-card" key={`achievement-${index}`}>
        <div className="profile-collection-card-head"><strong>Achievement {index + 1}</strong><button type="button" className="profile-danger-button" onClick={() => removeItem(setAchievements, index)}><Trash2 size={14} /> Remove</button></div>
        <div className="profile-form-grid"><TextInput label="Title" value={item.title} onChange={(value) => updateItem(setAchievements, index, "title", value)} placeholder="Hackathon winner" /><TextInput label="Issuer" value={item.issuer} onChange={(value) => updateItem(setAchievements, index, "issuer", value)} placeholder="Organization" /><TextInput label="Date" value={item.date ? String(item.date).slice(0, 10) : ""} onChange={(value) => updateItem(setAchievements, index, "date", value)} placeholder="2026-01-30" /><TextInput label="Verification URL" value={item.link} onChange={(value) => updateItem(setAchievements, index, "link", value)} placeholder="https://..." /><label className="profile-field profile-form-full"><span>Description</span><textarea rows="3" value={item.description || ""} onChange={(event) => updateItem(setAchievements, index, "description", event.target.value)} placeholder="What did you achieve?" /></label></div>
      </div>)}</div>
    </section>
    <section className="profile-section cv-card profile-privacy-section"><div className="profile-section-heading"><div><span className="profile-section-kicker"><ShieldCheck size={13} /> PRIVACY</span><h2>Choose what visitors see</h2></div></div><div className="profile-privacy-grid">{[["showEducation", "Show education"], ["showStats", "Show coding statistics"], ["showActivity", "Show recent activity"]].map(([key, label]) => <label key={key} className="profile-privacy-option"><input type="checkbox" checked={privacy[key] !== false} onChange={(event) => setPrivacy((current) => ({ ...current, [key]: event.target.checked }))} /><span>{label}</span></label>)}</div></section>
    <div className="profile-collection-actions"><span className={message.includes("Unable") ? "profile-inline-error" : "profile-notice"} role={message.includes("Unable") ? "alert" : "status"} aria-live="polite">{message}</span><button type="button" className="cv-button-primary" onClick={save} disabled={saving}><Save size={15} /> {saving ? "Saving…" : "Save sections"}</button></div>
  </>;
}

export function CollectionDisplay({ profile, activityHeatmap, activityStats, activityApi, activityEndpoint }) {
  return <>
    {(profile.schoolEducation?.tenth?.school || profile.schoolEducation?.twelfth?.school) && <section className="profile-section cv-card school-record-display"><div className="profile-section-heading"><div><span className="profile-section-kicker">ACADEMIC RECORD</span><h2>School education</h2></div></div><div className="school-record-grid">{[["10th", profile.schoolEducation?.tenth], ["12th", profile.schoolEducation?.twelfth]].map(([label, record]) => record?.school && <article className="school-record" key={label}><div><span className="school-record-level">{label}</span><strong>{record.school}</strong><small>{[record.board, record.stream, record.year].filter(Boolean).join(" · ")}</small></div>{record.percentage !== null && record.percentage !== undefined && <b>{record.percentage}%</b>}{record.reportCardUrl && <a href={record.reportCardUrl} target="_blank" rel="noreferrer">Report card <ExternalLink size={12} /></a>}</article>)}</div></section>}
    <section className="profile-section cv-card"><div className="profile-section-heading"><div><span className="profile-section-kicker"><FolderGit2 size={13} /> PROJECTS</span><h2>Selected work</h2></div></div>{(profile.projects || []).length ? <div className="profile-project-grid">{profile.projects.map((project, index) => <article className="profile-project-card" key={`${project.title}-${index}`}><div><strong>{project.title || "Project"}</strong>{project.featured && <span className="profile-featured-label">Featured</span>}</div><p>{project.description || "A project built by this developer."}</p><div className="profile-skill-list">{(project.technologies || []).map((technology) => <span key={technology}>{technology}</span>)}</div><div className="profile-project-links">{project.sourceUrl && <a href={project.sourceUrl} target="_blank" rel="noreferrer">GitHub <ExternalLink size={12} /></a>}{project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noreferrer">Live demo <ExternalLink size={12} /></a>}</div></article>)}</div> : <p className="profile-empty">No projects added yet.</p>}</section>
    <section className="profile-section cv-card"><div className="profile-section-heading"><div><span className="profile-section-kicker"><Award size={13} /> ACHIEVEMENTS</span><h2>Recognition</h2></div></div>{(profile.achievements || []).length ? <div className="profile-achievement-list">{profile.achievements.map((item, index) => <article className="profile-achievement" key={`${item.title}-${index}`}><Award size={18} /><div><strong>{item.title || "Achievement"}</strong><p>{item.description}</p><small>{[item.issuer, item.date && String(item.date).slice(0, 10)].filter(Boolean).join(" · ")}</small></div></article>)}</div> : <p className="profile-empty">No achievements added yet.</p>}</section>
    <section className="profile-section cv-card"><div className="profile-section-heading"><div><span className="profile-section-kicker"><ShieldCheck size={13} /> CERTIFICATIONS</span><h2>Credentials</h2></div></div>{(profile.certifications || []).length ? <div className="profile-achievement-list">{profile.certifications.map((item, index) => <article className="profile-achievement" key={`${item.name}-${index}`}><ShieldCheck size={18} /><div><strong>{item.name || "Certification"}</strong><p>{item.issuer}</p><small>{item.issuedAt && String(item.issuedAt).slice(0, 10)} {item.credentialUrl && <a href={item.credentialUrl} target="_blank" rel="noreferrer">View credential <ExternalLink size={11} /></a>}</small></div></article>)}</div> : <p className="profile-empty">No certifications added yet.</p>}</section>{(activityHeatmap || profile.activityStats?.activityHeatmap) && <ActivityHeatmap data={activityHeatmap || profile.activityStats.activityHeatmap} stats={activityStats || profile.activityStats} api={activityApi || api} activityEndpoint={activityEndpoint || `/api/profile/${encodeURIComponent(profile.username)}/activity`} />}
  </>;
}

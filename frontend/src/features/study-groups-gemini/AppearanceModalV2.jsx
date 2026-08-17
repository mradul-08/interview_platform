import { useState } from "react";

const colors = ["#f5a623", "#22c55e", "#38bdf8", "#a78bfa", "#fb7185", "#14b8a6"];

export default function AppearanceModalV2({ group, close, save }) {
  const [color, setColor] = useState(group.accentColor || "#f5a623");
  const [avatarText, setAvatarText] = useState(group.avatarText || group.name?.[0] || "");
  const [bannerUrl, setBannerUrl] = useState(group.bannerUrl || "");
  const [zoom, setZoom] = useState(Number(group.bannerZoom) || 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const imageStyle = bannerUrl ? { backgroundImage: `url(${bannerUrl})`, "--sg-preview-zoom": zoom } : { background: color };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await save({ accentColor: color, avatarText, bannerUrl, bannerZoom: zoom });
      close();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Appearance could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  return <div className="sg-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="sg-modal sg-appearance-modal" role="dialog" aria-modal="true" aria-labelledby="sg-appearance-title"><button className="sg-modal-close" type="button" onClick={close} aria-label="Close">×</button><h2 id="sg-appearance-title">Customize group appearance</h2><div className="sg-live-preview sg-adjustable-preview" style={imageStyle}><b>{avatarText || "CV"}</b><span>Live preview</span></div><form className="sg-form" onSubmit={submit}><div className="sg-field"><label>Banner image</label><input value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} placeholder="Paste a direct image URL" /><small className="sg-muted">Use “Copy image address”, not “Copy link address”. Leave empty for a color banner.</small></div><div className="sg-field"><label>Banner zoom</label><div className="sg-zoom-control"><button type="button" onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(1))))} aria-label="Zoom out">−</button><input type="range" min="0.6" max="1.6" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><button type="button" onClick={() => setZoom((value) => Math.min(1.6, Number((value + 0.1).toFixed(1))))} aria-label="Zoom in">+</button><output>{Math.round(zoom * 100)}%</output></div><small className="sg-muted">Zoom out to show the complete banner. Zoom in to focus on its text.</small></div><div className="sg-field"><label>Choose a banner colour</label><div className="sg-color-list">{colors.map((item) => <button key={item} type="button" className={color === item ? "selected" : ""} style={{ background: item }} onClick={() => setColor(item)} aria-label={`Choose banner colour ${item}`} />)}</div><div className="sg-custom-color"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Custom banner colour" /><span>{color.toUpperCase()}</span></div><small className="sg-muted">Choose a preset or pick any custom colour.</small></div><div className="sg-field"><label>Corner text</label><input maxLength="30" value={avatarText} onChange={(event) => setAvatarText(event.target.value.toUpperCase())} placeholder="Your group label" /><small className="sg-muted">Up to 30 characters. This appears on the banner corner.</small></div>{error && <p className="sg-error-text">{error}</p>}<div className="sg-actions"><button type="submit" className="sg-btn accent" disabled={saving}>{saving ? "Saving..." : "Save appearance"}</button><button className="sg-btn" type="button" onClick={close}>Cancel</button></div></form></section></div>;
}

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] caught a render crash:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 360, padding: 24 }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--red-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 8px" }}>
            {this.props.title || "This page hit an error"}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "0 0 16px", lineHeight: 1.6 }}>
            {this.props.description || "Something failed to render. Try again — if it keeps happening, share the details below with support."}
          </p>
          <pre style={{ textAlign: "left", fontSize: 11, color: "var(--red)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 12, marginBottom: 16, maxHeight: 160, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button className="cv-button-primary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Global error boundary — never a blank white page (§92). */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("RED Fit error boundary:", error, info.componentStack);
  }

  private copyDetails = () => {
    const details = `${this.state.error?.name}: ${this.state.error?.message}\n${this.state.error?.stack ?? ""}`;
    void navigator.clipboard?.writeText(details).catch(() => {
      /* clipboard unavailable — nothing to do */
    });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app-shell">
        <div className="app-shell__content app-shell__content--full">
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <p className="empty-state__title" style={{ fontSize: 22 }}>
              Etwas ist schiefgelaufen.
            </p>
            <p className="empty-state__text">RED Fit konnte diese Ansicht nicht laden.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => this.setState({ error: null })}
              >
                Erneut versuchen
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  window.location.href = "/today";
                }}
              >
                Zur Startseite
              </button>
              <button type="button" className="btn btn--ghost" onClick={this.copyDetails}>
                Details kopieren
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * ScamShield Extension — Loading State View
 */

interface LoadingViewProps {
  url: string;
}

export function LoadingView({ url }: LoadingViewProps) {
  let displayUrl = url;
  try {
    const parsed = new URL(url);
    displayUrl = parsed.hostname;
  } catch { /* ignore */ }

  return (
    <div className="ss-popup">
      <header className="ss-header">
        <div className="ss-logo">
          <img src="/assets/logo.png" alt="ScamShield" className="ss-logo-icon" />
          <span className="ss-logo-text">ScamShield</span>
        </div>
      </header>

      <main className="ss-body ss-body--center">
        <div className="ss-spinner" aria-label="Scanning in progress" role="status">
          <div className="ss-spinner-ring" />
          <div className="ss-spinner-ring ss-spinner-ring--2" />
        </div>
        <p className="ss-loading-text">Analyzing <strong>{displayUrl}</strong>…</p>
      </main>

      <footer className="ss-footer">
        <span>by Lunik · Powered by AI</span>
      </footer>
    </div>
  );
}

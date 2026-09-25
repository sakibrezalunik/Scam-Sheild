/**
 * ScamShield Extension — Unsupported Page View
 */

export function UnsupportedView() {
  return (
    <div className="ss-popup">
      <header className="ss-header">
        <div className="ss-logo">
          <svg className="ss-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="ss-logo-text">ScamShield</span>
        </div>
      </header>

      <main className="ss-body ss-body--center">
        <div className="ss-icon ss-icon--warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="ss-unsupported-title">This page cannot be scanned</p>
        <p className="ss-unsupported-desc">
          ScamShield only analyzes websites accessible via HTTP/HTTPS.
          Browser-internal pages are not supported.
        </p>
      </main>

      <footer className="ss-footer">
        <span>ScamShield v1.0.0</span>
      </footer>
    </div>
  );
}

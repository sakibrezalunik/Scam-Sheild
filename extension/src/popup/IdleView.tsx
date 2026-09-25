/**
 * ScamShield Extension — Idle State View
 *
 * Shows the current URL and a "Check this website" button.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ReactNode } from 'react';

interface IdleViewProps {
  url: string;
  onScan: () => void;
}

export function IdleView({ url, onScan }: IdleViewProps) {
  let displayUrl = url;
  try {
    const parsed = new URL(url);
    displayUrl = parsed.hostname;
  } catch {
    // Use raw URL if parsing fails
  }

  return (
    <div className="ss-popup">
      <header className="ss-header">
        <div className="ss-logo">
          <img src="/assets/logo.png" alt="ScamShield" className="ss-logo-icon" />
          <span className="ss-logo-text">ScamShield</span>
        </div>
        <p className="ss-tagline">Check before you click.</p>
      </header>

      <main className="ss-body">
        <div className="ss-url-section">
          <span className="ss-label">Current website</span>
          <p className="ss-url" title={url}>{displayUrl}</p>
        </div>

        <button className="ss-btn ss-btn-primary" onClick={onScan} autoFocus>
          Check this website
        </button>
      </main>

      <footer className="ss-footer">
        <span>by Lunik · Powered by AI</span>
      </footer>
    </div>
  );
}

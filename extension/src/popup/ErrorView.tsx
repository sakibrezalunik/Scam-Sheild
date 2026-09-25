/**
 * ScamShield Extension — Error State View
 */

interface ErrorViewProps {
  message: string;
  code?: string;
  onRetry: () => void;
}

export function ErrorView({ message, code, onRetry }: ErrorViewProps) {
  const isRateLimit = code === 'RATE_LIMITED';

  return (
    <div className="ss-popup">
      <header className="ss-header">
        <div className="ss-logo">
          <img src="/assets/logo.png" alt="ScamShield" className="ss-logo-icon" />
          <span className="ss-logo-text">ScamShield</span>
        </div>
      </header>

      <main className="ss-body ss-body--center">
        <div className={`ss-icon ss-icon--${isRateLimit ? 'warning' : 'error'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {isRateLimit ? (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </>
            )}
          </svg>
        </div>
        <p className="ss-error-title">{isRateLimit ? 'Too many scans' : 'Scan failed'}</p>
        <p className="ss-error-message">{message}</p>
        <button className="ss-btn ss-btn-secondary" onClick={onRetry}>
          {isRateLimit ? 'Try again' : 'Retry'}
        </button>
      </main>

      <footer className="ss-footer">
        <span>ScamShield v1.0.0 · by Lunik</span>
      </footer>
    </div>
  );
}

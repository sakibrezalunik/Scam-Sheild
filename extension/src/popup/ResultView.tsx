/**
 * ScamShield Extension — Result State View
 *
 * Displays the risk score, level, summary, indicators, and recommendations
 * from the backend scan result. No duplicate logic — purely a display layer.
 */

import type { ScanResult } from '../types';

interface ResultViewProps {
  scan: ScanResult;
  onRescan: () => void;
  onOpenFull: (scanId: string) => void;
}

// Risk level color mapping for display
const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  minimal: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  low: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  moderate: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  high: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  critical: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
};

function getRiskColor(level: string) {
  return RISK_COLORS[level] ?? RISK_COLORS.moderate;
}

export function ResultView({ scan, onRescan, onOpenFull }: ResultViewProps) {
  const colors = getRiskColor(scan.riskLevel);
  const riskLabel = scan.riskLevel.charAt(0).toUpperCase() + scan.riskLevel.slice(1);
  const domain = (() => {
    try { return new URL(scan.inputPreview).hostname; } catch { return scan.inputPreview; }
  })();

  // Truncate long URLs for display
  const truncatedUrl = domain.length > 35 ? domain.slice(0, 32) + '…' : domain;

  const handleOpenFull = () => onOpenFull(scan.id);

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
        {/* URL */}
        <div className="ss-url-section">
          <span className="ss-label">Current website</span>
          <p className="ss-url" title={scan.inputPreview}>{truncatedUrl}</p>
        </div>

        {/* Risk Score Card */}
        <div
          className="ss-risk-card"
          style={{ background: colors.bg, borderColor: colors.border }}
          role="status"
          aria-label={`Risk score: ${scan.riskScore} out of 100, ${riskLabel} risk`}
        >
          <div className="ss-risk-score-row">
            <span
              className="ss-risk-score"
              style={{ color: colors.text }}
              aria-label={`${scan.riskScore} out of 100`}
            >
              {scan.riskScore}
              <span className="ss-risk-score-max">/ 100</span>
            </span>
            <span
              className="ss-risk-badge"
              style={{ background: colors.text, color: colors.bg }}
            >
              {riskLabel} RISK
            </span>
          </div>
          <p className="ss-risk-summary">{scan.summary}</p>
        </div>

        {/* Detected Signals */}
        {scan.indicators.length > 0 && (
          <div className="ss-signals-section">
            <h2 className="ss-section-title">Detected signals</h2>
            <ul className="ss-signals-list" role="list">
              {scan.indicators.slice(0, 5).map((ind, i) => (
                <li key={i} className={`ss-signal-item ss-signal-severity-${ind.severity}`}>
                  <span className="ss-signal-dot" />
                  <span className="ss-signal-title">{ind.title}</span>
                  {ind.description && (
                    <span className="ss-signal-desc">{ind.description}</span>
                  )}
                </li>
              ))}
            </ul>
            {scan.indicators.length > 5 && (
              <p className="ss-more-signals">
                +{scan.indicators.length - 5} more signal{scan.indicators.length - 5 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Recommendation */}
        {scan.recommendations.length > 0 && (
          <div className="ss-recommendation">
            <svg className="ss-recommendation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="ss-recommendation-text">
              <strong>Recommendation:</strong> {scan.recommendations[0]}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="ss-actions">
          <button className="ss-btn ss-btn-primary" onClick={handleOpenFull}>
            Open Full Analysis
          </button>
          <button className="ss-btn ss-btn-secondary" onClick={onRescan}>
            Check Another
          </button>
        </div>
      </main>

      <footer className="ss-footer">
        <span>Scan ID: {scan.id.slice(0, 8)}…</span>
        <span>ScamShield v1.0.0 · by Lunik</span>
      </footer>
    </div>
  );
}

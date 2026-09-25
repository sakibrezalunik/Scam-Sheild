/**
 * ScamShield Extension — Popup Root Component
 *
 * Manages popup state: reads the active tab URL, delegates scanning
 * to the background service worker via chrome.runtime.sendMessage,
 * and renders the appropriate UI.
 */

import { useState, useEffect } from 'react';
import type { PopupState, ScanResult } from '../types';
import { IdleView } from './IdleView';
import { LoadingView } from './LoadingView';
import { ResultView } from './ResultView';
import { ErrorView } from './ErrorView';
import { UnsupportedView } from './UnsupportedView';

export default function App() {
  const [state, setState] = useState<PopupState>({ kind: 'idle' });
  const [tabUrl, setTabUrl] = useState<string>('');

  // When popup opens, get the active tab URL via chrome.tabs (activeTab permission)
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setState({ kind: 'error', message: 'This browser is not supported.' });
      return;
    }

    let resolved = false;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (resolved) return;
      resolved = true;

      if (!tabs || tabs.length === 0) {
        setState({ kind: 'error', message: 'Could not detect the current tab.' });
        return;
      }

      const url = tabs[0].url ?? '';
      setTabUrl(url);

      if (!url) {
        setState({ kind: 'invalid-url' });
        return;
      }

      // Reject browser-internal pages
      const internalProtocols = [
        'chrome:', 'chrome-extension:', 'edge:', 'about:',
        'file:', 'devtools:', 'moz-extension:', 'safari-extension:',
      ];
      try {
        const parsed = new URL(url);
        if (internalProtocols.some(p => parsed.protocol === p)) {
          setState({ kind: 'unsupported' });
          return;
        }
        // Accept only http and https
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setState({ kind: 'unsupported' });
          return;
        }
      } catch {
        setState({ kind: 'invalid-url' });
        return;
      }

      setState({ kind: 'idle' });
    });
  }, []);

  // Trigger scan via background service worker
  const handleScan = () => {
    if (!tabUrl || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setState({ kind: 'error', message: 'Scan infrastructure unavailable.' });
      return;
    }

    setState({ kind: 'loading' });

    // Send message to background; wait for response via onMessage handler
    chrome.runtime.sendMessage({ type: 'SCAN_URL', url: tabUrl }, (response) => {
      if (chrome.runtime.lastError) {
        setState({ kind: 'error', message: 'Communication error with background script.' });
        return;
      }

      if (!response) {
        setState({ kind: 'error', message: 'No response from scanner.' });
        return;
      }

      if (response.type === 'SCAN_RESULT') {
        setState({ kind: 'result', scan: response.result as ScanResult });
      } else if (response.type === 'RATE_LIMITED') {
        setState({ kind: 'rate-limited' });
      } else if (response.type === 'SCAN_ERROR') {
        setState({
          kind: 'error',
          message: (response as { message: string }).message,
          code: (response as { code?: string }).code,
        });
      } else {
        setState({ kind: 'error', message: 'Unexpected response from scanner.' });
      }
    });
  };

  // Re-scan from result state
  const handleRescan = () => {
    setState({ kind: 'loading' });
    handleScan();
  };

  // Open full analysis on the web app
  const handleOpenFullAnalysis = (scanId: string) => {
    const baseUrl = (typeof process !== 'undefined' && process.env?.SCAMSHIELD_API_BASE)
      ? process.env.SCAMSHIELD_API_BASE
      : 'http://localhost:3000';
    const fullUrl = `${baseUrl}/results/${scanId}`;
    chrome.tabs.create({ url: fullUrl, active: true });
  };

  // Render based on state
  switch (state.kind) {
    case 'idle':
      return <IdleView url={tabUrl} onScan={handleScan} />;
    case 'loading':
      return <LoadingView url={tabUrl} />;
    case 'result':
      return (
        <ResultView
          scan={state.scan}
          onRescan={handleRescan}
          onOpenFull={handleOpenFullAnalysis}
        />
      );
    case 'error':
      return <ErrorView message={state.message} code={state.code} onRetry={handleScan} />;
    case 'unsupported':
      return <UnsupportedView />;
    case 'rate-limited':
      return (
        <ErrorView
          message="Too many scans. Please wait a moment and try again."
          code="RATE_LIMITED"
          onRetry={handleScan}
        />
      );
    case 'invalid-url':
      return <UnsupportedView />;
    default:
      return <IdleView url={tabUrl} onScan={handleScan} />;
  }
}

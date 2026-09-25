# ScamShield Browser Extension

A Chrome/Firefox/Safari-compatible browser extension that inspects the current webpage and returns a ScamShield URL risk assessment — powered entirely by the existing backend. **No duplicate logic. No second risk engine.**

## What It Does

When you click the ScamShield extension icon, it:

1. Reads the active tab's URL (requires `activeTab` permission only)
2. Sends the URL to the ScamShield backend (`/api/scans/url`) via the background service worker
3. Displays the risk score, risk level badge, detected signals, and recommendation in a lightweight popup

That's it. No auto-scanning, no DOM reading, no content scripts, no background monitoring.

## Architecture

```
┌─────────────────────┐     chrome.runtime    ┌──────────────────────┐
│   Popup (React)     │  ──────────────────►   │  Service Worker      │
│  - URL display      │                        │  - scanUrl()         │
│  - Risk UI          │  ◄──────────────────   │  - response router   │
│  - Actions          │                        └──────────┬───────────┘
└─────────────────────┘                                   │ fetch()
                                                          ▼
                                                   ┌──────────────────┐
                                                   │  Backend API     │
                                                   │  /api/scans/url  │
                                                   └──────────────────┘
```

**Key design decisions:**

- **API calls live in the background service worker**, not the popup. This avoids CORS/CSP issues that would block cross-origin fetches from extension pages.
- **Zero duplicate scanning logic.** The extension is purely a transport + display layer. All risk scoring, detection, and analysis happens in the existing backend.
- **No secrets in code.** The API base URL defaults to `http://localhost:3000` and can be overridden at build time via `SCAMSHIELD_API_BASE`.

## Permissions

| Permission | Purpose |
|---|---|
| `activeTab` | Read the active tab's URL when the user clicks the extension icon |

No `history`, `bookmarks`, `cookies`, `tabs` (broad), or `webRequest` permissions are used.

## Installation

### Local Development

```bash
# From the project root
cd extension
npm install
npm run build        # One-time build
npm run dev          # Watch mode — rebuilds on changes
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/dist` directory

### Production Build

```bash
cd extension
npm run build
# Output goes to extension/dist/
# Load the dist/ directory as an unpacked extension, or package for store submission
```

To target the production API, build with:

```bash
SCAMSHIELD_API_BASE=https://scamshield.app npm run build
```

## Project Structure

```
extension/
  manifest.json           # MV3 manifest — activeTab permission only
  popup.html              # Minimal HTML shell
  vite.config.ts          # Bundler: produces dist/ output
  vitest.config.ts        # Test runner config
  tsconfig.json           # Extension-specific TS config
  package.json            # Dev deps only (React 19, Vite 5, Vitest)
  src/
    types/index.ts        # Shared types (mirrors backend contract)
    api/
      config.ts           # API base URL (env-driven, no secrets)
      client.ts           # fetch() wrapper + URL validation
    background/
      main.ts             # Service worker — message listener
    popup/
      main.tsx            # React entry point
      App.tsx             # Root component — state machine
      IdleView.tsx        # Pre-scan state
      LoadingView.tsx     # Scanning in progress
      ResultView.tsx      # Scan result display
      ErrorView.tsx       # Error states
      UnsupportedView.tsx # Non-HTTP pages
    styles/
      popup.css           # Scoped CSS (.ss- prefix)
    __tests__/
      client.test.ts      # 20 API client tests
      build.test.ts       # 8 manifest/build validation tests
  scripts/
    generate-icons.js     # Generates placeholder PNG icons
  dist/                   # Build output (git-ignored)
```

## Testing

```bash
cd extension
npm test            # Run all tests (28 tests)
npm run test:watch  # Watch mode
npm run typecheck   # TypeScript check
```

## Privacy & Security

- **No data collection.** The extension does not log, track, or transmit anything beyond the URL scan request to the backend the user explicitly triggers.
- **No content scripts.** The extension never reads page content, DOM, forms, or credentials.
- **No automatic scanning.** The user must actively click the extension icon to initiate a scan.
- **CSP-hardened.** The manifest's Content Security Policy restricts script execution to `'self'` only.
- **AbortSignal timeout.** All requests timeout after 15 seconds to prevent hanging.

## Supported Browsers

- Chrome (full support)
- Edge (Chromium-based, full support)
- Firefox (MV3 supported, minor API differences may apply)
- Safari (requires separate packaging — core logic is compatible)

## Extending the Extension

The extension follows a strict separation: **display only, no logic**. To add new features:

1. **New backend endpoints** — Extend the existing `/api/scans/*` routes; the extension just calls them.
2. **New popup views** — Add components in `src/popup/` and wire them into `App.tsx` state machine.
3. **New permissions** — Update `manifest.json` and justify each one in the PR.

Do **not** add:
- Additional scanning logic (duplicates backend)
- Auto-scanning or background tab monitoring
- Content scripts that read page content
- Analytics or telemetry without explicit user consent

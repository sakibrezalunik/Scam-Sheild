"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

/**
 * ScamShield Cinematic Landing Page
 *
 * Single-viewport, full-bleed video background with a centered composition:
 *   Header (nav pill) → Hero (trust → headline → copy → CTA) → Bottom modes
 *
 * Design language: black/white/gray, cinematic, minimal. No cards, no neon.
 * Scan page, auth, admin, extension, desktop, and all scanner logic remain untouched.
 */
export default function ScamShieldLanding() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* ── Background video ─────────────────────────────────────────────── */}
      <video
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        preload="none"
      />

      {/* Dark readability overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-black/40"
        aria-hidden="true"
      />

      {/* ── Main composition ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex h-full flex-col">
        <LandingHeader />
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-6">
          <LandingHero />
        </main>
        <LandingBottom />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   HEADER
└───────────────────────────────────────────────────────────────────────────── */
function LandingHeader() {
  return (
    <header className="ss-header-enter flex w-full items-center justify-center py-4">
      <nav
        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white px-5 py-2 shadow-[var(--ss-nav-shadow)]"
        aria-label="Primary"
      >
        <Logo />

        <div className="mx-2 h-4 w-px bg-neutral-300" aria-hidden="true" />

        <NavLinks />

        <div className="mx-2 h-4 w-px bg-neutral-300" aria-hidden="true" />

        <Link
          href="/login"
          className="ss-focus-ring rounded-full bg-[var(--ss-pill-dark)] px-4 py-1.5 text-sm font-medium text-[var(--ss-sign-in-text)] transition-colors hover:text-white focus-visible:outline-none"
        >
          Sign In
        </Link>
      </nav>
    </header>
  );
}

type NavLink = { label: string; href: string };
const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/scan?type=url" },
];

function NavLinks() {
  return (
    <ul className="flex items-center gap-1">
      {NAV_LINKS.map((link, index) => (
        <li key={index}>
          <Link
            href={link.href}
            className="ss-focus-ring group relative flex flex-col items-center rounded-full px-3 py-1.5 text-sm font-medium text-[var(--ss-nav-text)] transition-colors hover:text-neutral-700 focus-visible:outline-none"
          >
            {link.label}
            {link.href === "/" && (
              <span
                className="mt-0.5 flex gap-0.5"
                aria-hidden="true"
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={i}
                    className="inline-block h-1 w-1 animate-pulse rounded-full bg-black"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   HERO
└───────────────────────────────────────────────────────────────────────────── */
function LandingHero() {
  return (
    <div className="ss-hero-enter flex max-w-3xl flex-col items-center text-center">
      {/* Trust row */}
      <div className="ss-trust-enter mb-8 flex items-center gap-3">
        {["URL", "MESSAGE", "JOB OFFER"].map((mode) => (
          <span
            key={mode}
            className="rounded-full border border-[var(--ss-trust-border)] bg-[var(--ss-trust-bg)] px-3 py-1 text-xs font-medium text-[var(--ss-trust-text)]"
          >
            {mode}
          </span>
        ))}
      </div>

      {/* Headline */}
      <h1 className="mb-5 w-full text-center leading-none text-white">
        <span
          className="ss-headline-line block text-4xl font-bold uppercase tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          style={{ fontFamily: "'BubbledotICG-FinePos', monospace" }}
        >
          CHECK BEFORE
        </span>
        <span
          className="ss-headline-line block text-4xl font-bold uppercase tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          style={{ fontFamily: "'BubbledotICG-FinePos', monospace" }}
        >
          YOU CLICK.
        </span>
      </h1>

      {/* Subhead */}
      <p className="ss-hero-enter mb-10 max-w-xl text-base text-neutral-200 leading-relaxed sm:text-lg">
        Understand the risk behind any link, message, or job offer in seconds.
        Analyze suspicious URLs, messages, and job offers using transparent risk signals
        and AI-assisted analysis.
      </p>

      {/* Primary CTA */}
      <Link
        href="/scan?type=url"
        className="ss-cta-enter inline-flex items-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-lg transition-all hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-white/20 focus-visible:outline-none"
      >
        Start Scanning
      </Link>

      {/* Mode links */}
      <div className="ss-mode-enter mt-10 flex flex-wrap justify-center gap-3">
        <ModeChip label="URL" href="/scan?type=url" />
        <ModeChip label="Message" href="/scan?type=message" />
        <ModeChip label="Job Offer" href="/scan?type=job" />
      </div>
    </div>
  );
}

function ModeChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="ss-focus-ring rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none"
    >
      {label}
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   BOTTOM PRODUCT INFORMATION
└───────────────────────────────────────────────────────────────────────────── */
function LandingBottom() {
  return (
    <footer className="flex w-full items-center justify-center py-4">
      <div className="flex items-center gap-6 text-xs text-neutral-400">
        {[
          { label: "URL Scanner", href: "/scan?type=url" },
          { label: "Message Scanner", href: "/scan?type=message" },
          { label: "Job Offer Scanner", href: "/scan?type=job" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hover:text-white transition-colors focus-visible:outline-none ss-focus-ring rounded-full px-2 py-1"
          >
            {item.label}
          </Link>
        ))}
        <span className="text-neutral-600" aria-hidden="true">
          ·
        </span>
        <span>ScamShield by Lunik</span>
      </div>
    </footer>
  );
}

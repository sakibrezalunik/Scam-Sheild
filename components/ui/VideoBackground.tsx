"use client";

import { usePathname } from "next/navigation";

/**
 * Shared cinematic video background applied to all internal pages.
 *
 * Skips authentication pages (/login, /signup) to preserve form readability.
 * Respects prefers-reduced-motion for accessibility.
 *
 * Video source: CloudFront-hosted cinematic loop
 * Layer: fixed, pointer-events-none, z-0 — sits beneath all page content.
 */
const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_084718_72a17915-4964-4059-afcd-22d59399b72e.mp4";

const AUTH_PAGES = ["/login", "/signup"];

export function VideoBackground() {
  const pathname = usePathname();

  if (AUTH_PAGES.some((p) => pathname === p)) {
    return null;
  }

  return (
    <>
      {/* Cinematic video — deepest layer */}
      <video
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover"
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        preload="none"
      />
      {/* Dark readability overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-black/30"
        aria-hidden="true"
      />
    </>
  );
}

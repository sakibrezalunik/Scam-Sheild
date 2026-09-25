/**
 * ScamShield — Shared Logo Component
 *
 * Renders the official ScamShield branding using the supplied logo asset.
 */
import Link from "next/link";

interface LogoProps {
  /** Use full-width logo with text (default: false) */
  full?: boolean;
  /** Additional className */
  className?: string;
  /** Link href (default: "/") */
  href?: string;
}

export default function Logo({
  full = false,
  className = "",
  href = "/",
}: LogoProps) {
  if (full) {
    return (
      <Link href={href} className={`inline-block ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/scamshield-logo.png"
          alt="ScamShield by Lunik"
          className="h-auto w-full max-w-[220px]"
          width={220}
          height={92}
        />
      </Link>
    );
  }

  return (
    <Link href={href} className={`inline-flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/scamshield-logo.png"
        alt="ScamShield by Lunik"
        className="h-8 w-8 flex-shrink-0"
        width={32}
        height={32}
        style={{ objectFit: "contain" }}
      />
      <div className="flex flex-col leading-none">
        <span className="text-xl font-bold text-slate-900 dark:text-white">
          ScamShield
        </span>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wide">
          by Lunik
        </span>
      </div>
    </Link>
  );
}

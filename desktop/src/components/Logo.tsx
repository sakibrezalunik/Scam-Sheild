/**
 * ScamShield Desktop — Logo Component
 *
 * Renders the official ScamShield branding using the supplied logo asset.
 */
interface LogoProps {
  /** Use full-width logo with text (default: false) */
  full?: boolean;
  /** Show only the shield mark without text */
  iconOnly?: boolean;
  /** Additional className */
  className?: string;
}

export default function Logo({
  full = false,
  iconOnly = false,
  className = "",
}: LogoProps) {
  if (full) {
    return (
      <div className={`inline-block ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/scamshield-logo.png"
          alt="ScamShield by Lunik"
          className="h-auto w-full max-w-[220px]"
          width={220}
          height={92}
        />
      </div>
    );
  }

  if (iconOnly) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/branding/scamshield-logo.png"
        alt="ScamShield by Lunik"
        className={`flex-shrink-0 ${className}`}
        width={32}
        height={32}
        style={{ objectFit: "contain" }}
      />
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
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
        <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
          ScamShield
        </span>
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 tracking-wide">
          by Lunik
        </span>
      </div>
    </div>
  );
}

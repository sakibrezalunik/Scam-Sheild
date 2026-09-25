import { LandingPageFrame, type LandingPageFrameProps } from "./LandingPageFrame";
export { LandingPageFrame, applyBackgroundPresentation } from "./LandingPageFrame";
export type { LandingPageFrameProps, LandingPageProps } from "./LandingPageFrame";

/**
 * Props for SublevelStudioLandingPage — same as LandingPageFrameProps
 * except sourceUrl and title are provided internally.
 */
export type SublevelStudioLandingPageProps = Omit<
  LandingPageFrameProps,
  "sourceUrl" | "title"
>;

/**
 * SublevelStudioLandingPage — ThreeUI experience
 * Adapted for ScamShield as the foundation for the landing page hero.
 *
 * Source: https://threeui.com/source-code/sublevel-studio-landing-page.json
 * SHA-256: 91db5c1bb779687990b01f226a02d7fe7cf7954a40ba8053c4d6b7abf82232e3
 */
export function SublevelStudioLandingPage(props: SublevelStudioLandingPageProps) {
  return (
    <LandingPageFrame
      {...props}
      title="ScamShield — Security Command Center"
      sourceUrl="/landing-pages/sublevel-studio.html"
    />
  );
}

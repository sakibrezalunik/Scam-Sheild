/**
 * Minimal stub for pageTypography — required by LandingPageFrame.
 * ScamShield does not use typography customization, so these are no-ops.
 */

export type PageTypographyProps = {
  type?: string;
};

export type LandingPageCustomization = {
  fontHeading?: string;
  fontBody?: string;
  color?: string;
  backgroundColor?: string;
};

export function splitTypographyProps(
  props: Record<string, unknown>
): [PageTypographyProps, Record<string, unknown>] {
  const { type, ...rest } = props as Record<string, unknown> & { type?: string };
  return [{ type }, rest];
}

export function usePageTypography(
  _typography: Record<string, unknown>,
  _type: string | undefined
): LandingPageCustomization | undefined {
  return undefined;
}

export function applyPageCustomization(
  _frame: HTMLIFrameElement | null,
  _customization: LandingPageCustomization | undefined
): void {
  // No-op — ScamShield manages its own styling
}

export function postPageCustomization(
  _frame: HTMLIFrameElement | null,
  _customization: LandingPageCustomization | undefined
): void {
  // No-op — ScamShield manages its own styling
}

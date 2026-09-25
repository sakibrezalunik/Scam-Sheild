import { RibbonFieldBackground } from "@/shaders/ribbon-field/RibbonFieldBackground";

/**
 * PredictiveArcBackground — ThreeUI RibbonField experience
 *
 * Renders the RibbonField WebGL shader as a fixed background layer behind
 * the scanner UI. Preserves all shader behavior including pointer interaction,
 * responsive resizing, and intersection-observer-based pause/resume.
 *
 * Source: https://threeui.com/source-code/ribbon-field.json
 * Variant: PredictiveArcCanvas / RibbonField
 *
 * The shader produces an animated field of cyan/teal/indigo ribbons with
 * dot-matrix patterning and bloom effects, responding to pointer movement.
 */
export function PredictiveArcBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <RibbonFieldBackground
        className="w-full h-full"
        speed={0.8}
        pointerAmount={0.6}
        smoothing={0.035}
        brightness={1.1}
        opacity={0.85}
        hue={0}
        saturation={0.9}
      />
    </div>
  );
}

import { forwardRef, type HTMLAttributes } from "react";
import "./glass.css";

export interface GlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  /** Regular for short chrome, tinted for controls over busy content. */
  tone?: "regular" | "tinted";
}

/**
 * RED Morph Touch Kit GlassSurface, adapted for RED Fit's semantic tokens.
 * Its frosted fallback is deliberate: RED Morph's SVG refraction is
 * Blink-specific and unsuitable as a required iOS interaction.
 */
export const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(
  function GlassSurface({ tone = "regular", className = "", children, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        className={["redfit-morph-glass", tone === "tinted" ? "redfit-morph-glass--tinted" : "", className]
          .filter(Boolean).join(" ")}
      >
        {children}
      </div>
    );
  },
);

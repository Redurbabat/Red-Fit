import { useEffect, useState } from "react";
import type { AnimationType } from "../../models/exercise";

interface ExerciseAnimationProps {
  type: AnimationType;
  isPlaying?: boolean;
  className?: string;
}

/** Primary highlight color (moving limbs, weights, muscle-load hints). */
const ACCENT = "var(--accent, #ef4444)";
/** Secondary limb color. */
const MUTED = "var(--text-muted, #a1a1aa)";
/** Body/equipment base color; combined with opacity for benches, floors, torsos. */
const BODY = "var(--text, #f4f4f5)";

/** Soft glow derived from the accent token. */
function accentGlow(radius: number): string {
  return `drop-shadow(0 0 ${radius}px color-mix(in srgb, var(--accent, #ef4444) 50%, transparent))`;
}

/** Static mid-movement pose used when paused or when reduced motion is preferred. */
const STATIC_FRAME = 0.58;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Procedural SVG figure animating one of the ten movement categories.
 * Drives a 0..1 frame value with requestAnimationFrame (sine-eased loop);
 * respects prefers-reduced-motion by freezing on a readable mid pose.
 */
export function ExerciseAnimation({
  type,
  isPlaying = true,
  className,
}: ExerciseAnimationProps) {
  const [frame, setFrame] = useState(STATIC_FRAME);

  useEffect(() => {
    if (!isPlaying || prefersReducedMotion()) {
      setFrame(STATIC_FRAME);
      return;
    }

    let active = true;
    let animationFrame = 0;
    const loop = (time: number) => {
      if (!active) return;
      // Cycle between 0 and 1 on a sine wave for a physical ease-in-out.
      setFrame((Math.sin(time * 0.003) + 1) / 2);
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying]);

  const f = frame;

  const renderScene = () => {
    switch (type) {
      case "push": {
        // Bench press: barbell lowers and rises, arms flex at the elbows.
        const barY = 95 - f * 45;
        const handY = barY;
        const elbowY = 125 - f * 20;
        const elbowXLeft = 60 - f * 10;
        const elbowXRight = 140 + f * 10;

        return (
          <g>
            {/* Flat bench */}
            <line x1="30" y1="140" x2="170" y2="140" stroke={BODY} strokeOpacity="0.15" strokeWidth="6" strokeLinecap="round" />
            <line x1="50" y1="140" x2="50" y2="170" stroke={BODY} strokeOpacity="0.1" strokeWidth="4" />
            <line x1="150" y1="140" x2="150" y2="170" stroke={BODY} strokeOpacity="0.1" strokeWidth="4" />

            {/* Torso (lying down) */}
            <path d="M 60,132 L 140,132" stroke={BODY} strokeOpacity="0.3" strokeWidth="12" strokeLinecap="round" />
            {/* Head */}
            <circle cx="150" cy="130" r="10" fill={BODY} fillOpacity="0.4" />

            {/* Left arm */}
            <polyline
              points={`65,130 ${elbowXLeft},${elbowY} 50,${handY}`}
              fill="none"
              stroke={MUTED}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right arm */}
            <polyline
              points={`135,130 ${elbowXRight},${elbowY} 150,${handY}`}
              fill="none"
              stroke={MUTED}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Barbell bar */}
            <line x1="30" y1={barY} x2="170" y2={barY} stroke={BODY} strokeWidth="3" />
            {/* Weight plates */}
            <rect x="20" y={barY - 15} width="10" height="30" rx="2" fill={ACCENT} filter={accentGlow(6)} />
            <rect x="170" y={barY - 15} width="10" height="30" rx="2" fill={ACCENT} filter={accentGlow(6)} />

            {/* Pulsing force field */}
            <circle cx="100" cy="132" r={15 + f * 10} fill="none" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 3" opacity={1 - f} />
          </g>
        );
      }

      case "pull": {
        // Lat pulldown / rowing: bar is pulled down, shoulder blades squeeze.
        const barY = 50 + f * 45;
        const handY = barY;
        const elbowY = 50 + f * 55;
        const elbowXLeft = 65 - f * 15;
        const elbowXRight = 135 + f * 15;

        return (
          <g>
            {/* Pulldown seat */}
            <path d="M 80,150 L 120,150" stroke={BODY} strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" />
            <line x1="100" y1="150" x2="100" y2="180" stroke={BODY} strokeOpacity="0.15" strokeWidth="4" />

            {/* Pulley column */}
            <line x1="100" y1="30" x2="100" y2="50" stroke={BODY} strokeOpacity="0.1" strokeWidth="2" />
            {/* Cables */}
            <line x1="100" y1="30" x2="55" y2={barY} stroke={BODY} strokeOpacity="0.4" strokeWidth="1" />
            <line x1="100" y1="30" x2="145" y2={barY} stroke={BODY} strokeOpacity="0.4" strokeWidth="1" />

            {/* Seated body: spine */}
            <path d="M 100,150 L 100,105" stroke={BODY} strokeOpacity="0.3" strokeWidth="10" strokeLinecap="round" />
            {/* Head */}
            <circle cx="100" cy="90" r="10" fill={BODY} fillOpacity="0.4" />

            {/* Left arm */}
            <polyline
              points={`90,105 ${elbowXLeft},${elbowY} 55,${handY}`}
              fill="none"
              stroke={MUTED}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right arm */}
            <polyline
              points={`110,105 ${elbowXRight},${elbowY} 145,${handY}`}
              fill="none"
              stroke={MUTED}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Pulldown bar */}
            <line x1="45" y1={barY} x2="155" y2={barY} stroke={BODY} strokeWidth="3" strokeLinecap="round" />
            <circle cx="45" cy={barY} r="3" fill={ACCENT} />
            <circle cx="155" cy={barY} r="3" fill={ACCENT} />

            {/* Squeezed-back indicator */}
            <path
              d="M 90,115 Q 100,118 110,115"
              fill="none"
              stroke={ACCENT}
              strokeWidth="2"
              strokeLinecap="round"
              opacity={f}
              filter={accentGlow(3)}
            />
          </g>
        );
      }

      case "squat": {
        // Squat: hips travel down, knees bend forward, barbell rides on the neck.
        const hipY = 100 + f * 45;
        const kneeY = 145;
        const kneeX = 85 + f * 20;
        const ankleX = 90;
        const ankleY = 175;
        const barY = 55 + f * 42;

        return (
          <g>
            {/* Floor */}
            <line x1="30" y1="180" x2="170" y2="180" stroke={BODY} strokeOpacity="0.15" strokeWidth="4" />

            {/* Torso/spine */}
            <line x1="105" y1={barY + 5} x2="100" y2={hipY} stroke={BODY} strokeOpacity="0.4" strokeWidth="8" strokeLinecap="round" />
            {/* Thigh (hip to knee) */}
            <line x1="100" y1={hipY} x2={kneeX} y2={kneeY} stroke={MUTED} strokeWidth="5" strokeLinecap="round" />
            {/* Shin (knee to ankle) */}
            <line x1={kneeX} y1={kneeY} x2={ankleX} y2={ankleY} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
            {/* Foot */}
            <line x1={ankleX} y1={ankleY} x2={ankleX - 12} y2={ankleY + 4} stroke={BODY} strokeOpacity="0.3" strokeWidth="5" strokeLinecap="round" />

            {/* Head (tilted slightly up) */}
            <circle cx="107" cy={barY - 10} r="9" fill={BODY} fillOpacity="0.4" />

            {/* Barbell on upper traps */}
            <line x1="45" y1={barY} x2="155" y2={barY} stroke={BODY} strokeWidth="4" strokeLinecap="round" />
            <circle cx="45" cy={barY} r="10" fill={ACCENT} filter={accentGlow(5)} />
            <circle cx="155" cy={barY} r="10" fill={ACCENT} filter={accentGlow(5)} />

            {/* Muscle load indicator (quads) */}
            <path
              d={`M ${kneeX + 5},${kneeY - 15} Q ${kneeX + 15},${(hipY + kneeY) / 2} ${100 + 5},${hipY - 5}`}
              fill="none"
              stroke={ACCENT}
              strokeWidth="2.5"
              opacity={f}
            />
          </g>
        );
      }

      case "hinge": {
        // Deadlift/hinge: hips push back, back stays flat, bar travels floor to knee.
        const hipX = 80 - f * 25;
        const hipY = 110 + f * 20;
        const kneeX = 100 - f * 8;
        const kneeY = 150;
        const barY = 155 - f * 60;
        const barX = 115;

        return (
          <g>
            {/* Floor */}
            <line x1="30" y1="180" x2="170" y2="180" stroke={BODY} strokeOpacity="0.15" strokeWidth="4" />

            {/* Foot/ankle to knee */}
            <line x1="110" y1="175" x2={kneeX} y2={kneeY} stroke={BODY} strokeOpacity="0.3" strokeWidth="4" />
            {/* Knee to hip */}
            <line x1={kneeX} y1={kneeY} x2={hipX} y2={hipY} stroke={MUTED} strokeWidth="5" />

            {/* Flat back (hip to shoulder) */}
            <line x1={hipX} y1={hipY} x2={hipX + 35 + f * 15} y2={hipY - 50 + f * 35} stroke={BODY} strokeWidth="7" strokeLinecap="round" />

            {/* Head */}
            <circle cx={hipX + 45 + f * 15} cy={hipY - 60 + f * 35} r="9" fill={BODY} fillOpacity="0.4" />

            {/* Arms (shoulder to bar) */}
            <line x1={hipX + 35 + f * 15} y1={hipY - 50 + f * 35} x2={barX} y2={barY} stroke={MUTED} strokeWidth="3" />

            {/* Barbell */}
            <circle cx={barX} cy={barY} r="10" fill={ACCENT} filter={accentGlow(6)} />
            <line x1={barX - 20} y1={barY} x2={barX + 20} y2={barY} stroke={BODY} strokeWidth="2.5" />

            {/* Energy arrow */}
            <path
              d={`M ${hipX - 10},${hipY} Q ${hipX - 25},${hipY - 20} ${hipX - 10},${hipY - 40}`}
              fill="none"
              stroke={ACCENT}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity={f}
            />
          </g>
        );
      }

      case "press": {
        // Overhead press: standing, barbell travels from chin to overhead lockout.
        const barY = 95 - f * 60;
        const elbowY = 125 - f * 55;
        const elbowXLeft = 70 - f * 10;
        const elbowXRight = 130 + f * 10;

        return (
          <g>
            {/* Floor */}
            <line x1="30" y1="180" x2="170" y2="180" stroke={BODY} strokeOpacity="0.15" strokeWidth="4" />

            {/* Torso and legs */}
            <line x1="100" y1="180" x2="100" y2="125" stroke={BODY} strokeOpacity="0.3" strokeWidth="6" strokeLinecap="round" />
            <circle cx="100" cy="110" r="10" fill={BODY} fillOpacity="0.4" />

            {/* Left arm */}
            <polyline
              points={`90,120 ${elbowXLeft},${elbowY} 75,${barY}`}
              fill="none"
              stroke={MUTED}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Right arm */}
            <polyline
              points={`110,120 ${elbowXRight},${elbowY} 125,${barY}`}
              fill="none"
              stroke={MUTED}
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Barbell */}
            <line x1="45" y1={barY} x2="155" y2={barY} stroke={BODY} strokeWidth="3" strokeLinecap="round" />
            <circle cx="45" cy={barY} r="8" fill={ACCENT} filter={accentGlow(5)} />
            <circle cx="155" cy={barY} r="8" fill={ACCENT} filter={accentGlow(5)} />

            {/* Deltoid glow */}
            <circle cx="85" cy="120" r={4 + f * 5} fill={ACCENT} opacity={f * 0.7} />
            <circle cx="115" cy="120" r={4 + f * 5} fill={ACCENT} opacity={f * 0.7} />
          </g>
        );
      }

      case "curl": {
        // Biceps curl: elbow fixed at the side, forearm pivots upward.
        const handAngle = Math.PI - (0.3 + f * 1.5);
        const handX = 100 + Math.cos(handAngle) * 45;
        const handY = 120 + Math.sin(handAngle) * 45;

        return (
          <g>
            {/* Body */}
            <line x1="75" y1="170" x2="75" y2="90" stroke={BODY} strokeOpacity="0.25" strokeWidth="8" strokeLinecap="round" />
            <circle cx="75" cy="72" r="10" fill={BODY} fillOpacity="0.3" />

            {/* Upper arm (shoulder to elbow) — stays still */}
            <line x1="75" y1="95" x2="100" y2="120" stroke={MUTED} strokeWidth="5" strokeLinecap="round" />

            {/* Forearm (elbow to hand) — moves */}
            <line x1="100" y1="120" x2={handX} y2={handY} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />

            {/* Dumbbell in hand */}
            <line x1={handX - 12} y1={handY - 12} x2={handX + 12} y2={handY + 12} stroke={BODY} strokeWidth="4" />
            <circle cx={handX - 12} cy={handY - 12} r="5" fill={ACCENT} filter={accentGlow(4)} />
            <circle cx={handX + 12} cy={handY + 12} r="5" fill={ACCENT} filter={accentGlow(4)} />

            {/* Biceps peak bubble */}
            <circle cx="86" cy="105" r={2 + f * 6} fill={ACCENT} opacity={f} />
          </g>
        );
      }

      case "crunch": {
        // Crunch: lying with knees bent, head and shoulders curl upward.
        const crunchX = 120 - f * 12;
        const crunchY = 128 - f * 15;

        return (
          <g>
            {/* Mat */}
            <line x1="30" y1="150" x2="170" y2="150" stroke={BODY} strokeOpacity="0.15" strokeWidth="4" />

            {/* Hip (fixed on mat) */}
            <circle cx="90" cy="140" r="5" fill={BODY} fillOpacity="0.4" />

            {/* Legs (bent) */}
            <polyline points="90,140 60,110 35,145" fill="none" stroke={BODY} strokeOpacity="0.3" strokeWidth="5" strokeLinecap="round" />

            {/* Spine curling up */}
            <line x1="90" y1="140" x2={crunchX} y2={crunchY} stroke={MUTED} strokeWidth="6" strokeLinecap="round" />
            {/* Head */}
            <circle cx={crunchX + 12} cy={crunchY - 12} r="9" fill={BODY} fillOpacity="0.4" />

            {/* Hands cradling the head */}
            <line x1={crunchX} y1={crunchY - 5} x2={crunchX + 15} y2={crunchY - 15} stroke={ACCENT} strokeWidth="3.5" strokeLinecap="round" />

            {/* Abs contraction line */}
            <path
              d="M 98,135 Q 110,132 108,142"
              fill="none"
              stroke={ACCENT}
              strokeWidth="2.5"
              opacity={f}
              filter={accentGlow(4)}
            />
          </g>
        );
      }

      case "plank": {
        // Static plank posture with pulsing core highlights.
        const pulseSize = 2 + f * 3;

        return (
          <g>
            {/* Floor */}
            <line x1="30" y1="150" x2="170" y2="150" stroke={BODY} strokeOpacity="0.15" strokeWidth="4" />

            {/* Toes */}
            <circle cx="140" cy="146" r="3" fill={BODY} fillOpacity="0.4" />

            {/* Forearm resting and upper arm */}
            <polyline points="55,146 70,146 65,120" fill="none" stroke={BODY} strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />

            {/* Rigid body line (ankle to hip to shoulder) */}
            <polyline points="140,140 100,123 65,120" fill="none" stroke={MUTED} strokeWidth="6" strokeLinecap="round" />

            {/* Head */}
            <circle cx="55" cy="112" r="8" fill={BODY} fillOpacity="0.4" />

            {/* Glowing core zone (plank tension) */}
            <rect x="80" y="115" width="30" height="15" rx="5" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="95" cy="122" r={pulseSize} fill={ACCENT} filter={accentGlow(5)} />
            <circle cx="85" cy="121" r={pulseSize * 0.7} fill={ACCENT} />
            <circle cx="105" cy="123" r={pulseSize * 0.7} fill={ACCENT} />
          </g>
        );
      }

      case "lunges": {
        // Lunge: front leg steps and bends, back knee lowers toward the floor.
        const frontKneeX = 65 - f * 12;
        const frontKneeY = 145 + f * 15;
        const hipY = 100 + f * 25;
        const backKneeX = 110 + f * 12;
        const backKneeY = 125 + f * 35;

        return (
          <g>
            {/* Floor */}
            <line x1="30" y1="180" x2="170" y2="180" stroke={BODY} strokeOpacity="0.15" strokeWidth="4" />

            {/* Torso */}
            <line x1="90" y1={hipY} x2="90" y2={hipY - 45} stroke={BODY} strokeOpacity="0.3" strokeWidth="7" strokeLinecap="round" />
            <circle cx="90" cy={hipY - 55} r="9" fill={BODY} fillOpacity="0.4" />

            {/* Front leg (hip to knee to foot) */}
            <polyline
              points={`90,${hipY} ${frontKneeX},${frontKneeY} 45,175`}
              fill="none"
              stroke={ACCENT}
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Back leg (hip to knee to foot) */}
            <polyline
              points={`90,${hipY} ${backKneeX},${backKneeY} 135,175`}
              fill="none"
              stroke={MUTED}
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Weights in hands */}
            <line x1="80" y1={hipY - 15} x2="80" y2={hipY + 15} stroke={BODY} strokeWidth="2.5" />
            <circle cx="80" cy={hipY - 15} r="4" fill={ACCENT} />
            <circle cx="80" cy={hipY + 15} r="4" fill={ACCENT} />
          </g>
        );
      }

      case "raise": {
        // Leg raise/extension: seated, knee pivots from bent to fully extended.
        const footAngle = -(f * 1.4);
        const footX = 100 + Math.cos(footAngle) * 50;
        const footY = 125 + Math.sin(footAngle) * 50;

        return (
          <g>
            {/* Bench chair */}
            <polyline points="50,125 100,125 100,165" fill="none" stroke={BODY} strokeOpacity="0.2" strokeWidth="5" strokeLinecap="round" />

            {/* Seated torso */}
            <line x1="60" y1="125" x2="60" y2="70" stroke={BODY} strokeOpacity="0.3" strokeWidth="7" strokeLinecap="round" />
            <circle cx="60" cy="55" r="9" fill={BODY} fillOpacity="0.4" />

            {/* Thigh (hip to knee) */}
            <line x1="60" y1="125" x2="100" y2="125" stroke={MUTED} strokeWidth="5" strokeLinecap="round" />

            {/* Moving shin (knee to foot) */}
            <line x1="100" y1="125" x2={footX} y2={footY} stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />

            {/* Quad load path */}
            <path d="M 70,121 Q 85,112 100,121" fill="none" stroke={ACCENT} strokeWidth="3" opacity={f} />
            <circle cx={footX} cy={footY} r="4" fill={BODY} filter={accentGlow(3)} />
          </g>
        );
      }

      default:
        return <circle cx="100" cy="100" r="40" fill="none" stroke={ACCENT} strokeWidth="2" />;
    }
  };

  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {renderScene()}
    </svg>
  );
}

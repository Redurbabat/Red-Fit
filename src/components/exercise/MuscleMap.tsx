import type { MuscleGroup } from "../../models/exercise";
import { muscleGroupLabels } from "../../utils/labels";

interface MuscleMapProps {
  /** Hauptsächlich beanspruchte Muskelgruppe (rot). */
  primary: MuscleGroup;
  /** Sekundär beanspruchte Muskelgruppen (orange). */
  secondary?: MuscleGroup[];
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Geometrie-Helfer                                                    */
/* ------------------------------------------------------------------ */

type Pt = readonly [number, number];
/** Kubisches Bezier-Segment: Kontrollpunkt 1, Kontrollpunkt 2, Endpunkt. */
type Curve = readonly [Pt, Pt, Pt];

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10);
}

function pt(p: Pt): string {
  return `${fmt(p[0])} ${fmt(p[1])}`;
}

/**
 * Baut aus einer rechten Konturhälfte (Start und Ende auf der Mittellinie
 * x = 0) einen geschlossenen, exakt symmetrischen Pfad: erst die rechte
 * Seite hinunter, dann gespiegelt und rückwärts die linke Seite hinauf.
 */
function symmetricPath(start: Pt, half: readonly Curve[]): string {
  const mirror = (p: Pt): Pt => [-p[0], p[1]];
  const parts: string[] = [`M ${pt(start)}`];
  for (const [c1, c2, end] of half) {
    parts.push(`C ${pt(c1)} ${pt(c2)} ${pt(end)}`);
  }
  for (let i = half.length - 1; i >= 0; i -= 1) {
    const [c1, c2] = half[i];
    const prev = i === 0 ? start : half[i - 1][2];
    parts.push(`C ${pt(mirror(c2))} ${pt(mirror(c1))} ${pt(mirror(prev))}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* Silhouette (beide Ansichten teilen sich die Grundform)              */
/* Lokales Koordinatensystem: Mittellinie x = 0, Scheitel y = 11.      */
/* ------------------------------------------------------------------ */

const SILHOUETTE_START: Pt = [0, 11];
const SILHOUETTE_HALF: readonly Curve[] = [
  [[7.5, 11], [13.5, 19], [13.5, 29]], // Kopf, Seite
  [[13.5, 36.4], [10.2, 43.4], [5.6, 46]], // Kopf -> Kiefer
  [[5.9, 49.5], [6.3, 52], [6.9, 54.5]], // Hals
  [[12.5, 56.5], [19.5, 57.5], [24, 59.5]], // Trapezlinie -> Schulter
  [[30, 61.5], [35, 65.5], [35.8, 72]], // Deltakappe
  [[36.2, 79], [35.4, 90], [34.9, 99]], // Oberarm, außen
  [[34.5, 108], [34.4, 115], [34.5, 121]], // -> Ellenbogen außen
  [[34.9, 128], [34, 137], [32.8, 145]], // Unterarm, außen
  [[31.6, 153], [30.9, 160], [30.7, 166]], // -> Handgelenk außen
  [[31.3, 171], [31.4, 176], [30.2, 181]], // Hand, außen
  [[28.9, 186], [25.4, 186.8], [24, 183]], // um die Finger
  [[23.2, 180.6], [23.4, 173.5], [24.2, 167.5]], // -> Handgelenk innen
  [[23.8, 159], [24.6, 149], [26.4, 138]], // Unterarm, innen
  [[27.2, 131], [27.5, 127], [27.2, 123]], // -> Ellenbogen innen
  [[26.4, 114], [24.6, 101], [23.2, 92]], // Oberarm, innen
  [[22.6, 88.5], [22.1, 86], [21.5, 84]], // -> Achsel
  [[20, 95], [17.6, 107], [16.6, 116]], // Rumpf -> Taille
  [[16.6, 124], [19.8, 132], [22.6, 139]], // Taille -> Hüfte
  [[24.2, 143], [24.8, 147], [24.8, 151]], // Hüfte -> Oberschenkel außen
  [[24.2, 168], [22.2, 190], [19.6, 206]], // Oberschenkel, außen
  [[18.2, 214], [16.8, 218], [16.4, 224]], // -> Knie außen
  [[17.4, 230], [17.8, 238], [17.6, 246]], // Wadenbauch, außen
  [[17, 262], [14.4, 274], [11.6, 282]], // Wade -> Knöchel
  [[10.8, 284.4], [10.4, 286], [10.4, 288]], // Knöchel außen
  [[11, 292], [12.6, 294.6], [14, 296.4]], // Fuß, außen
  [[15.2, 298.4], [14.6, 300.8], [11.6, 301.2]], // Zehen
  [[9, 301.5], [5.2, 301.5], [4.2, 299.4]], // Sohle -> Ferse innen
  [[3.6, 297.6], [4.4, 293], [4.8, 288.6]], // Knöchel innen
  [[4.6, 280], [5, 270], [6.4, 258]], // Wade, innen
  [[7.8, 250], [8.6, 236], [8, 226]], // -> Knie innen
  [[8, 214], [7.6, 200], [6.8, 188]], // Oberschenkel, innen
  [[6, 176], [4.6, 165], [2.4, 159]],
  [[1.6, 157], [0.8, 156.2], [0, 156]], // Schritt (Mittellinie)
];

const SILHOUETTE = symmetricPath(SILHOUETTE_START, SILHOUETTE_HALF);

/* ------------------------------------------------------------------ */
/* Muskelregionen (rechte Seite bzw. mittig; paired spiegelt links)    */
/* ------------------------------------------------------------------ */

const CHEST_D =
  "M 1.2 63 C 7 62.2 13.6 62.8 17.8 65 C 19.9 69.6 20.4 75.4 19.5 80.6 " +
  "C 17.7 88.4 10.4 91.2 4.2 89.6 C 2 89 1.1 87 1.1 84.2 C 1 77.2 1 69.6 1.2 63 Z";

const DELT_D =
  "M 20.5 60.6 C 25.8 61.2 30.6 63.8 33.2 67.6 C 34.6 70 34.9 73 34.4 76 " +
  "C 33.8 79.6 30.6 81.4 27.6 80 C 24.4 78.4 21.8 74.4 20.4 69.8 C 19.7 67 19.6 63.4 20.5 60.6 Z";

const BICEPS_D =
  "M 27.4 85.4 C 30.4 84.4 33 85.8 33.9 89 C 34.9 93.8 34.7 100.8 33.6 107.2 " +
  "C 33.1 110.4 31.8 112.8 30.2 114.4 C 28.8 115.8 27.1 115 26.7 112.8 " +
  "C 25.8 107.4 25.8 99.6 26.6 92.6 C 26.9 89.8 27 86.9 27.4 85.4 Z";

const TRICEPS_D =
  "M 27.8 85 C 30.8 84.2 33.4 85.6 34.1 88.8 C 34.9 93.6 34.4 101.6 33.7 108 " +
  "C 33.6 112 32.4 114.6 30.8 116.4 C 29.4 117.8 27.6 117 27.2 114.8 " +
  "C 26.2 108.8 26.2 100 27 92.4 C 27.2 89.6 27.4 86.6 27.8 85 Z";

const FOREARM_D =
  "M 30 127.5 C 31.8 127 33.2 128.2 33.4 130.4 C 33.8 135 32.8 142 31.4 148.6 " +
  "C 30.5 152.8 29.6 157 28.8 160.4 C 28.4 162.2 26.8 162.4 26.3 160.6 " +
  "C 25.5 156.8 25.7 149.4 26.4 142.4 C 26.9 137.4 27.7 131.6 28.7 128.8 C 29 127.9 29.5 127.6 30 127.5 Z";

const ABS_D =
  "M -6.8 94.5 C -2.4 93.4 2.4 93.4 6.8 94.5 C 7.8 101 8 112 7.4 122 " +
  "C 7 130 6 139 4.4 146.2 C 3.6 149.6 1.8 151.2 0 151.2 C -1.8 151.2 -3.6 149.6 -4.4 146.2 " +
  "C -6 139 -7 130 -7.4 122 C -8 112 -7.8 101 -6.8 94.5 Z";

/** Dezente Segmentlinien auf dem Rectus (nur Dekor, kein eigener Muskel). */
const ABS_DETAIL_D =
  "M -6.4 106 Q 0 107.6 6.4 106 M -6.9 117.2 Q 0 118.6 6.9 117.2 " +
  "M -6.2 128.4 Q 0 129.6 6.2 128.4 M 0 95.4 L 0 150.4";

const OBLIQUES_D =
  "M 9.6 101 C 12 102.4 13.9 105.4 14.7 109.4 C 15.6 114.4 15.2 121.2 14 127.4 " +
  "C 13.2 131.4 11.7 135.2 10 137.4 C 9 138.6 8.6 137.8 8.7 135.8 " +
  "C 9.1 125 9.2 112.4 9.2 103.4 C 9.2 101.2 9.2 100.8 9.6 101 Z";

const QUADS_D =
  "M 12.6 154 C 16.8 153.2 20.8 155 22.3 158.6 C 23.4 163 23 171.6 21.9 180.6 " +
  "C 20.8 189.6 19 199.6 17 207 C 15.8 211.2 13.9 214.2 12 214.2 C 10.2 214.2 9.2 211.4 8.9 206.8 " +
  "C 8.4 196 8.3 180 9 168.4 C 9.4 161.8 10.2 155.2 12.6 154 Z";

const SHINS_D =
  "M 12.2 233 C 14.2 232.6 15.8 234 16.1 236.8 C 16.6 242 16 250 14.8 258 " +
  "C 13.9 263.8 12.8 270 11.6 275 C 11 277.6 9.5 277.8 8.9 275.2 " +
  "C 8 270.4 7.8 261 8.3 252 C 8.7 245 9.5 237 10.5 234.4 C 11 233.4 11.6 233.1 12.2 233 Z";

const TRAPS_D =
  "M 0 51 C 3.4 51.4 5.4 53.4 7 56.6 C 11 58.2 14.6 59.6 17 61.4 " +
  "C 14.8 63 11.8 64.8 9.6 67.6 C 6.4 71.8 3.4 82 1.6 92.2 C 1 95.6 -1 95.6 -1.6 92.2 " +
  "C -3.4 82 -6.4 71.8 -9.6 67.6 C -11.8 64.8 -14.8 63 -17 61.4 " +
  "C -14.6 59.6 -11 58.2 -7 56.6 C -5.4 53.4 -3.4 51.4 0 51 Z";

const LATS_D =
  "M 7.2 80.6 C 11.2 81.6 15.6 82.6 19 82.8 C 19.8 87.6 19.2 93.6 17.4 99.4 " +
  "C 15 106.6 11.4 114.2 7.8 119.2 C 6.4 121 5.5 120.4 5.5 118 " +
  "C 5.6 107.6 6.2 91.6 6.6 83 C 6.7 81.2 6.8 80.5 7.2 80.6 Z";

const LOWER_BACK_D =
  "M -3.4 99 C -1.2 98.4 1.2 98.4 3.4 99 C 4.1 103 4.3 110 4.1 117 " +
  "C 3.9 122 3.4 127.6 2.6 131.6 C 2.1 134 -2.1 134 -2.6 131.6 " +
  "C -3.4 127.6 -3.9 122 -4.1 117 C -4.3 110 -4.1 103 -3.4 99 Z";

const GLUTES_D =
  "M 2 141 C 7.4 138.2 14.4 138.4 18.6 141.4 C 21.4 143.4 22.6 147.4 22.4 151.8 " +
  "C 22.2 158 19.6 164.4 15 167.8 C 11.4 170.4 7.6 170 6.2 166.8 " +
  "C 5 164 3.6 160 2 156 C 1.2 150.6 1.2 144.6 2 141 Z";

const HAMSTRINGS_D =
  "M 12.4 175 C 15.8 174.2 19 175.2 20.2 178.2 C 21.2 182 20.7 190 19.4 197.6 " +
  "C 18.4 203.6 16.8 209.6 14.8 213.4 C 13.4 216 11.2 216.2 10 213.6 " +
  "C 8.9 210.4 8.5 202 8.5 193 C 8.5 186 9.1 178.6 10.4 176.4 C 10.9 175.5 11.6 175.2 12.4 175 Z";

const CALVES_D =
  "M 11.8 231 C 14.6 230.4 16 232 16.4 235.4 C 16.9 241.4 16.4 250 15.2 258.4 " +
  "C 14.3 264.4 13 271 11.7 275.6 C 11 278 9.4 278 8.9 275.6 " +
  "C 8.6 270.2 8.4 262 8.5 253 C 8.6 245.4 9.2 236.6 10 233 C 10.4 231.4 10.9 231.2 11.8 231 Z";

/* ------------------------------------------------------------------ */
/* Regionen und Zuordnung MuscleGroup -> Regionen                      */
/* ------------------------------------------------------------------ */

const REGION_IDS = [
  "chest",
  "frontDelts",
  "biceps",
  "frontForearms",
  "abs",
  "obliques",
  "quads",
  "shins",
  "traps",
  "lats",
  "lowerBack",
  "rearDelts",
  "triceps",
  "rearForearms",
  "glutes",
  "hamstrings",
  "calves",
] as const;
type RegionId = (typeof REGION_IDS)[number];

type View = "front" | "back";

interface RegionShape {
  id: RegionId;
  view: View;
  d: string;
  /** Zusätzlich an der Mittellinie gespiegelt rendern (Muskelpaar). */
  paired?: boolean;
}

const REGION_SHAPES: readonly RegionShape[] = [
  // Vorderansicht
  { id: "chest", view: "front", d: CHEST_D, paired: true },
  { id: "frontDelts", view: "front", d: DELT_D, paired: true },
  { id: "biceps", view: "front", d: BICEPS_D, paired: true },
  { id: "frontForearms", view: "front", d: FOREARM_D, paired: true },
  { id: "abs", view: "front", d: ABS_D },
  { id: "obliques", view: "front", d: OBLIQUES_D, paired: true },
  { id: "quads", view: "front", d: QUADS_D, paired: true },
  { id: "shins", view: "front", d: SHINS_D, paired: true },
  // Rückansicht
  { id: "traps", view: "back", d: TRAPS_D },
  { id: "rearDelts", view: "back", d: DELT_D, paired: true },
  { id: "lats", view: "back", d: LATS_D, paired: true },
  { id: "lowerBack", view: "back", d: LOWER_BACK_D },
  { id: "triceps", view: "back", d: TRICEPS_D, paired: true },
  { id: "rearForearms", view: "back", d: FOREARM_D, paired: true },
  { id: "glutes", view: "back", d: GLUTES_D, paired: true },
  { id: "hamstrings", view: "back", d: HAMSTRINGS_D, paired: true },
  { id: "calves", view: "back", d: CALVES_D, paired: true },
];

const GROUP_REGIONS: Record<MuscleGroup, readonly RegionId[]> = {
  chest: ["chest"],
  back: ["traps", "lats", "lowerBack"],
  shoulders: ["frontDelts", "rearDelts"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  abs: ["abs", "obliques"],
  legs: ["quads", "hamstrings"],
  glutes: ["glutes"],
  calves: ["shins", "calves"],
  forearms: ["frontForearms", "rearForearms"],
  fullBody: REGION_IDS,
  cardio: [],
  mobility: [],
};

/* ------------------------------------------------------------------ */
/* Farben                                                              */
/* ------------------------------------------------------------------ */

const PRIMARY_FILL = "var(--accent, #ef4444)";
const SECONDARY_FILL = "var(--accent-2, #f97316)";
const INACTIVE_FILL = "var(--surface-3, #2b2d34)";
const BODY_FILL = "var(--surface-2, #222329)";
const BODY_STROKE = "var(--border, rgba(255, 255, 255, 0.12))";
const DETAIL_STROKE = "var(--bg, #0f1012)";

type Tone = "primary" | "secondary";

/* ------------------------------------------------------------------ */
/* Teil-Rendering                                                      */
/* ------------------------------------------------------------------ */

interface BodyFigureProps {
  view: View;
  /** Mittellinie des Körpers in viewBox-Koordinaten. */
  centerX: number;
  tones: ReadonlyMap<RegionId, Tone>;
  /** Deckkraft für Primär-Regionen (fullBody nutzt eine dezentere). */
  primaryOpacity: number;
  /** Ganze Silhouette leicht akzentuieren (Cardio/Mobilität). */
  tinted: boolean;
}

function BodyFigure({ view, centerX, tones, primaryOpacity, tinted }: BodyFigureProps) {
  return (
    <g transform={`translate(${centerX} 6)`}>
      <path d={SILHOUETTE} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      {REGION_SHAPES.filter((shape) => shape.view === view).map((shape) => {
        const tone = tones.get(shape.id);
        const fill =
          tone === "primary" ? PRIMARY_FILL : tone === "secondary" ? SECONDARY_FILL : INACTIVE_FILL;
        const opacity = tone === "primary" ? primaryOpacity : tone === "secondary" ? 0.65 : 1;
        return (
          <g key={shape.id} fill={fill} opacity={opacity}>
            <path d={shape.d} />
            {shape.paired ? <path d={shape.d} transform="scale(-1 1)" /> : null}
          </g>
        );
      })}
      {view === "front" ? (
        <path
          d={ABS_DETAIL_D}
          fill="none"
          stroke={DETAIL_STROKE}
          strokeOpacity={0.4}
          strokeWidth={1}
          strokeLinecap="round"
        />
      ) : null}
      {tinted ? <path d={SILHOUETTE} fill={PRIMARY_FILL} opacity={0.25} /> : null}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

/**
 * Anatomie-Panel: stilisierter Körper in Vorder- und Rückansicht mit
 * einfärbbaren Muskelregionen (primär rot, sekundär orange).
 */
export function MuscleMap({ primary, secondary = [], className }: MuscleMapProps) {
  const secondaryClean = secondary.filter(
    (group, index) => group !== primary && secondary.indexOf(group) === index,
  );

  const tones = new Map<RegionId, Tone>();
  for (const id of GROUP_REGIONS[primary]) tones.set(id, "primary");
  for (const group of secondaryClean) {
    for (const id of GROUP_REGIONS[group]) {
      if (!tones.has(id)) tones.set(id, "secondary");
    }
  }

  const primaryOpacity = primary === "fullBody" ? 0.55 : 0.9;
  const tinted = primary === "cardio" || primary === "mobility";

  const secondaryLabel = secondaryClean.length
    ? `, sekundär ${secondaryClean.map((group) => muscleGroupLabels[group]).join(", ")}`
    : "";
  const ariaLabel = `Beanspruchte Muskeln: ${muscleGroupLabels[primary]}${secondaryLabel}`;

  return (
    <svg
      viewBox="0 0 400 340"
      width="100%"
      height="100%"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <BodyFigure
        view="front"
        centerX={100}
        tones={tones}
        primaryOpacity={primaryOpacity}
        tinted={tinted}
      />
      <BodyFigure
        view="back"
        centerX={300}
        tones={tones}
        primaryOpacity={primaryOpacity}
        tinted={tinted}
      />
      <text
        x={100}
        y={326}
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        fill="var(--text-soft, #71717a)"
      >
        Vorne
      </text>
      <text
        x={300}
        y={326}
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        fill="var(--text-soft, #71717a)"
      >
        Hinten
      </text>
    </svg>
  );
}

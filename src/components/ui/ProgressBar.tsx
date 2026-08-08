interface ProgressBarProps {
  /** 0..1, already clamped by the caller (calculateMacroProgress). */
  fraction: number;
  color?: string;
}

export function ProgressBar({ fraction, color }: ProgressBarProps) {
  const width = Math.min(Math.max(fraction, 0), 1) * 100;
  return (
    <div className="progress-bar">
      <div
        className="progress-bar__fill"
        style={{ width: `${width}%`, background: color }}
      />
    </div>
  );
}

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  /** Formats current/target for display; defaults to rounded integers. */
  format?: (value: number) => string;
}

/** "Protein — 120 / 160 g" with a colored bar capped at 100 % visually. */
export function MacroBar({ label, current, target, unit, color, format }: MacroBarProps) {
  const fmt = format ?? ((v: number) => String(Math.round(v)));
  const fraction = target > 0 ? current / target : 0;
  return (
    <div className="macro-bar">
      <div className="macro-bar__head">
        <span className="macro-bar__label">{label}</span>
        <span className="macro-bar__value">
          {fmt(current)} / {fmt(target)} {unit}
        </span>
      </div>
      <ProgressBar fraction={fraction} color={color} />
    </div>
  );
}

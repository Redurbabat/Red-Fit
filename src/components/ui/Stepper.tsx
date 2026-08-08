import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { clampMin, parseDecimalInput, roundTo } from "../../utils/numbers";

interface StepperProps {
  value: number;
  step: number;
  min?: number;
  unit?: string;
  decimals?: number;
  inputMode?: "decimal" | "numeric";
  label: string;
  onChange: (value: number) => void;
}

/**
 * [-] 80.0 kg [+] — the gym-speed input for weight and reps.
 * Direct typing is possible; values never go below `min`.
 */
export function Stepper({
  value,
  step,
  min = 0,
  unit,
  decimals = 1,
  inputMode = "decimal",
  label,
  onChange,
}: StepperProps) {
  const [text, setText] = useState(formatValue(value, decimals));

  // Keep the text field in sync when the value changes from outside (e.g. +/-).
  useEffect(() => {
    setText(formatValue(value, decimals));
  }, [value, decimals]);

  function commitText() {
    const parsed = parseDecimalInput(text);
    if (parsed == null) {
      setText(formatValue(value, decimals));
      return;
    }
    const next = clampMin(roundTo(parsed, decimals), min);
    onChange(next);
    setText(formatValue(next, decimals));
  }

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        aria-label={`${label} verringern`}
        onClick={() => onChange(clampMin(roundTo(value - step, decimals), min))}
      >
        <Minus size={22} />
      </button>
      <div style={{ flex: 1, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
        <input
          className="stepper__value"
          value={text}
          inputMode={inputMode}
          aria-label={label}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          style={{ maxWidth: 110 }}
        />
        {unit ? <span className="stepper__unit">{unit}</span> : null}
      </div>
      <button
        type="button"
        className="stepper__btn"
        aria-label={`${label} erhöhen`}
        onClick={() => onChange(clampMin(roundTo(value + step, decimals), min))}
      >
        <Plus size={22} />
      </button>
    </div>
  );
}

function formatValue(value: number, decimals: number): string {
  const rounded = roundTo(value, decimals);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

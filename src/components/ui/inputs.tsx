import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";

interface FieldProps {
  label: string;
  error?: string;
  children: (id: string) => ReactNode;
}

/** Label + control + error wrapper; wires the label via htmlFor. */
export function Field({ label, error, children }: FieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {error ? <span className="field__error">{error}</span> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={["input", props.className ?? ""].filter(Boolean).join(" ")} />;
}

/** Decimal input (weight, macros): inputmode="decimal", never below 16 px font. */
export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      {...props}
      className={["input", props.className ?? ""].filter(Boolean).join(" ")}
    />
  );
}

/** Integer input (reps, barcode): inputmode="numeric". */
export function IntegerInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      {...props}
      className={["input", props.className ?? ""].filter(Boolean).join(" ")}
    />
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

export function SelectInput({ children, ...props }: SelectInputProps) {
  return (
    <select {...props} className={["select", props.className ?? ""].filter(Boolean).join(" ")}>
      {children}
    </select>
  );
}

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="segmented__option"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

export function Chip({ label, selected, onClick }: ChipProps) {
  return (
    <button type="button" className="chip" aria-pressed={selected ?? false} onClick={onClick}>
      {label}
    </button>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { usePress } from "../../design/red-morph/usePress";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  small?: boolean;
  autoWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  small,
  autoWidth,
  className,
  children,
  type = "button",
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...rest
}: ButtonProps) {
  const { pressProps } = usePress<HTMLButtonElement>(
    { onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onKeyDown, onKeyUp, onBlur },
    disabled,
  );
  const classes = [
    "btn",
    `btn--${variant}`,
    small ? "btn--small" : "",
    autoWidth ? "btn--auto" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <button type={type} className={classes} disabled={disabled} {...rest} {...pressProps}>
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({
  label, children, className, type = "button", disabled,
  onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onKeyDown, onKeyUp, onBlur,
  ...rest
}: IconButtonProps) {
  const { pressProps } = usePress<HTMLButtonElement>(
    { onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onKeyDown, onKeyUp, onBlur },
    disabled,
  );
  return (
    <button
      type={type}
      aria-label={label}
      className={["icon-btn", className ?? ""].filter(Boolean).join(" ")}
      disabled={disabled}
      {...rest}
      {...pressProps}
    >
      {children}
    </button>
  );
}

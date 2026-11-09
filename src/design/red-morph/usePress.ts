import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";

export interface PressHandlers<E extends Element> {
  onPointerDown?: (event: PointerEvent<E>) => void;
  onPointerUp?: (event: PointerEvent<E>) => void;
  onPointerCancel?: (event: PointerEvent<E>) => void;
  onPointerLeave?: (event: PointerEvent<E>) => void;
  onKeyDown?: (event: KeyboardEvent<E>) => void;
  onKeyUp?: (event: KeyboardEvent<E>) => void;
  onBlur?: (event: FocusEvent<E>) => void;
}

/**
 * Adapted from RED-Morph/app/src/touch/internal/usePress.ts.
 * A pointer, keyboard or screen-reader activation keeps native click semantics.
 * Only feedback is controlled; cancellation, blur and pointer leave clear it.
 */
export function usePress<E extends Element>(
  handlers: PressHandlers<E> = {},
  disabled = false,
) {
  const [pressed, setPressed] = useState(false);
  const setIfEnabled = (value: boolean) => setPressed(value && !disabled);
  return {
    pressed: pressed && !disabled,
    pressProps: {
      "data-pressed": pressed && !disabled ? true : undefined,
      onPointerDown(event: PointerEvent<E>) {
        handlers.onPointerDown?.(event);
        if (!event.defaultPrevented && event.button === 0) setIfEnabled(true);
      },
      onPointerUp(event: PointerEvent<E>) {
        handlers.onPointerUp?.(event);
        setIfEnabled(false);
      },
      onPointerCancel(event: PointerEvent<E>) {
        handlers.onPointerCancel?.(event);
        setIfEnabled(false);
      },
      onPointerLeave(event: PointerEvent<E>) {
        handlers.onPointerLeave?.(event);
        setIfEnabled(false);
      },
      onKeyDown(event: KeyboardEvent<E>) {
        handlers.onKeyDown?.(event);
        if (!event.defaultPrevented && !event.repeat && (event.key === " " || event.key === "Enter")) setIfEnabled(true);
      },
      onKeyUp(event: KeyboardEvent<E>) {
        handlers.onKeyUp?.(event);
        if (event.key === " " || event.key === "Enter") setIfEnabled(false);
      },
      onBlur(event: FocusEvent<E>) {
        handlers.onBlur?.(event);
        setIfEnabled(false);
      },
    },
  };
}

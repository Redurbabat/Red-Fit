import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { Button } from "../ui/Button";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog focus management: moves focus into the dialog on open, traps Tab
 * inside it, closes on Escape and restores focus to the trigger on close.
 * The returned ref must be attached to the dialog container (tabIndex={-1}).
 */
function useDialogFocus(open: boolean, onClose: () => void): RefObject<HTMLDivElement | null> {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        // Nothing focusable inside — keep focus on the dialog container.
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === dialog || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previous?.focus();
    };
  }, [open]);

  return dialogRef;
}

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  const dialogRef = useDialogFocus(open, onClose);
  if (!open) return null;
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="modal__title">{title}</h2>
        {children}
      </div>
    </>
  );
}

interface BottomSheetProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const dialogRef = useDialogFocus(open, onClose);
  if (!open) return null;
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Auswahl"}
      >
        <div className="bottom-sheet__handle" />
        {title ? <h2 className="bottom-sheet__title">{title}</h2> : null}
        {children}
      </div>
    </>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Extra middle option, e.g. "Weiter trainieren" vs "Trotzdem beenden". */
  extraAction?: { label: string; onClick: () => void };
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  cancelLabel = "Abbrechen",
  danger,
  onConfirm,
  onCancel,
  extraAction,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="modal__text">{text}</p>
      <div className="modal__actions">
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        {extraAction ? (
          <Button variant="secondary" onClick={extraAction.onClick}>
            {extraAction.label}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  );
}

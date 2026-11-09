import { useEffect, useId, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { X } from "lucide-react";
import { GlassSurface } from "../../design/red-morph/GlassSurface";
import { Button } from "../ui/Button";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * RED Morph focus contract: autofocus a real field when requested, otherwise
 * focus the explicit dismiss control. Trap Tab, support Escape, return focus
 * and make the shell inert while an overlay is active.
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
    const background = Array.from(
      document.querySelectorAll<HTMLElement>(".app-shell__content, .desktop-nav, .bottom-nav, .fab"),
    ).filter((element) => !element.contains(dialog) && !dialog.contains(element));
    const inertBefore = background.map((element) => element.inert);
    background.forEach((element) => { element.inert = true; });
    const overflowBefore = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const initial = dialog.querySelector<HTMLElement>("[autofocus]") ??
      dialog.querySelector<HTMLElement>("[data-dialog-close]");
    (initial ?? dialog).focus();

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
      background.forEach((element, index) => { element.inert = inertBefore[index]; });
      document.body.style.overflow = overflowBefore;
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
  const titleId = useId();
  if (!open) return null;
  return (
    <>
      <div className="overlay" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">{title}</h2>
          <button data-dialog-close type="button" className="modal__close" aria-label="Schliessen" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
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
  /** Only short contextual chrome uses glass; dense forms stay solid. */
  material?: "solid" | "glass";
}

export function BottomSheet({ open, title, onClose, children, material = "solid" }: BottomSheetProps) {
  const dialogRef = useDialogFocus(open, onClose);
  const titleId = useId();
  if (!open) return null;

  const content = (
    <>
      <div className="bottom-sheet__handle" aria-hidden="true" />
      <div className="bottom-sheet__header">
        {title ? <h2 id={titleId} className="bottom-sheet__title">{title}</h2> : <span />}
        <button data-dialog-close type="button" className="modal__close" aria-label="Schliessen" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {children}
    </>
  );
  const props = {
    tabIndex: -1,
    role: "dialog",
    "aria-modal": "true" as const,
    "aria-labelledby": title ? titleId : undefined,
    "aria-label": title ? undefined : "Auswahl",
  };
  return (
    <>
      <div className="overlay" aria-hidden="true" onClick={onClose} />
      {material === "glass" ? (
        <GlassSurface ref={dialogRef} {...props} tone="tinted" className="bottom-sheet">
          {content}
        </GlassSurface>
      ) : (
        <div ref={dialogRef} {...props} className="bottom-sheet">
          {content}
        </div>
      )}
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

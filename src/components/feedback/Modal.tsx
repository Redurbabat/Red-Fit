import type { ReactNode } from "react";
import { Button } from "../ui/Button";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
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
  if (!open) return null;
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label={title ?? "Auswahl"}>
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

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: ReactNode;
  /** True while the action runs: buttons lock and the dialog cannot be dismissed. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A modal "are you sure?" built on the native <dialog> element, which gives
 * focus trapping, the Escape key and a dimmed backdrop without extra code.
 * Focus starts on the safe choice (cancel).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  icon,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="confirm"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      // Escape fires "cancel"; stop the browser closing it itself so React stays in charge.
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      // A click on the dimmed backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) onCancel();
      }}
    >
      <div className="confirm__body">
        {icon && (
          <span className="confirm__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 id={titleId} className="confirm__title">
          {title}
        </h2>
        <p id={messageId} className="confirm__message">
          {message}
        </p>
        <div className="confirm__actions">
          <Button variant="quiet" onClick={onCancel} disabled={busy} autoFocus>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

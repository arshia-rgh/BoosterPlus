import { useId, useRef, type ReactNode } from "react";
import "./email-recovery-dialog.css";

export function EmailRecoveryDialog({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="email-recovery-trigger"
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
          dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
        }}
      >
        Lost access to your email?
      </button>
      <dialog
        ref={dialog}
        className="email-recovery-dialog"
        aria-labelledby={titleId}
        onClose={() => trigger.current?.focus()}
      >
        <header className="email-recovery-heading">
          <h2 id={titleId}>Recover your account</h2>
          <button
            type="button"
            className="email-recovery-close"
            onClick={() => dialog.current?.close()}
            aria-label="Close account recovery"
          >
            Close <span aria-hidden="true">×</span>
          </button>
        </header>
        {children}
      </dialog>
    </>
  );
}

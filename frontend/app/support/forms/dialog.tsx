import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRecordDraft } from "../../ui/record-drafts";
const Guard = createContext<
  | ((state: { dirty: boolean; busy: boolean; uncertain: boolean }) => void)
  | null
>(null);
export function useFormGuard(dirty: boolean, busy: boolean, uncertain = false) {
  const guard = useContext(Guard);
  useRecordDraft(dirty, busy || uncertain);
  useEffect(() => {
    if (!dirty && !busy && !uncertain) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("beforeunload", leave);
    };
  }, [dirty, busy, uncertain]);
  useEffect(() => {
    guard?.({ dirty, busy, uncertain });
    return () => guard?.({ dirty: false, busy: false, uncertain: false });
  }, [guard, dirty, busy, uncertain]);
}
export function FormDialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    label = useId();
  const [guard, setGuard] = useState({
      dirty: false,
      busy: false,
      uncertain: false,
    }),
    [confirm, setConfirm] = useState(false);
  const confirmHeading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null),
    returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (confirm) confirmHeading.current?.focus();
  }, [confirm]);
  const update = useCallback((value: typeof guard) => {
    setGuard(value);
  }, []);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  const requestClose = () => {
    if (guard.busy) return;
    if (guard.dirty || guard.uncertain) {
      const active = document.activeElement;
      returnFocus.current =
        active instanceof HTMLElement && content.current?.contains(active)
          ? active
          : (content.current?.querySelector<HTMLElement>(
              "input:not([type=hidden]),textarea,select,button,h3[tabindex]",
            ) ?? null);
      setConfirm(true);
    } else close();
  };
  return createPortal(
    <Guard value={update}>
      <dialog
        ref={dialog}
        className="chat-form-dialog"
        aria-labelledby={label}
        onCancel={(event) => {
          event.preventDefault();
          requestClose();
        }}
      >
        <header>
          <h2 id={label}>{title}</h2>
          <button
            type="button"
            className="chat-text-button"
            onClick={requestClose}
            disabled={guard.busy}
            aria-label="Close form"
          >
            Close ×
          </button>
        </header>
        {confirm ? (
          <section role="alert">
            <h3 ref={confirmHeading} tabIndex={-1}>
              {guard.uncertain
                ? "Delivery is still uncertain"
                : "Discard this draft?"}
            </h3>
            <p>
              {guard.uncertain
                ? "The form may already have been saved. Return to retry the same request safely; closing does not cancel a saved form."
                : "Your unsent entries will be cleared."}
            </p>
            <div className="form-actions">
              <button
                className="button"
                onClick={() => {
                  setConfirm(false);
                  requestAnimationFrame(() => returnFocus.current?.focus());
                }}
              >
                Return to form
              </button>
              <button className="chat-text-button" onClick={close}>
                {guard.uncertain
                  ? "Close and check conversation"
                  : "Discard draft"}
              </button>
            </div>
          </section>
        ) : null}
        <div ref={content} hidden={confirm} inert={confirm}>
          {children}
        </div>
      </dialog>
    </Guard>,
    document.body,
  );
}

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Anchor } from "../portal-router";
import { Loading } from "../ui/loading";

/** A dismissible view of preparation, never a second payment request. */
export function PreparationDialog({
  active,
  returnFocus,
  supportHref,
}: {
  active: boolean;
  returnFocus: RefObject<HTMLElement | null>;
  supportHref: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const finished = useRef(false);
  const label = useId();
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    if (!element || !active || finished.current) return;
    element.showModal();
    heading.current?.focus();
    const timer = window.setTimeout(() => {
      setDelayed(true);
    }, 15000);
    return () => {
      window.clearTimeout(timer);
      if (element.open) element.close();
    };
  }, [active]);
  function dismiss() {
    finished.current = true;
    dialog.current?.close();
  }
  return (
    <dialog
      ref={dialog}
      className="payment-preparation-dialog"
      aria-labelledby={label}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClose={() => {
        if (dialog.current?.open) return;
        finished.current = true;
        if (returnFocus.current?.isConnected) returnFocus.current.focus();
      }}
    >
      <div aria-hidden="true">
        <Loading />
      </div>
      <h2 ref={heading} id={label} tabIndex={-1}>
        Preparing your secure checkout.
      </h2>
      {delayed && (
        <div className="payment-preparation-delay" role="status">
          <p>
            This is taking a little longer. We’re still checking your payment
            link.
          </p>
          <Anchor href={supportHref} onClick={dismiss} className="text-link">
            Contact order support
          </Anchor>
        </div>
      )}
      <button
        type="button"
        className="payment-preparation-dismiss"
        onClick={dismiss}
      >
        View order while we wait
      </button>
    </dialog>
  );
}

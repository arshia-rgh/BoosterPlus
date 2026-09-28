import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useBlocker } from "react-router";
import { Action } from "../catalog/controls";
const Drafts = createContext<
  | ((key: string, value: { dirty: boolean; busy: boolean } | null) => void)
  | null
>(null);
/** One leave guard owns all kept-mounted local sections of a record. */
export function RecordDraftBoundary({
  children,
  record = "order",
  description = "Order sections keep unsent messages and delivery updates. Leaving this order discards them.",
}: {
  children: ReactNode;
  record?: string;
  description?: string;
}) {
  const [drafts, setDrafts] = useState<
    Record<string, { dirty: boolean; busy: boolean }>
  >({});
  const [update] = useState(
    () => (key: string, value: { dirty: boolean; busy: boolean } | null) => {
      setDrafts((old) => {
        const next = { ...old };
        if (value) Object.assign(next, { [key]: value });
        else
          return Object.fromEntries(
            Object.entries(next).filter(([name]) => name !== key),
          );
        return next;
      });
    },
  );
  const dirty = Object.values(drafts).some((v) => v.dirty || v.busy),
    busy = Object.values(drafts).some((v) => v.busy);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  const prompt = useRef<HTMLElement>(null);
  useEffect(() => {
    if (blocker.state === "blocked") prompt.current?.focus();
  }, [blocker.state]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("beforeunload", prevent);
    };
  }, [dirty]);
  return (
    <Drafts.Provider value={update}>
      {blocker.state === "blocked" && (
        <section
          role="alert"
          ref={prompt}
          tabIndex={-1}
          className="catalog-section"
        >
          <h2>Keep your {record} drafts?</h2>
          <p>{description}</p>
          <div className="catalog-actions">
            <Action
              onClick={() => {
                blocker.reset();
              }}
            >
              Stay on {record}
            </Action>
            <Action
              disabled={busy}
              onClick={() => {
                blocker.proceed();
              }}
            >
              Discard drafts and leave
            </Action>
          </div>
        </section>
      )}
      {children}
    </Drafts.Provider>
  );
}
export function useRecordDraft(dirty: boolean, busy = false) {
  const update = useContext(Drafts),
    key = useId();
  useEffect(() => {
    update?.(key, { dirty, busy });
    return () => {
      update?.(key, null);
    };
  }, [update, key, dirty, busy]);
}

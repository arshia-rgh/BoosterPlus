import { useEffect, useRef, useState, type ReactNode } from "react";

export default function MarketFilterPanel({
  children,
}: {
  children: ReactNode;
}) {
  const [compact, setCompact] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const query = matchMedia("(max-width: 600px)");
    const update = () => {
      dialog.current?.close();
      setCompact(query.matches);
    };
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, []);
  if (!compact) return children;
  return (
    <>
      <button
        className="button compact market-filter-trigger"
        type="button"
        aria-haspopup="dialog"
        onClick={(event) => {
          event.currentTarget.focus();
          dialog.current?.showModal();
        }}
      >
        Filter accounts
      </button>
      <dialog
        ref={dialog}
        className="market-filter-drawer"
        aria-label="Account filters"
      >
        <div className="market-filter-heading">
          <h2>Account filters</h2>
          <button
            className="button compact"
            type="button"
            onClick={() => dialog.current?.close()}
          >
            Close filters
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}

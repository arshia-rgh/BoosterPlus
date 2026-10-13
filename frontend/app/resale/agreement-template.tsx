import { useEffect, useRef, useState } from "react";
import { ErrorNotice } from "../catalog/controls";
import { get } from "../identity/api";
import { agreementDefaultsSchema } from "./model";
import type { z } from "../validation";

type Defaults = z.infer<typeof agreementDefaultsSchema>;

// Loading is intentional: a template replaces only the fields named by its editor.
export function AgreementTemplate({
  label,
  apply,
}: {
  label: string;
  apply: (defaults: Defaults) => void;
}) {
  const [busy, setBusy] = useState(false),
    [applied, setApplied] = useState(false),
    [error, setError] = useState<unknown>(null);
  const current = useRef(apply);
  const mounted = useRef(false);
  useEffect(() => {
    current.current = apply;
  }, [apply]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function load() {
    if (busy) return;
    setBusy(true);
    setApplied(false);
    setError(null);
    try {
      const defaults = await get(
        "/admin/account-agreement-defaults",
        agreementDefaultsSchema,
      );
      if (mounted.current) {
        current.current(defaults);
        setApplied(true);
      }
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        className="button compact"
        aria-disabled={busy}
        aria-busy={busy}
        onClick={() => void load()}
      >
        {busy ? "Loading approved wording…" : label}
      </button>
      <p role="status">
        {applied ? "Approved wording applied. Review before saving." : ""}
      </p>
      <ErrorNotice error={error} />
    </div>
  );
}

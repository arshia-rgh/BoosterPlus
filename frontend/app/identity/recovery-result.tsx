import { useEffect, useRef } from "react";
import { focusValidationTarget } from "../ui/form-validation";

/** One-time values stay in the caller's volatile state; never persist or log. */
export function RecoveryResult({
  codes,
  acknowledge,
}: {
  codes: string[];
  acknowledge: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    focusValidationTarget(heading.current);
  }, [codes]);
  return (
    <section className="secret" aria-labelledby="recovery-result-heading">
      <h2 id="recovery-result-heading" ref={heading} tabIndex={-1}>
        Save your recovery codes
      </h2>
      <p>
        Each code works once, after Google or email verification. Store them
        privately; they will not be shown again.
      </p>
      <ul>
        {codes.map((code) => (
          <li key={code}>
            <code>{code}</code>
          </li>
        ))}
      </ul>
      <button
        className="button"
        onClick={(event) => {
          const pageHeading = event.currentTarget
            .closest("main")
            ?.querySelector<HTMLHeadingElement>("h1");
          acknowledge();
          focusValidationTarget(pageHeading ?? null);
        }}
      >
        I saved my recovery codes
      </button>
    </section>
  );
}

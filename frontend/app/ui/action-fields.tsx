import { useEffect, useRef, useState, type ReactNode } from "react";
import { APIError } from "../identity/api";
import {
  FieldValidation,
  useFormValidation,
  type FieldIssue,
  focusValidationTarget,
} from "./form-validation";
import { boundedTextIssue } from "./editor-validation";

export function rejectInvalidFields(issues: FieldIssue[]) {
  if (!issues.length) return;
  const error = new APIError("Check the highlighted fields before continuing.");
  error.issues = issues;
  throw error;
}

export function requireText(path: string, value: string, min = 1, max = 2000) {
  rejectInvalidFields(boundedTextIssue(path, value, min, max));
}

/** Connect server rejection to named controls without losing an action's draft. */
export function ActionFields({
  error,
  children,
  busy = false,
}: {
  error: unknown;
  children: ReactNode;
  busy?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState(error);
  const [issues, setIssues] = useState(
    error instanceof APIError ? error.issues : [],
  );
  if (source !== error) {
    setSource(error);
    setIssues(error instanceof APIError ? error.issues : []);
  }
  const validation = useFormValidation(
    issues,
    (name) => {
      setIssues((old) => {
        const next = old.filter(
          (issue) => issue.path !== name && !issue.path.startsWith(name + "."),
        );
        return next.length === old.length ? old : next;
      });
    },
    undefined,
    !busy,
  );
  useEffect(() => {
    if (busy || !error || (error instanceof APIError && error.issues.length))
      return;
    const frame = requestAnimationFrame(() => {
      const alert = root.current?.querySelector<HTMLElement>('[role="alert"]');
      if (!alert || alert.parentElement?.closest('[tabindex="-1"]')) return;
      alert.tabIndex = -1;
      focusValidationTarget(alert);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [busy, error]);
  return (
    <FieldValidation value={validation}>
      <div className="ui-action-fields" ref={root}>
        {children}
      </div>
    </FieldValidation>
  );
}

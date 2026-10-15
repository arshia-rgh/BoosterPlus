import { useState } from "react";
import { APIError } from "../identity/api";
import { useFormValidation, type FieldIssue } from "./form-validation";

/** Action-based editors share field focus/correction with native forms. */
export function useActionValidation(
  reveal?: (target: HTMLElement) => void,
  active = true,
) {
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const validation = useFormValidation(
    issues,
    (name) => {
      setIssues((current) => {
        const next = current.filter(
          (issue) => issue.path !== name && !issue.path.startsWith(name + "."),
        );
        return next.length === current.length ? current : next;
      });
    },
    reveal,
    active,
  );
  return {
    validation,
    check(next: FieldIssue[]) {
      setIssues(next);
      return next.length === 0;
    },
    server(error: unknown) {
      if (error instanceof APIError) setIssues(error.issues);
    },
    clear() {
      setIssues([]);
    },
  };
}

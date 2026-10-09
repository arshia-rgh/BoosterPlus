import { useState } from "react";
import { useFormValidation, type FieldIssue } from "./form-validation";

export function boundedTextIssue(
  path: string,
  value: string,
  min: number,
  max: number,
): FieldIssue[] {
  const valid =
    !value.includes("\0") &&
    Array.from(value.trim()).length >= min &&
    Array.from(value).length <= max;
  return valid
    ? []
    : [
        {
          path,
          message: `Use ${String(min)}–${max.toLocaleString("en-US")} characters.`,
        },
      ];
}

/** Editable command forms keep values and expose each failed validation attempt. */
export function useEditorValidation() {
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const validation = useFormValidation(issues, (name) => {
    setIssues((old) => old.filter((issue) => issue.path !== name));
  });
  function check(next: FieldIssue[]) {
    setIssues(next);
    return next.length === 0;
  }
  return { issues, validation, check };
}

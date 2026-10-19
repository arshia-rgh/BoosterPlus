import { useContext } from "react";
import { ErrorNotice } from "../catalog/controls";
import { APIError } from "../identity/api";
import { FieldValidation } from "../ui/form-validation";

export function clearPriceIssues(error: unknown): unknown {
  if (!(error instanceof APIError) || !error.issues.length) return error;
  const issues = error.issues.filter(
    ({ path }) => !["amount", "markup"].includes(path),
  );
  if (issues.length === error.issues.length) return error;
  return issues.length
    ? Object.assign(new APIError(error.message), error, { issues })
    : null;
}

/** Keep request failures visible; retire a field summary as its issues clear. */
export function SupplierErrorNotice({ error }: { error: unknown }) {
  const validation = useContext(FieldValidation);
  if (
    error instanceof APIError &&
    error.issues.length &&
    validation &&
    !validation.issues.length
  )
    return null;
  return <ErrorNotice error={error} />;
}

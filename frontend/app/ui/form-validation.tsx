import "./primitives.css";
import {
  createContext,
  useContext,
  useId,
  useCallback,
  type ReactNode,
} from "react";

export interface FieldIssue {
  path: string;
  message: string;
}
export interface RegisteredField {
  name: string;
  id: string;
  label: string;
}
export const FieldValidation = createContext<{
  issues: readonly FieldIssue[];
  register: (field: RegisteredField) => () => void;
  correct: (name: string) => void;
} | null>(null);

/** A real label, persistent help and error association for a single text control. */
export function TextField({
  name,
  label,
  type = "text",
  required = true,
  autoComplete = "off",
  maxLength = 254,
  inputMode,
  pattern,
  help,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: "numeric" | "text";
  pattern?: string;
  help?: ReactNode;
}) {
  const id = useId();
  const validation = useContext(FieldValidation);
  const register = validation?.register;
  const fieldRef = useCallback(
    (input: HTMLInputElement | null) => {
      if (input && register) return register({ name, id, label });
    },
    [name, id, label, register],
  );
  const error = validation?.issues
    .filter((issue) => issue.path === name)
    .map((issue) => issue.message)
    .join(" ");
  const described =
    [help ? `${id}-help` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      <input
        ref={fieldRef}
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        pattern={pattern}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        onChange={() => {
          validation?.correct(name);
        }}
      />
      {help && (
        <p className="ui-field-help" id={`${id}-help`}>
          {help}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function ValidationSummary({
  issues,
  fields,
}: {
  issues: readonly FieldIssue[];
  fields: readonly RegisteredField[];
}) {
  if (!issues.length) return null;
  return (
    <ul className="ui-validation-summary" aria-label="Fields to check">
      {issues.map((issue, index) => {
        const field = fields.find((item) => item.name === issue.path);
        return (
          <li key={`${issue.path}:${String(index)}`}>
            {field ? (
              <a
                href={`#${field.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(field.id)?.focus();
                }}
              >
                {field.label}: {issue.message}
              </a>
            ) : (
              issue.message
            )}
          </li>
        );
      })}
    </ul>
  );
}

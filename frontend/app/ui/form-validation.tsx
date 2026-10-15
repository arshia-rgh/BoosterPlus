import "./primitives.css";
import {
  createContext,
  useContext,
  useId,
  useCallback,
  useEffect,
  useRef,
  useState,
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
  fields?: readonly RegisteredField[];
  focus?: (field: RegisteredField) => void;
} | null>(null);

/** Reveal collapsed groups before moving keyboard focus; keep the control in view. */
export function focusValidationTarget(target: HTMLElement | null) {
  if (!target) return;
  let ancestor: HTMLElement | null = target.parentElement;
  while (ancestor) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    ancestor = ancestor.parentElement;
  }
  const control = target.matches("input, select, textarea, button, [tabindex]")
    ? target
    : (target.querySelector<HTMLElement>(
        'input[aria-invalid="true"]:not(:disabled), select[aria-invalid="true"]:not(:disabled), textarea[aria-invalid="true"]:not(:disabled)',
      ) ??
      target.querySelector<HTMLElement>(
        "input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [tabindex]",
      ));
  (control ?? target).focus({ preventScroll: true });
  if (typeof (control ?? target).scrollIntoView === "function")
    (control ?? target).scrollIntoView({
      block: "center",
      behavior: "instant",
    });
}

export function issueField(path: string, fields: readonly RegisteredField[]) {
  return (
    fields.find((field) => field.name === path) ??
    fields.find((field) => field.name.startsWith(path + ".")) ??
    [...fields]
      .sort((a, b) => b.name.length - a.name.length)
      .find((field) => path.startsWith(field.name + "."))
  );
}

export function useFormValidation(
  issues: readonly FieldIssue[],
  correct: (name: string) => void,
  reveal?: (target: HTMLElement) => void,
  active = true,
) {
  const [fields, setFields] = useState<RegisteredField[]>([]);
  const latestFields = useRef<readonly RegisteredField[]>([]);
  useEffect(() => {
    latestFields.current = fields;
  }, [fields]);
  const register = useCallback((field: RegisteredField) => {
    setFields((old) => [...old.filter((item) => item.id !== field.id), field]);
    return () => {
      setFields((old) => old.filter((item) => item.id !== field.id));
    };
  }, []);
  const focus = (field: RegisteredField) => {
    const target = document.getElementById(field.id);
    if (!target) return;
    reveal?.(target);
    let attempts = 0;
    const afterReveal = () => {
      const current =
        document.getElementById(field.id) ??
        latestFields.current
          .filter((item) => item.name === field.name)
          .map((item) => document.getElementById(item.id))
          .find(Boolean);
      // Router section changes may commit after the first animation frame.
      if (
        (!current ||
          current.closest("[hidden]") ||
          current.matches(":disabled")) &&
        attempts++ < 12
      ) {
        requestAnimationFrame(afterReveal);
        return;
      }
      focusValidationTarget(current ?? null);
    };
    requestAnimationFrame(afterReveal);
  };
  const fingerprint = JSON.stringify(issues);
  const focused = useRef("");
  const previous = useRef<readonly FieldIssue[]>([]);
  const correcting = useRef(false);
  useEffect(() => {
    const corrected = correcting.current;
    correcting.current = false;
    if (!active) return;
    if (corrected) {
      previous.current = issues;
      focused.current = fingerprint;
      return;
    }
    // A fresh issue array is a new validation attempt even when the wording is
    // unchanged. Registry rerenders must not steal focus while users edit.
    if (previous.current === issues && focused.current === fingerprint) return;
    const onlyCorrected =
      issues.length < previous.current.length &&
      issues.every((issue) =>
        previous.current.some(
          (old) => old.path === issue.path && old.message === issue.message,
        ),
      );
    previous.current = issues;
    if (onlyCorrected) {
      focused.current = fingerprint;
      return;
    }
    const first = issues
      .map((issue) => issueField(issue.path, fields))
      .filter((field): field is RegisteredField => !!field)
      .sort((a, b) => {
        const left = document.getElementById(a.id),
          right = document.getElementById(b.id);
        if (!left || !right) return 0;
        return left.compareDocumentPosition(right) &
          Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1;
      })
      .at(0);
    if (first || issues.length === 0) focused.current = fingerprint;
    if (first) focus(first);
  });
  return {
    issues,
    correct(name: string) {
      correcting.current = true;
      correct(name);
    },
    register,
    fields: fields,
    focus,
  };
}

export function fieldError(
  validation: React.ContextType<typeof FieldValidation>,
  name: string | undefined,
) {
  if (!validation || !name) return undefined;
  return (
    validation.issues
      .filter(
        (issue) =>
          issue.path === name ||
          (validation.fields &&
            issueField(issue.path, validation.fields)?.name === name),
      )
      .map((issue) => issue.message)
      .join(" ") || undefined
  );
}

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
  defaultValue,
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
  defaultValue?: string | undefined;
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
  const error = fieldError(validation, name);
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
        defaultValue={defaultValue}
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
  focus,
  autoFocusUnknown = false,
}: {
  issues: readonly FieldIssue[];
  fields: readonly RegisteredField[];
  focus?: ((field: RegisteredField) => void) | undefined;
  autoFocusUnknown?: boolean;
}) {
  const summary = useRef<HTMLUListElement>(null);
  const previousIssues = useRef<readonly FieldIssue[]>([]);
  useEffect(() => {
    const old = previousIssues.current;
    if (
      !autoFocusUnknown ||
      !issues.length ||
      old === issues ||
      issues.length < old.length ||
      issues.some((issue) => issueField(issue.path, fields))
    ) {
      previousIssues.current = issues;
      return;
    }
    // Registry changes can cancel a pending frame while an editor reopens.
    // Mark this attempt focused only once focus actually runs.
    const frame = requestAnimationFrame(() => {
      previousIssues.current = issues;
      focusValidationTarget(summary.current);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [issues, fields, autoFocusUnknown]);
  if (!issues.length) return null;
  return (
    <ul
      ref={summary}
      tabIndex={-1}
      className="ui-validation-summary"
      aria-label="Fields to check"
    >
      {issues.map((issue, index) => {
        const field = issueField(issue.path, fields);
        return (
          <li key={`${issue.path}:${String(index)}`}>
            {field ? (
              <a
                href={`#${field.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  if (focus) focus(field);
                  else focusValidationTarget(document.getElementById(field.id));
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

/** Read native constraints without showing a transient browser tooltip. */
export function nativeFieldIssues(form: HTMLFormElement): FieldIssue[] {
  return Array.from(form.elements).flatMap((element) => {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) ||
      !element.willValidate ||
      element.validity.valid
    )
      return [];
    const message = element.validity.valueMissing
      ? element instanceof HTMLInputElement && element.type === "checkbox"
        ? "Confirm this before continuing."
        : "Complete this field."
      : element.validity.typeMismatch
        ? "Enter a valid email address."
        : element.validity.patternMismatch
          ? element.inputMode === "numeric"
            ? "Enter the complete verification code using numbers only."
            : "Use the requested format."
          : element.validationMessage;
    return [{ path: element.name || element.id, message }];
  });
}

/** Required confirmations participate in the same inline feedback as text fields. */
export function Confirmation({
  name,
  disabled = false,
  children,
}: {
  name?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const fieldName = name ?? `confirmation-${id}`;
  const validation = useContext(FieldValidation);
  const register = validation?.register;
  const ref = useCallback(
    (node: HTMLInputElement | null) => {
      if (node && register)
        return register({ name: fieldName, id, label: "Confirmation" });
    },
    [register, fieldName, id],
  );
  const error = fieldError(validation, fieldName);
  return (
    <div className="ui-confirmation">
      <label className="check">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          name={fieldName}
          disabled={disabled}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={() => validation?.correct(fieldName)}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

import {
  useEffect,
  useId,
  useState,
  useRef,
  useContext,
  useCallback,
} from "react";
import { FieldValidation, fieldError } from "../../ui/form-validation";
import type { FormField } from "./model";
export function AnswerInput({
  field,
  value,
  change,
  error: suppliedError,
  disabled = false,
}: {
  disabled?: boolean;
  field: FormField;
  value: string;
  change: (v: string) => void;
  error?: string | undefined;
}) {
  const id = useId();
  const validation = useContext(FieldValidation);
  const register = validation?.register;
  const name = "answers." + field.key;
  const error = suppliedError || fieldError(validation, name);
  const fieldRef = useCallback(
    (node: HTMLElement | null) => {
      if (node && register) return register({ name, id, label: field.label });
    },
    [name, id, field.label, register],
  );
  const [show, setShow] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);
  const editorRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      editor.current = node;
      return fieldRef(node);
    },
    [fieldRef],
  );
  useEffect(() => {
    if (show) editor.current?.focus();
  }, [show]);
  useEffect(() => {
    const hide = () => {
      setShow(false);
    };
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  const props = {
    id,
    ref: fieldRef,
    disabled,
    value,
    name: "answers." + field.key,
    required: field.required,
    maxLength: 2000,
    autoComplete: "off",
    spellCheck: !field.secure,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [id + "-help", error ? id + "-error" : ""]
      .filter(Boolean)
      .join(" "),
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      change(e.target.value);
      validation?.correct(name);
    },
  };
  return (
    <div className="catalog-label">
      <label htmlFor={id}>
        {field.label}
        {field.required ? " (required)" : " (optional)"}
        {field.secure && <span className="form-secure-badge">Protected</span>}
      </label>
      {field.kind === "select" ? (
        <select {...props}>
          <option value="">Choose…</option>
          {field.options?.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : field.kind === "multiline" && field.secure ? (
        <>
          <button
            className="chat-text-button"
            ref={show ? undefined : fieldRef}
            id={show ? undefined : id}
            name={show ? undefined : "answers." + field.key}
            aria-describedby={props["aria-describedby"]}
            aria-label={`${show ? "Hide" : "Edit"} ${field.label}`}
            type="button"
            disabled={disabled}
            onClick={() => {
              setShow((v) => !v);
            }}
          >
            {show
              ? "Hide protected text"
              : value
                ? "Edit protected text"
                : "Enter protected text"}
          </button>
          {show ? (
            <textarea {...props} ref={editorRef} rows={4} />
          ) : (
            <span>Protected text {value ? "entered" : "not entered"}</span>
          )}
        </>
      ) : field.kind === "multiline" ? (
        <textarea {...props} rows={3} />
      ) : (
        <input {...props} type={field.secure ? "password" : "text"} />
      )}
      <small id={id + "-help"}>
        {field.secure
          ? "Encrypted; never shown in message previews."
          : "Visible to the people listed above."}
      </small>
      {error && (
        <p id={id + "-error"} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

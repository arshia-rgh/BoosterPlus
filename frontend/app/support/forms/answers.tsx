import { useEffect, useId, useState, useRef } from "react";
import type { FormField } from "./model";
export function AnswerInput({
  field,
  value,
  change,
  error,
  disabled = false,
}: {
  disabled?: boolean;
  field: FormField;
  value: string;
  change: (v: string) => void;
  error?: string | undefined;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);
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
    disabled,
    value,
    name: "answers." + field.key,
    required: field.required,
    maxLength: 2000,
    autoComplete: "off",
    spellCheck: !field.secure,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? id + "-error" : id + "-help",
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      change(e.target.value);
    },
  };
  return (
    <div className="catalog-label">
      <label htmlFor={id}>
        {field.label}
        {field.required ? " *" : " (optional)"}
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
            <textarea {...props} ref={editor} rows={4} />
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

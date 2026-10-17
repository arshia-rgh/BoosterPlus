import { activePortal, portalHeaders } from "../identity/portal";
import { useEffect, useId, useRef, useState } from "react";
import { z } from "../validation";
import { APIError, command, get, post, sessionSchema } from "../identity/api";
import { Action, ErrorNotice } from "../catalog/controls";
import "./attachment.css";
import { uploadError } from "./upload-error";
import { FieldValidation } from "../ui/form-validation";

const mediaSchema = z.object({
  id: z.string(),
  state: z.enum([
    "pending",
    "uploaded",
    "queued",
    "ready",
    "rejected",
    "deleted",
    "scan_failed",
  ]),
  content_type: z.string(),
  size: z.number(),
  expires_at: z.string(),
});
type Media = z.infer<typeof mediaSchema>;

export function UploadImage({
  conversation,
  admin,
  visibility,
  change,
  compact = false,
  intakeKey = "",
  label = "Image attachment",
  describedBy,
  invalid,
  operationPending,
}: {
  conversation: string;
  admin: boolean;
  visibility: string;
  change: (id: string, pending: boolean) => void;
  compact?: boolean;
  intakeKey?: string;
  label?: string;
  describedBy?: string | undefined;
  invalid?: boolean | undefined;
  operationPending?: (pending: boolean) => void;
}) {
  const guidance = useId();
  const base = (admin ? "/admin" : "") + "/media";
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null),
    outcomeRef = useRef<HTMLDivElement>(null),
    uploadRef = useRef<HTMLButtonElement>(null),
    focusTarget = useRef<"input" | "status" | "upload" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [item, setItem] = useState<Media | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [removalPending, setRemovalPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    // Selecting a local file is a discardable draft. Once a reservation starts,
    // protect navigation until its upload/scan resolves or removal is confirmed.
    operationPending?.(
      busy ||
        removalPending ||
        (started &&
          (!item || ["pending", "uploaded", "queued"].includes(item.state))),
    );
  }, [busy, started, item, removalPending, operationPending]);
  useEffect(() => {
    if (busy || !focusTarget.current) return;
    const target =
      focusTarget.current === "input"
        ? inputRef.current
        : focusTarget.current === "upload"
          ? uploadRef.current
          : outcomeRef.current;
    focusTarget.current = null;
    // Safari may fall back to the focusable record ancestor when a busy control
    // disappears. Repair that fallback too, but never steal another field's focus.
    if (
      document.activeElement === document.body ||
      rootRef.current?.contains(document.activeElement) ||
      (rootRef.current && document.activeElement?.contains(rootRef.current))
    ) {
      target?.focus({ preventScroll: true });
      if (target && typeof target.scrollIntoView === "function")
        target.scrollIntoView({ block: "center" });
    }
  }, [busy, file, item, error]);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (
      !file ||
      file.size > 4 * 1024 * 1024 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    )
      return;
    const reader = new FileReader();
    let active = true;
    reader.onload = () => {
      if (active && typeof reader.result === "string")
        setPreview({ file, url: reader.result });
    };
    reader.readAsDataURL(file);
    return () => {
      active = false;
      if (reader.readyState === 1) reader.abort();
    };
  }, [file]);
  useEffect(() => {
    if (item?.state !== "queued" || removalPending) return;
    let active = true;
    const timer = setInterval(() => {
      void get(base + "/" + item.id, mediaSchema)
        .then((next) => {
          if (!active) return;
          setItem(next);
          change(next.state === "ready" ? next.id : "", next.state !== "ready");
        })
        .catch((cause: unknown) => {
          if (active) setError(cause);
        });
    }, 1500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [item, base, change, removalPending]);
  async function upload() {
    if (!file) return;
    focusTarget.current = "status";
    const portal = activePortal();
    const active = () => mounted.current && activePortal() === portal;
    setBusy(true);
    setError(null);
    change("", true);
    try {
      if (
        file.size < 1 ||
        file.size > 4 * 1024 * 1024 ||
        !["image/png", "image/jpeg", "image/webp"].includes(file.type)
      )
        throw new APIError(
          "Choose a JPEG, PNG, or WebP image no larger than 4 MB (4,194,304 bytes).",
        );
      const bytes = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const checksum = Array.from(new Uint8Array(digest), (v) =>
        v.toString(16).padStart(2, "0"),
      ).join("");
      setStarted(true);
      const created =
        item ??
        (await post(
          base,
          {
            request_key: key,
            conversation_id: conversation,
            ...(intakeKey ? { intake_key: intakeKey } : {}),
            visibility,
            checksum,
            size: file.size,
            content_type: file.type,
          },
          mediaSchema,
          portal,
        ));
      if (!active()) return;
      setItem(created);
      if (created.state === "pending" || created.state === "uploaded") {
        const session = await get("/auth/session", sessionSchema, portal);
        if (!active()) return;
        const response = await fetch(
          "/api/v1" + base + "/" + created.id + "/bytes",
          {
            method: "PUT",
            credentials: "same-origin",
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
            headers: {
              ...portalHeaders(base, portal),
              "Content-Type": "application/octet-stream",
              "X-CSRF-Token": session.csrf_token,
            },
            body: bytes,
          },
        ).catch(() => {
          throw new APIError(
            "Image upload failed. Retry the same image when your connection recovers.",
          );
        });
        if (!response.ok) throw uploadError(response.status);
      }
      if (!active()) return;
      const next = await post(
        base + "/" + created.id + "/finalize",
        {},
        mediaSchema,
        portal,
      );
      if (!active()) return;
      setItem(next);
      change(next.state === "ready" ? next.id : "", next.state !== "ready");
    } catch (cause) {
      setError(cause);
      if (mounted.current) change("", true);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    focusTarget.current = "input";
    setBusy(true);
    setError(null);
    setRemovalPending(true);
    change("", true);
    try {
      if (item) await command(base + "/" + item.id + "/remove");
      setItem(null);
      setStarted(false);
      setRemovalPending(false);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setKey(crypto.randomUUID());
      if (mounted.current) change("", false);
    } catch (cause) {
      setError(cause);
      focusTarget.current = "status";
    } finally {
      setBusy(false);
    }
  }
  async function retryScan() {
    if (!item) return;
    focusTarget.current = "status";
    setBusy(true);
    setError(null);
    try {
      await command(base + "/" + item.id + "/retry");
      setItem({ ...item, state: "queued" });
      if (mounted.current) change("", true);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      ref={rootRef}
      aria-label={label === "Image attachment" ? label : `${label} upload`}
      className={compact ? "chat-attachment" : undefined}
    >
      {!compact && label === "Image attachment" && <h3>Attach an image</h3>}
      <p id={guidance}>
        JPEG, PNG or WebP · up to 4 MB. Remove private details first.
      </p>
      {
        <label>
          {label === "Image attachment"
            ? "Choose image"
            : `Choose ${label.toLowerCase()}`}
          <input
            ref={inputRef}
            aria-describedby={[guidance, describedBy].filter(Boolean).join(" ")}
            aria-invalid={invalid || undefined}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy || file !== null}
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              focusTarget.current = selected ? "upload" : "input";
              setFile(selected);
              change("", selected !== null);
              setKey(crypto.randomUUID());
              setError(null);
            }}
          />
        </label>
      }
      {file && <p className="attachment-filename">{file.name}</p>}
      <details className="attachment-limits">
        <summary>Image limits</summary>
        <p>
          Maximum 4,194,304 bytes and 4 million pixels. Never upload passwords
          or recovery codes.
        </p>
      </details>
      {preview?.file === file && (
        <figure className="attachment-preview">
          <img src={preview.url} alt="Selected attachment preview" />
          <figcaption>
            {item && item.state !== "pending"
              ? "Local preview · uploaded privately"
              : "Local preview · upload not yet confirmed"}
          </figcaption>
        </figure>
      )}
      {busy && (
        <progress
          className="attachment-upload-progress"
          aria-label="Image upload progress"
        />
      )}
      {file &&
        !removalPending &&
        (!item || item.state === "pending" || item.state === "uploaded") && (
          <button
            ref={uploadRef}
            className="button"
            type="button"
            disabled={busy}
            onClick={(event) => {
              event.currentTarget.focus();
              void upload();
            }}
          >
            {busy ? "Uploading…" : "Upload image"}
          </button>
        )}
      <div ref={outcomeRef} tabIndex={-1}>
        {removalPending && !busy && (
          <p role="status">
            Removal is not confirmed. Retry Remove attachment before sending
            these screenshots or leaving this draft.
          </p>
        )}
        {item && !removalPending && (
          <p role="status">
            {item.state === "ready"
              ? "Image checked and ready to send."
              : item.state === "queued"
                ? "Checking image safety…"
                : item.state === "rejected"
                  ? "This image could not be accepted. Remove this attachment, then choose a different JPEG, PNG, or WebP."
                  : item.state === "scan_failed"
                    ? "Safety checks are unavailable. Retry when the service recovers."
                    : "Upload not yet ready."}
          </p>
        )}
        <FieldValidation value={null}>
          <ErrorNotice error={error} />
        </FieldValidation>
      </div>
      {item?.state === "scan_failed" && !removalPending && (
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={(event) => {
            event.currentTarget.focus();
            void retryScan();
          }}
        >
          Retry safety check
        </button>
      )}
      {file && (
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={(event) => {
            event.currentTarget.focus();
            void remove();
          }}
        >
          Remove attachment
        </button>
      )}
    </section>
  );
}

export function DownloadImage({ id, admin }: { id: string; admin: boolean }) {
  const [url, setURL] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!url) return;
    const timer = setTimeout(() => {
      setURL("");
    }, 50000);
    return () => {
      clearTimeout(timer);
    };
  }, [url]);
  async function prepare() {
    setBusy(true);
    setError(null);
    try {
      const base =
        "/api/v1" + (admin ? "/admin" : "") + "/media/" + id + "/content?";
      const result = await post(
        (admin ? "/admin" : "") + "/media/" + id + "/grant",
        {},
        z.object({ url: z.string().startsWith(base) }),
      );
      setURL(result.url);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {url ? (
        <a href={url} download rel="noreferrer">
          Download image
        </a>
      ) : (
        <Action disabled={busy} onClick={() => void prepare()}>
          Get image download
        </Action>
      )}
      <FieldValidation value={null}>
        <ErrorNotice error={error} />
      </FieldValidation>
    </div>
  );
}

import { activePortal, portalHeaders } from "../identity/portal";
import { useEffect, useId, useRef, useState } from "react";
import { z } from "../validation";
import { APIError, command, get, post, sessionSchema } from "../identity/api";
import { Action, ErrorNotice } from "../catalog/controls";

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
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [item, setItem] = useState<Media | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
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
    if (item?.state !== "queued") return;
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
  }, [item, base, change]);
  async function upload() {
    if (!file) return;
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
          "Choose a JPEG, PNG, or WebP image no larger than 4 MiB.",
        );
      const bytes = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const checksum = Array.from(new Uint8Array(digest), (v) =>
        v.toString(16).padStart(2, "0"),
      ).join("");
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
        if (!response.ok)
          throw new APIError(
            "Image upload failed. Retry the same image or sign in again if your session ended.",
          );
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
    setBusy(true);
    setError(null);
    try {
      if (item) await command(base + "/" + item.id + "/remove");
      setItem(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setKey(crypto.randomUUID());
      if (mounted.current) change("", false);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  async function retryScan() {
    if (!item) return;
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
      aria-label={label === "Image attachment" ? label : `${label} upload`}
      className={compact ? "chat-attachment" : undefined}
    >
      {!compact && label === "Image attachment" && <h3>Attach an image</h3>}
      <p id={guidance}>
        JPEG, PNG, or WebP, up to 4 MiB and 4 million pixels. Remove personal
        information before uploading. Do not upload game credentials.
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
              setFile(selected);
              change("", selected !== null);
              setKey(crypto.randomUUID());
              setError(null);
            }}
          />
        </label>
      }
      {file && <p>{file.name}</p>}
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
      {busy && <progress aria-label="Image upload progress" />}
      {file &&
        (!item || item.state === "pending" || item.state === "uploaded") && (
          <Action disabled={busy} onClick={() => void upload()}>
            {busy ? "Uploading…" : "Upload image"}
          </Action>
        )}
      {item && (
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
      {item?.state === "scan_failed" && (
        <Action disabled={busy} onClick={() => void retryScan()}>
          Retry safety check
        </Action>
      )}
      {file && (
        <Action disabled={busy} onClick={() => void remove()}>
          Remove attachment
        </Action>
      )}
      <ErrorNotice error={error} />
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
      <ErrorNotice error={error} />
    </div>
  );
}

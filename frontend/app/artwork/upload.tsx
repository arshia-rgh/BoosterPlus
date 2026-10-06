import { useContext, useEffect, useId, useRef, useState } from "react";
import { FieldValidation } from "../ui/form-validation";
import { Action, Select, Text } from "../catalog/controls";
import { get, sessionSchema } from "../identity/api";
import { activePortal, portalHeaders } from "../identity/portal";
import {
  guidance,
  rendition,
  uploadSchema,
  validArtwork,
  type Purpose,
  type Uploaded,
} from "./model";
import "./artwork.css";

type Choice = {
  file: File;
  url: string;
  id: string;
  width: number;
  height: number;
};
export default function ArtworkUpload({
  value,
  change,
  purpose,
  pathLabel,
  defaultAsset,
}: {
  value: string;
  change: (asset: string) => void;
  purpose: Purpose;
  pathLabel: string;
  defaultAsset?: string | undefined;
}) {
  const id = useId();
  const validation = useContext(FieldValidation);
  const fieldName = purpose === "inline" ? undefined : "asset";
  const invalid =
    !!fieldName &&
    !!validation?.issues.some((issue) => issue.path === fieldName);
  const [pathOpen, setPathOpen] = useState(false);
  const container = useRef<HTMLFieldSetElement>(null);
  const [loaded, setLoaded] = useState<string[]>([]);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [currentFailed, setCurrentFailed] = useState("");
  const guidanceID = id + "-guidance";
  const input = useRef<HTMLInputElement>(null);
  const [choice, setChoice] = useState<Choice>();
  const [focusX, setFocusX] = useState("50");
  const [focusY, setFocusY] = useState("50");
  const [checked, setChecked] = useState<Uploaded>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const apply = useRef<HTMLButtonElement>(null);
  const info =
    Object.entries(guidance).find(([key]) => key === purpose)?.[1] ??
    guidance.game;
  const crops = purpose === "game" || purpose === "cover";
  useEffect(
    () => () => {
      generation.current++;
      request.current?.abort();
    },
    [],
  );
  const previewNames =
    purpose === "game"
      ? ["wide", "mobile", "card"]
      : crops
        ? ["wide", "card"]
        : ["wide"];
  const previewsReady =
    !!checked &&
    !previewFailed &&
    previewNames.every((name) => loaded.includes(name));
  useEffect(() => {
    if (previewsReady) {
      apply.current?.focus();
    }
  }, [previewsReady]);
  function reset() {
    generation.current++;
    request.current?.abort();
    setChoice(undefined);
    setChecked(undefined);
    setLoaded([]);
    setPreviewFailed(false);
    setBusy(false);
    setError("");
    if (input.current) input.current.value = "";
  }
  async function select(file: File | undefined) {
    reset();
    setStatus("");
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size === 0 ||
      file.size > 4194304
    ) {
      setError(
        "Choose a JPEG, PNG or WebP image up to 4 MiB. SVG and animated formats are not supported.",
      );
      return;
    }
    const version = generation.current;
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("read"));
        };
        reader.onerror = () => {
          reject(new Error("read"));
        };
        reader.onabort = () => {
          reject(new Error("read"));
        };
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = url;
      await image.decode();
      if (version !== generation.current) {
        return;
      }
      if (
        image.naturalWidth > 4096 ||
        image.naturalHeight > 4096 ||
        image.naturalWidth * image.naturalHeight > 4000000
      )
        throw new Error("size");
      setChoice({
        file,
        url,
        id: crypto.randomUUID(),
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setFocusX("50");
      setFocusY("50");
    } catch {
      if (version === generation.current)
        setError(
          "This image could not be opened or exceeds 4 megapixels / 4096 px per edge. Export a smaller still image and try again.",
        );
    }
  }
  function focal(axis: "x" | "y", value: string) {
    if (axis === "x") setFocusX(value);
    else setFocusY(value);
    setChecked(undefined);
    setError("");
    setStatus("");
    setChoice((c) => (c ? { ...c, id: crypto.randomUUID() } : c));
  }
  async function upload() {
    if (!choice || busy) return;
    const version = generation.current;
    setBusy(true);
    setError("");
    setStatus("Checking image and preparing versions…");
    request.current = new AbortController();
    const timer = setTimeout(() => request.current?.abort(), 65000);
    try {
      const session = await get("/auth/session", sessionSchema, "admin");
      if (version !== generation.current || activePortal() !== "admin") return;
      const query = new URLSearchParams({
        purpose,
        focus_x: focusX,
        focus_y: focusY,
      });
      const response = await fetch(
        `/api/v1/admin/artwork/${choice.id}/bytes?${query.toString()}`,
        {
          method: "PUT",
          credentials: "same-origin",
          cache: "no-store",
          signal: request.current.signal,
          headers: {
            ...portalHeaders("/admin/artwork", "admin"),
            "Content-Type": choice.file.type,
            "X-CSRF-Token": session.csrf_token,
          },
          body: choice.file,
        },
      );
      if (!response.ok) {
        const messages: Record<number, string> = {
          401: "Your admin session ended. Sign in again, then retry this image.",
          403: "Admin verification is required. Verify your session, then retry.",
          409: "This upload is still processing or its state changed. Wait a moment, then retry the same image.",
          422: "The safety check rejected this image. Choose a different JPEG, PNG or WebP file.",
          429: "The image service is busy or the upload limit was reached. Wait before retrying.",
        };
        throw new Error(
          messages[response.status] ??
            "Image processing is unavailable. Your current image is unchanged. Retry this upload when the service recovers.",
        );
      }
      const result = uploadSchema.parse(await response.json());
      if (version !== generation.current) return;
      setLoaded([]);
      setPreviewFailed(false);
      setChecked(result);
      setStatus("Safety checks passed. Loading image previews…");
    } catch (e) {
      if (version === generation.current) {
        setStatus("");
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "The connection timed out. Your current image is unchanged. Retry the same upload to recover its result.",
        );
      }
    } finally {
      clearTimeout(timer);
      if (version === generation.current) setBusy(false);
    }
  }
  return (
    <fieldset
      ref={container}
      className="artwork-upload"
      data-purpose={purpose}
      aria-describedby={guidanceID}
    >
      <legend>{info.label}</legend>
      <div id={guidanceID}>
        <p>{info.recommendation}</p>
        <p className="quiet">
          {info.details} JPEG, PNG or WebP · up to 4 MiB and 4 megapixels.
        </p>
      </div>
      {value && validArtwork(value) && currentFailed !== value && (
        <figure className="artwork-current">
          <img
            src={rendition(value, "card", true)}
            onError={() => {
              setCurrentFailed(value);
            }}
            alt="Current draft artwork"
            loading="lazy"
          />
          <figcaption>
            Current draft image
            {value === defaultAsset ? " · default artwork" : ""}
          </figcaption>
        </figure>
      )}
      {currentFailed === value && value && (
        <p role="status">
          Current artwork could not load. Your saved choice is unchanged. Choose
          a replacement or check the existing path.
        </p>
      )}
      <label className="catalog-label" htmlFor={id}>
        Choose a replacement image
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          aria-describedby={guidanceID}
          onChange={(e) => void select(e.target.files?.[0])}
        />
      </label>
      {choice && (
        <>
          <p>
            {choice.width} × {choice.height} px ·{" "}
            {(choice.file.size / 1048576).toFixed(2)} MiB
          </p>
          {Math.max(choice.width, choice.height) < 1600 && (
            <p className="artwork-warning">
              This image is smaller than recommended. We will not enlarge it; it
              may look soft in large placements.
            </p>
          )}
          {crops && (
            <fieldset disabled={busy || !!checked}>
              <legend>Keep the subject in view</legend>
              <div className="artwork-focal">
                <Select
                  label="Horizontal focal point"
                  value={focusX}
                  options={[
                    ["0", "Left"],
                    ["25", "Left of centre"],
                    ["50", "Centre"],
                    ["75", "Right of centre"],
                    ["100", "Right"],
                  ]}
                  change={(v) => {
                    focal("x", v);
                  }}
                />
                <Select
                  label="Vertical focal point"
                  value={focusY}
                  options={[
                    ["0", "Top"],
                    ["25", "Above centre"],
                    ["50", "Centre"],
                    ["75", "Below centre"],
                    ["100", "Bottom"],
                  ]}
                  change={(v) => {
                    focal("y", v);
                  }}
                />
              </div>
              <p className="quiet">
                Check the crop previews. Leave breathing room around faces and
                important details.
              </p>
            </fieldset>
          )}
          <div
            className="artwork-previews"
            data-focus-x={focusX}
            data-focus-y={focusY}
          >
            {previewNames.map((variant) => (
              <figure key={variant}>
                <div className={`artwork-crop ${crops ? variant : "contain"}`}>
                  <img
                    key={`${checked?.id ?? choice.id}:${String(previewAttempt)}:${variant}`}
                    onLoad={() => {
                      if (checked)
                        setLoaded((previous) =>
                          previous.includes(variant)
                            ? previous
                            : [...previous, variant],
                        );
                    }}
                    onError={() => {
                      if (checked) setPreviewFailed(true);
                    }}
                    src={
                      checked
                        ? rendition(
                            checked.asset,
                            variant as "wide" | "mobile" | "card",
                            true,
                          ) +
                          "?preview=" +
                          String(previewAttempt)
                        : choice.url
                    }
                    alt={`${variant === "mobile" ? "Phone" : variant === "card" ? "Card" : "Large image"} preview`}
                    data-prepared={!!checked}
                  />
                </div>
                <figcaption>
                  {variant === "mobile"
                    ? "Phone crop"
                    : variant === "card"
                      ? "Card crop"
                      : crops
                        ? "Wide hero"
                        : "Full image"}
                  {checked
                    ? ` · ${String(Object.entries(checked.variants).find(([key]) => key === variant)?.[1].width)} × ${String(Object.entries(checked.variants).find(([key]) => key === variant)?.[1].height)} px`
                    : " · preview"}
                </figcaption>
              </figure>
            ))}
          </div>
          {checked && previewFailed && (
            <div role="alert">
              <p>
                One or more previews could not load. Your current image is
                unchanged.
              </p>
              <Action
                onClick={() => {
                  setLoaded([]);
                  setPreviewFailed(false);
                  setPreviewAttempt((n) => n + 1);
                  setStatus("Reloading checked image previews…");
                }}
              >
                Retry image previews
              </Action>
            </div>
          )}
          {busy && <progress aria-label="Preparing image versions" />}
          <div className="actions">
            {!checked && (
              <Action disabled={busy} onClick={() => void upload()}>
                {busy
                  ? "Preparing…"
                  : error
                    ? "Retry image upload"
                    : "Prepare image versions"}
              </Action>
            )}
            {checked && (
              <button
                ref={apply}
                disabled={!previewsReady}
                type="button"
                className="button"
                onClick={() => {
                  change(checked.asset);
                  reset();
                  setStatus(
                    "Image added to this draft. Check alternative text and attribution, then save and publish when ready.",
                  );
                  input.current?.focus();
                }}
              >
                Use this image
              </button>
            )}
            <Action
              disabled={busy}
              onClick={() => {
                reset();
                setStatus(
                  "Replacement cancelled. Your current draft image is unchanged.",
                );
                input.current?.focus();
              }}
            >
              Cancel replacement
            </Action>
            {checked && crops && (
              <Action
                onClick={() => {
                  setChecked(undefined);
                  setLoaded([]);
                  setPreviewFailed(false);
                  requestAnimationFrame(() =>
                    container.current
                      ?.querySelector<HTMLSelectElement>("select")
                      ?.focus(),
                  );
                  setChoice((c) => (c ? { ...c, id: crypto.randomUUID() } : c));
                  setStatus(
                    "Adjust the focal point, then prepare new versions.",
                  );
                }}
              >
                Adjust crop
              </Action>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {(previewsReady || status) && (
        <p role="status">
          {previewsReady
            ? "Versions ready. Review them, then use this image in your draft."
            : status}
        </p>
      )}
      <p className="quiet">
        Uploads stay private until the page is published. Only upload artwork
        you may use publicly; never include account credentials or personal
        details.
      </p>
      {defaultAsset && value !== defaultAsset && (
        <Action
          disabled={busy}
          onClick={() => {
            reset();
            change(defaultAsset);
            input.current?.focus();
            setStatus(
              "Default artwork restored in this draft. Save and publish to update the live game.",
            );
          }}
        >
          Restore default game artwork
        </Action>
      )}
      <details
        open={invalid || pathOpen}
        onToggle={(e) => {
          setPathOpen(e.currentTarget.open);
        }}
      >
        <summary>Existing artwork path</summary>
        <Text
          name={fieldName}
          label={pathLabel}
          value={value}
          change={change}
          help="Keep the bundled path or use a checked upload. External URLs and private order images are not supported."
        />
      </details>
    </fieldset>
  );
}

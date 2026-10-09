import { rendition } from "../artwork/model";
import { useId, useState } from "react";
import { Check, Select } from "./controls";
import { defaultHeroLayout, type Configuration } from "./model";
import "./hero-layout-editor.css";
import "./artwork-framing.css";
export type HeroLayout = NonNullable<Configuration["hero_layout"]>;
export default function HeroLayoutEditor({
  config,
  change,
}: {
  config: Configuration;
  change: (layout: HeroLayout | undefined) => void;
}) {
  const id = useId();
  const [failedSource, setFailedSource] = useState("");
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const layout = config.hero_layout;
  const fields = [
    ["desktop_x", "Desktop horizontal focus", layout?.desktop_x],
    ["desktop_y", "Desktop vertical focus", layout?.desktop_y],
    ["mobile_x", "Mobile horizontal focus", layout?.mobile_x],
    ["mobile_y", "Mobile vertical focus", layout?.mobile_y],
  ] as const;
  return (
    <fieldset className="catalog-section">
      <legend>Game artwork framing</legend>
      <p>
        Keep the character visible and the text away from its face. These
        settings are saved with this catalog version and take effect only when
        you publish it.
      </p>
      <Check
        label="Customize game artwork framing"
        name="hero_layout"
        value={!!layout}
        change={(enabled) => {
          change(enabled ? { ...defaultHeroLayout } : undefined);
        }}
      />
      {layout && (
        <>
          <Select
            label="Desktop text placement"
            name="hero_layout.copy_side"
            value={layout.copy_side}
            options={[
              ["left", "Left side"],
              ["right", "Right side"],
            ]}
            change={(side) => {
              if (side === "left" || side === "right")
                change({ ...layout, copy_side: side });
            }}
          />
          <p id={id + "-help"}>
            Horizontal: 0 is left, 100 is right. Vertical: 0 is top, 100 is
            bottom. On phones, text sits over the lower shaded area.
          </p>
          <div className="catalog-grid">
            {fields.map(([key, label, value]) => (
              <label className="catalog-label" key={key} htmlFor={id + key}>
                {label}
                <input
                  id={id + key}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={value}
                  aria-describedby={id + "-help"}
                  onChange={(event) => {
                    change({ ...layout, [key]: Number(event.target.value) });
                  }}
                />
                <output aria-hidden="true" htmlFor={id + key}>
                  {value}%
                </output>
              </label>
            ))}
          </div>
          {config.asset && (
            <div className="artwork-preview-status">
              <p role="status">
                {failedSource === config.asset
                  ? "Artwork could not load. Check the approved asset path before publishing."
                  : "Framing preview uses the current draft artwork."}
              </p>
              <button
                className="button compact"
                type="button"
                onClick={() => {
                  setFailedSource("");
                  setPreviewAttempt((attempt) => attempt + 1);
                }}
              >
                {failedSource === config.asset
                  ? "Retry artwork"
                  : "Reload artwork preview"}
              </button>
            </div>
          )}
          {config.asset && failedSource !== config.asset && (
            <div className="artwork-framing-previews">
              {["desktop", "mobile"].map((size) => (
                <figure key={size}>
                  <figcaption>
                    {size === "desktop" ? "Desktop framing" : "Phone framing"} ·
                    draft preview
                  </figcaption>
                  <div
                    className={`artwork-framing-image ${size}`}
                    data-copy-side={layout.copy_side}
                  >
                    <img
                      key={previewAttempt}
                      src={rendition(
                        config.asset,
                        size === "mobile" ? "mobile" : "wide",
                        true,
                      )}
                      alt={config.asset_alt}
                      onError={() => {
                        setFailedSource(config.asset);
                      }}
                      data-art-desktop-x={
                        size === "desktop" ? layout.desktop_x : layout.mobile_x
                      }
                      data-art-desktop-y={
                        size === "desktop" ? layout.desktop_y : layout.mobile_y
                      }
                    />
                    <span>Text area</span>
                  </div>
                </figure>
              ))}
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}

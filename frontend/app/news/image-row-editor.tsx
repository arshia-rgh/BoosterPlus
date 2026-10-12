import { useContext, useRef, useState } from "react";
import ArtworkUpload from "../artwork/upload";
import { Action, Text, move } from "../catalog/controls";
import { FieldValidation, fieldError } from "../ui/form-validation";
import type { Block } from "./model";

export default function ImageRowEditor({
  images,
  path,
  change,
}: {
  images: NonNullable<Block["images"]>;
  path: string;
  change: (images: NonNullable<Block["images"]>) => void;
}) {
  const [keys, setKeys] = useState(() => images.map((_, i) => String(i)));
  const next = useRef(images.length);
  const container = useRef<HTMLFieldSetElement>(null);
  const validation = useContext(FieldValidation);
  const message = fieldError(validation, path);
  function focus(index: number) {
    requestAnimationFrame(() => {
      (
        container.current?.querySelector<HTMLElement>(
          `[data-image-index="${String(index)}"] input, [data-image-index="${String(index)}"] button`,
        ) ?? container.current?.querySelector<HTMLElement>("[data-add-image]")
      )?.focus();
    });
  }
  const update = (
    index: number,
    patch: Partial<NonNullable<Block["images"]>[number]>,
  ) => {
    change(
      images.map((image, i) => (i === index ? { ...image, ...patch } : image)),
    );
  };
  return (
    <fieldset
      ref={container}
      className="news-image-row-editor"
      name={path}
      tabIndex={-1}
    >
      <legend>Images in this row</legend>
      <p>
        Upload up to four images, each no larger than 4 MB (4,194,304 bytes).
        They stay side by side when space allows and stack on phones. Each image
        keeps its full proportions.
      </p>
      {message && <p className="field-error">{message}</p>}
      {images.map((image, i) => (
        <fieldset
          className="news-row-image"
          key={keys.at(i) ?? `external-${String(i)}`}
          data-image-index={i}
        >
          <legend>Image {i + 1}</legend>
          <ArtworkUpload
            purpose="inline"
            name={`${path}.${String(i)}.url`}
            label={`Upload image ${String(i + 1)}`}
            pathLabel={`Image ${String(i + 1)} path`}
            value={image.url}
            change={(url) => {
              update(i, { url });
            }}
          />
          <Text
            name={`${path}.${String(i)}.alt`}
            label={`Image ${String(i + 1)} description`}
            value={image.alt}
            change={(alt) => {
              update(i, { alt });
            }}
          />
          <Text
            name={`${path}.${String(i)}.source`}
            label={`Image ${String(i + 1)} attribution / rights`}
            value={image.source}
            change={(source) => {
              update(i, { source });
            }}
          />
          <Text
            name={`${path}.${String(i)}.caption`}
            label={`Image ${String(i + 1)} caption (optional)`}
            value={image.caption}
            change={(caption) => {
              update(i, { caption });
            }}
          />
          <div className="catalog-actions">
            {([-1, 1] as const).map((direction) => (
              <Action
                key={direction}
                disabled={direction === -1 ? i === 0 : i === images.length - 1}
                onClick={() => {
                  setKeys((old) => move(old, i, direction));
                  change(move(images, i, direction));
                  focus(i + direction);
                }}
              >
                Move image {i + 1} {direction === -1 ? "earlier" : "later"}
              </Action>
            ))}
            <Action
              onClick={() => {
                setKeys((old) => old.filter((_, index) => index !== i));
                change(images.filter((_, index) => index !== i));
                focus(Math.min(i, images.length - 2));
              }}
            >
              Remove image {i + 1}
            </Action>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="button"
        data-add-image
        disabled={images.length >= 4}
        onClick={() => {
          const key = String(next.current++);
          setKeys((old) => [...old, key]);
          change([...images, { url: "", alt: "", source: "", caption: "" }]);
          focus(images.length);
        }}
      >
        Add image to row
      </button>
    </fieldset>
  );
}

import { useEffect, useId, useState } from "react";
import { useCharacterMotion } from "./character-motion";

const poster = "/characters/miya-768.jpg";
const fields = [
  "/characters/miya-breath-field.svg",
  "/characters/miya-hair-field.svg",
];

export default function MiyaArt({ enabled }: { enabled: boolean }) {
  const [assetState, setAssetState] = useState<
    "loading" | "ready" | "static" | "failed"
  >("loading");
  const animated = enabled && assetState === "ready";
  const root = useCharacterMotion(animated, 8);
  const uid = useId().replaceAll(":", "");
  useEffect(() => {
    let current = true;
    const images: HTMLImageElement[] = [];
    const load = (source: string) =>
      new Promise<boolean>((resolve) => {
        const image = new Image();
        images.push(image);
        image.onload = () => {
          resolve(true);
        };
        image.onerror = () => {
          resolve(false);
        };
        image.src = source;
      });
    void Promise.all([load(poster), ...fields.map(load)]).then(
      ([art, ...maps]) => {
        if (current)
          setAssetState(
            !art ? "failed" : maps.every(Boolean) ? "ready" : "static",
          );
      },
    );
    return () => {
      current = false;
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, []);
  if (assetState === "failed")
    return <div className="character-fallback" aria-hidden="true" />;
  return (
    <div
      ref={root}
      className="character-art miya-art"
      data-character="miya"
      data-motion={animated ? "full" : "reduced"}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1024 1536" focusable="false" className="character-rig">
        <defs>
          <filter
            id={`${uid}-idle`}
            x="0"
            y="0"
            width="1024"
            height="1536"
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={fields[0]}
              x="0"
              y="0"
              width="1024"
              height="1536"
              result="breath"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="breath"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="0"
              result="torso"
              x="205"
              y="235"
              width="455"
              height="450"
            >
              {animated && (
                <animate
                  attributeName="scale"
                  values="0;12;0"
                  keyTimes="0;0.5;1"
                  keySplines=".42 0 .58 1;.42 0 .58 1"
                  calcMode="spline"
                  dur="7.2s"
                  repeatCount="indefinite"
                  begin="indefinite"
                />
              )}
            </feDisplacementMap>
            <feMerge result="body">
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="torso" />
            </feMerge>
            <feImage
              href={fields[1]}
              x="0"
              y="0"
              width="1024"
              height="1536"
              result="hair"
            />
            <feDisplacementMap
              in="body"
              in2="hair"
              x="535"
              y="205"
              width="235"
              height="330"
              result="hair-motion"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="0"
            >
              {animated && (
                <animate
                  attributeName="scale"
                  values="0;18;0;-8;0"
                  keyTimes="0;0.3;0.6;0.8;1"
                  keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"
                  calcMode="spline"
                  dur="9.6s"
                  repeatCount="indefinite"
                  begin="indefinite"
                />
              )}
            </feDisplacementMap>
            <feMerge>
              <feMergeNode in="body" />
              <feMergeNode in="hair-motion" />
            </feMerge>
          </filter>
        </defs>
        <image
          href={poster}
          width="1024"
          height="1536"
          filter={animated ? `url(#${uid}-idle)` : undefined}
          onError={() => {
            setAssetState("failed");
          }}
        />
      </svg>
    </div>
  );
}

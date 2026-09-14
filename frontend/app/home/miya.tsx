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
      <svg
        viewBox="-32 -24 1088 1584"
        focusable="false"
        className="character-rig"
      >
        <defs>
          <filter
            id={`${uid}-idle`}
            x="-32"
            y="-16"
            width="1088"
            height="1568"
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            {/* Extend the black matte so a shifted bow edge cannot reveal an
                unmoved copy through transparent pixels at the image boundary. */}
            <feFlood floodColor="#000" result="matte" />
            <feMerge result="padded-art">
              <feMergeNode in="matte" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
            <feImage
              href={fields[0]}
              x="-32"
              y="-16"
              width="1088"
              height="1568"
              result="breath"
            />
            <feDisplacementMap
              in="padded-art"
              in2="breath"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="0"
              result="weight-shift"
              x="-32"
              y="-16"
              width="1088"
              height="1256"
            >
              {animated && (
                <animate
                  attributeName="scale"
                  values="0;48;0;-48;0"
                  keyTimes="0;0.25;0.5;0.75;1"
                  keySplines=".33 .52 .67 1;.33 0 .67 .48;.33 .52 .67 1;.33 0 .67 .48"
                  calcMode="spline"
                  dur="6.4s"
                  repeatCount="indefinite"
                  begin="indefinite"
                />
              )}
            </feDisplacementMap>
            <feMerge result="body">
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="weight-shift" />
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
              x="505"
              y="180"
              width="290"
              height="380"
              result="hair-motion"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="0"
            >
              {animated && (
                <animate
                  attributeName="scale"
                  values="0;52;0;-38;0"
                  keyTimes="0;0.3;0.6;0.8;1"
                  keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"
                  calcMode="spline"
                  dur="6.4s"
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

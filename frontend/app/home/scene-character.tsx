import { useEffect, useId, useState } from "react";
import { useCharacterMotion } from "./character-motion";
import type { MotionScene } from "./scene-catalog";

export default function SceneCharacter({
  scene,
  enabled,
  active = true,
  onReady,
}: {
  scene: MotionScene;
  enabled: boolean;
  active?: boolean;
  onReady?: (id: string) => void;
}) {
  const poster = `/characters/${scene.id}-768.jpg`;
  const fields = ["/characters/miya-breath-field.svg", scene.secondary.field];
  const [assetState, setAssetState] = useState<
    "loading" | "ready" | "static" | "failed"
  >("loading");
  const animated = enabled && assetState === "ready";
  const root = useCharacterMotion(animated && active, 8);
  const uid = useId().replaceAll(":", "");
  useEffect(() => {
    let current = true;
    const images: HTMLImageElement[] = [];
    const cancel: (() => void)[] = [];
    const load = (source: string) =>
      new Promise<boolean>((resolve) => {
        const image = new Image();
        images.push(image);
        let done = false;
        const finish = (success: boolean) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          image.onload = null;
          image.onerror = null;
          resolve(success);
        };
        const timer = setTimeout(() => {
          finish(false);
        }, 5000);
        cancel.push(() => {
          finish(false);
        });
        image.onload = () => {
          finish(true);
        };
        image.onerror = () => {
          finish(false);
        };
        image.src = source;
      });
    void Promise.all([
      load(poster),
      load(`/scenes/${scene.id}.jpg`),
      ...["/characters/miya-breath-field.svg", scene.secondary.field].map(load),
    ]).then(([art, , ...maps]) => {
      if (current)
        setAssetState(
          !art ? "failed" : maps.every(Boolean) ? "ready" : "static",
        );
    });
    return () => {
      current = false;
      cancel.forEach((stop) => {
        stop();
      });
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
    // Scenes are keyed by id; only a newly selected scene gets a new asset lifecycle.
  }, [poster, scene.id, scene.secondary.field]);
  useEffect(() => {
    if (assetState !== "loading") onReady?.(scene.id);
  }, [assetState, onReady, scene.id]);
  if (assetState === "failed")
    return <div className="character-fallback" aria-hidden="true" />;
  return (
    <div
      ref={root}
      className={`character-art scene-character ${scene.id}-art`}
      data-character={scene.id}
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
            id={`${uid}-cutout`}
            x="-32"
            y="-16"
            width="1088"
            height="1568"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix
              in="SourceGraphic"
              type="luminanceToAlpha"
              result="luma"
            />
            <feComponentTransfer in="luma" result="edge">
              <feFuncA type="linear" slope="64" intercept="-1" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="edge" operator="in" />
          </filter>
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
                  values={`0;${String(scene.sway)};0;${String(-scene.sway)};0`}
                  keyTimes="0;0.25;0.5;0.75;1"
                  keySplines=".33 .52 .67 1;.33 0 .67 .48;.33 .52 .67 1;.33 0 .67 .48"
                  calcMode="spline"
                  dur={`${String(scene.cycle)}s`}
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
              x={scene.secondary.bounds[0]}
              y={scene.secondary.bounds[1]}
              width={scene.secondary.bounds[2]}
              height={scene.secondary.bounds[3]}
              result="hair-motion"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="0"
            >
              {animated && (
                <animate
                  attributeName="scale"
                  values={`0;${String(scene.secondary.positive)};0;${String(scene.secondary.negative)};0`}
                  keyTimes="0;0.3;0.6;0.8;1"
                  keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"
                  calcMode="spline"
                  dur={`${String(scene.cycle)}s`}
                  repeatCount="indefinite"
                  begin="indefinite"
                />
              )}
            </feDisplacementMap>
            <feMerge result="posed">
              <feMergeNode in="body" />
              <feMergeNode in="hair-motion" />
            </feMerge>
            {/* Keep keying in the animated filter: WebKit can cache an outer
                filter and fail to repaint movement inside a nested filter. */}
            <feColorMatrix
              in="posed"
              type="luminanceToAlpha"
              result="posed-luma"
            />
            <feComponentTransfer in="posed-luma" result="posed-edge">
              <feFuncA type="linear" slope="64" intercept="-1" />
            </feComponentTransfer>
            <feComposite in="posed" in2="posed-edge" operator="in" />
          </filter>
        </defs>
        <g filter={animated ? undefined : `url(#${uid}-cutout)`}>
          <image
            href={poster}
            width="1024"
            height="1536"
            filter={animated ? `url(#${uid}-idle)` : undefined}
            onError={() => {
              setAssetState("failed");
            }}
          />
        </g>
      </svg>
    </div>
  );
}

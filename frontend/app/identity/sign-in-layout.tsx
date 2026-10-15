import { useId, type ReactNode } from "react";
import type { Portal } from "./portal";
import "./sign-in.css";

export function SignInLayout({
  enabled,
  portal,
  children,
}: {
  enabled: boolean;
  portal: Portal;
  children: ReactNode;
}) {
  const glowId = useId();
  if (!enabled) return children;
  return (
    <div className="sign-in-layout">
      <div className="sign-in-art">
        <picture>
          <source
            media="(max-width:700px)"
            srcSet="/artwork/sign-in-gate-carved-1000.jpg"
          />
          <img
            src="/artwork/sign-in-gate-carved-1672.jpg"
            alt=""
            width="1672"
            height="941"
          />
        </picture>
        <svg
          className="sign-in-lightning-bolt"
          viewBox="0 0 1672 941"
          preserveAspectRatio="xMinYMin slice"
          aria-hidden="true"
        >
          <defs>
            <filter
              id={glowId}
              x="-50%"
              y="-20%"
              width="200%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              className="sign-in-bolt-halo"
              filter={`url(#${glowId})`}
              d="M418 -10 412 10 416 14 406 31 410 40 403 42 405 49 383 68 389 73 380 81 383 91 371 103 375 108 355 126 361 137 354 144 359 150 342 167 344 173 334 179 341 191 336 200 318 218 323 225 309 237 313 247 299 263 301 269 288 279"
            />
            <path
              className="sign-in-bolt-core"
              d="M418 -10 412 10 416 14 406 31 410 40 403 42 405 49 383 68 389 73 380 81 383 91 371 103 375 108 355 126"
            />
            <path
              className="sign-in-bolt-middle"
              d="M355 126 361 137 354 144 359 150 342 167 344 173 334 179 341 191 336 200 318 218"
            />
            <path
              className="sign-in-bolt-tip"
              d="M318 218 323 225 309 237 313 247 299 263 301 269 288 279"
            />
            <path
              className="sign-in-bolt-branches"
              d="M383 68 365 74 361 83 344 87 348 95 335 108 337 114 315 127 318 132 307 143 299 158 M355 126 368 133 370 143 386 151 384 160 396 174 394 183 409 193 M309 237 294 240 288 250 278 251 264 264 M344 87 326 88 318 97 M386 151 403 152 411 164"
            />
          </g>
        </svg>
      </div>
      <div className="sign-in-lightning-glow" aria-hidden="true" />
      <div className="sign-in-rain" aria-hidden="true">
        {Array.from({ length: 28 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <aside className="sign-in-story" aria-label="Welcome to PLAYORA">
        <div>
          <p className="eyebrow">MANY WORLDS. ONE PLAYORA.</p>
          <h2>
            {portal === "customer" ? (
              <>
                Your next chapter <br />
                starts here.
              </>
            ) : portal === "booster" ? (
              <>
                Great play. <br />
                Together.
              </>
            ) : (
              <>
                Everything you need. <br />
                In your corner.
              </>
            )}
          </h2>
          <p>
            {portal === "customer"
              ? "Your orders, updates and conversations. All together."
              : portal === "booster"
                ? "Your assignments, schedule and team. One workspace."
                : "Keep your team, catalog and customers connected."}
          </p>
        </div>
      </aside>
      <div className="sign-in-panel">{children}</div>
    </div>
  );
}

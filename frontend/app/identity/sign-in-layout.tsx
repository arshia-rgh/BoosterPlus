import type { ReactNode } from "react";
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
  if (!enabled) return children;
  return (
    <div className="sign-in-layout">
      <div className="sign-in-art">
        <picture>
          <source
            media="(max-width:700px)"
            srcSet="/artwork/sign-in-journey-wide-1000.jpg"
          />
          <img
            src="/artwork/sign-in-journey-wide-1672.jpg"
            alt=""
            width="1672"
            height="941"
          />
        </picture>
        <svg
          className="sign-in-gate-brand"
          viewBox="0 0 1672 941"
          preserveAspectRatio="xMinYMin slice"
          aria-hidden="true"
        >
          <rect
            x="590"
            y="307"
            width="198"
            height="42"
            rx="4"
            fill="#10231ee6"
            stroke="#bba276"
            strokeWidth="2"
          />
          <image
            href="/brand/playora-dark.svg"
            x="602"
            y="313"
            width="174"
            height="32"
          />
        </svg>
        <svg
          className="sign-in-lightning-bolt"
          viewBox="0 0 1672 941"
          preserveAspectRatio="xMinYMin slice"
          aria-hidden="true"
        >
          <path
            d="M350 0 322 59 346 52 305 126 M322 59 293 81 302 91"
            fill="none"
            stroke="#d9e8df"
            strokeWidth="2"
            strokeLinejoin="round"
          />
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

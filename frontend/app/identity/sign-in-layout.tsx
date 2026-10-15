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
      <aside className="sign-in-story" aria-label="Welcome to PLAYORA">
        <picture>
          <source
            media="(max-width:700px)"
            srcSet="/artwork/ascension-768.jpg"
          />
          <img
            src="/artwork/ascension-1536.jpg"
            alt=""
            width="1536"
            height="1024"
          />
        </picture>
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

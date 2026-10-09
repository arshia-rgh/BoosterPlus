import { useEffect, useId, useMemo, useRef, useState } from "react";
import { enrollmentSymbol, type MFAEnrollment } from "./mfa-enrollment";
import "./mfa-setup.css";

/** The enrollment URI stays in React memory; only QR geometry reaches the DOM. */
export function MFASetup({ enrollment }: { enrollment: MFAEnrollment }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const [manual, setManual] = useState(false);
  const symbol = useMemo(() => enrollmentSymbol(enrollment), [enrollment]);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className="mfa-setup" aria-labelledby={`${id}-title`}>
      <div className="mfa-setup-intro">
        <span className="eyebrow">01 · CONNECT YOUR APP</span>
        <h3 id={`${id}-title`} ref={heading} tabIndex={-1}>
          Scan with your authenticator
        </h3>
        <p>
          Open your authenticator app, choose Add account, then Scan a QR code.
        </p>
      </div>
      <div className="mfa-setup-body">
        <svg
          className="mfa-setup-qr"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-labelledby={`${id}-qr-title`}
          viewBox={`0 0 ${String(symbol.size)} ${String(symbol.size)}`}
          width="288"
          height="288"
          shapeRendering="crispEdges"
        >
          <title id={`${id}-qr-title`}>
            Authenticator setup QR code for your PLAYORA account
          </title>
          <rect width={symbol.size} height={symbol.size} fill="#ffffff" />
          <path d={symbol.path} fill="#000000" />
        </svg>
        <div className="mfa-setup-instructions">
          <p className="mfa-setup-account">
            <strong>{enrollment.issuer}</strong>
            <span>{enrollment.account}</span>
          </p>
          <p>
            Keep this QR code private. Complete setup within 10 minutes, then
            enter the six-digit code below to confirm it works.
          </p>
          <button
            className="mfa-setup-fallback"
            type="button"
            aria-expanded={manual}
            aria-controls={`${id}-manual`}
            onClick={() => {
              setManual(!manual);
            }}
          >
            {manual ? "Hide manual setup" : "Can’t scan? Use a setup key"}
          </button>
          <div
            className="mfa-setup-manual"
            id={`${id}-manual`}
            hidden={!manual}
          >
            {manual && (
              <>
                <p>
                  Choose Enter setup key in your app. Use the account name above
                  and select Time based, six digits and a 30-second period.
                </p>
                <p className="quiet">Setup key</p>
                <code>{enrollment.secret}</code>
                <p>
                  Never send your setup key or verification codes to anyone.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

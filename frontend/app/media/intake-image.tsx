import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { sessionSchema } from "../identity/api";
import { useResource } from "../orders/resource";
import { DownloadImage, UploadImage } from "./attachment";

// References stay in the current form only. Refresh never restores private files.
export default function IntakeImage({
  scope,
  label,
  value,
  change,
  pending,
  onSignIn,
  describedBy,
  invalid,
}: {
  scope: string;
  label: string;
  value: string | undefined;
  change: (id: string | undefined) => void;
  pending: (busy: boolean) => void;
  onSignIn?: (() => void) | undefined;
  describedBy?: string | undefined;
  invalid?: boolean | undefined;
}) {
  const session = useResource("/auth/session", sessionSchema);
  const location = useLocation();
  const [existing, setExisting] = useState(value);
  const latest = useRef(pending);
  useEffect(() => {
    latest.current = pending;
  }, [pending]);
  useEffect(() => {
    latest.current(false);
    return () => {
      latest.current(false);
    };
  }, []);
  return (
    <section aria-label={label} className="intake-image">
      <h3>
        {label} <span className="quiet">(optional)</span>
      </h3>
      <p>
        Share an image with the PLAYORA team reviewing this request. It is not
        shared with boosters. Crop out personal details and never include
        passwords or recovery codes.
      </p>
      <ErrorNotice error={session.error} />
      {session.loading ? (
        <p role="status">Checking private upload access…</p>
      ) : session.error ? (
        <Action onClick={session.reload}>Retry upload access</Action>
      ) : !session.data?.user || session.data.mfa_required ? (
        <p>
          <Link
            onClick={onSignIn}
            to={
              "/login?returnTo=" +
              encodeURIComponent(location.pathname + location.search)
            }
          >
            Sign in to attach a screenshot
          </Link>
          . You can continue without one.
        </p>
      ) : existing ? (
        <>
          <p>Previously checked image attached.</p>
          <DownloadImage id={existing} admin={false} />
          <Action
            onClick={() => {
              setExisting(undefined);
              change(undefined);
              pending(false);
            }}
          >
            Remove image from this request
          </Action>
          <p className="quiet">
            Removing it from these choices does not erase evidence already
            submitted with this order.
          </p>
        </>
      ) : (
        <UploadImage
          conversation=""
          intakeKey={scope}
          admin={false}
          visibility="public"
          label={label}
          describedBy={describedBy}
          invalid={invalid}
          change={(id, busy) => {
            change(id || undefined);
            pending(busy);
          }}
        />
      )}
      <p className="quiet">
        Finish the safety check or remove the image before submitting.
        Unsubmitted uploads expire after 24 hours. Reloading this form does not
        restore private screenshots.
      </p>
    </section>
  );
}

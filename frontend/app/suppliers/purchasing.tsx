import { useContext, useEffect, useRef, useState } from "react";
import { AuthorizedIdentity } from "../identity/frame";
import { post } from "../identity/api";
import { Action, ErrorNotice } from "../catalog/controls";
import { connectionSchema, type Connection } from "./model";
export function PurchasingControl({
  connection,
  changed,
}: {
  connection: Connection;
  changed: () => void;
}) {
  const identity = useContext(AuthorizedIdentity),
    alive = useRef(true),
    lock = useRef(false);
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const owner = identity?.session.user?.role === "owner";
  return (
    <div>
      <strong>
        {connection.purchases_enabled
          ? "Sandbox purchasing enabled"
          : "New purchases paused"}
      </strong>
      <p className="quiet">
        {connection.testing
          ? "Only the isolated Sandbox can be enabled during qualification. Existing deliveries continue to update while paused."
          : "Live purchasing remains disabled during test qualification."}
      </p>
      <ErrorNotice error={error} />
      {owner && connection.testing && (
        <Action
          disabled={
            busy || !connection.configured || !connection.current_import
          }
          onClick={() => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setError(null);
            void post(
              `/admin/shop/suppliers/${connection.id}/purchasing`,
              {
                version: connection.version,
                enabled: !connection.purchases_enabled,
              },
              connectionSchema,
              "admin",
              () => alive.current,
            )
              .then(() => {
                if (alive.current) changed();
              })
              .catch((cause: unknown) => {
                if (alive.current) setError(cause);
              })
              .finally(() => {
                lock.current = false;
                if (alive.current) setBusy(false);
              });
          }}
        >
          {connection.purchases_enabled
            ? "Pause new Sandbox purchases"
            : "Enable Sandbox purchases"}
        </Action>
      )}
    </div>
  );
}

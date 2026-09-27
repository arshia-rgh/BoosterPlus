import { useState } from "react";
import { Action, ErrorNotice } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { denied } from "../support/chat-state";
import { settingsSchema, type Settings } from "./model";
import PaymentPolicyEditor from "./policy-editor";

export default function PaymentPolicyWorkspace({
  active = true,
}: {
  active?: boolean;
}) {
  const resource = useResource("/admin/finance/policy", settingsSchema);
  const [snapshot, setSnapshot] = useState<Settings | null>(null);
  if (resource.data && resource.data !== snapshot) setSnapshot(resource.data);
  if (denied(resource.error) && snapshot) setSnapshot(null);
  return (
    <>
      <div hidden={!active}>
        <ErrorNotice error={resource.error} />
        {resource.loading && <p role="status">Checking payment policy…</p>}
        {!!resource.error && (
          <Action disabled={resource.loading} onClick={resource.reload}>
            Try payment policy again
          </Action>
        )}
      </div>
      {snapshot && !denied(resource.error) && (
        <PaymentPolicyEditor
          settings={snapshot}
          active={active}
          done={resource.reload}
          unavailable={resource.loading || !!resource.error}
        />
      )}
    </>
  );
}

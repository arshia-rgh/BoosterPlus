import { ActionFields, rejectInvalidFields } from "../ui/action-fields";
import { useState } from "react";
import { z } from "../validation";
import { post, userSchema } from "../identity/api";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { conversationSchema, type Conversation } from "./model";
const staffSchema = z.object({ users: z.array(userSchema) });
export default function StaffControls({
  thread,
  done,
}: {
  thread: Conversation;
  done: () => void;
}) {
  const staff = useResource("/admin/users", staffSchema),
    [state, setState] = useState(thread.state),
    [assigned, setAssigned] = useState(thread.assigned_to ?? ""),
    [order, setOrder] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const [observed, setObserved] = useState(thread.version),
    [dirty, setDirty] = useState(false);
  function editing() {
    if (!dirty) {
      setState(thread.state);
      setAssigned(thread.assigned_to ?? "");
      setObserved(thread.version);
    }
    setDirty(true);
  }
  async function change(action: string) {
    setBusy(true);
    setError(null);
    try {
      if (action === "link")
        rejectInvalidFields(
          /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(order)
            ? []
            : [{ path: "order_id", message: "Enter the complete order ID." }],
        );
      await post(
        `/admin/conversations/${thread.id}/${action}`,
        {
          version: dirty ? observed : thread.version,
          state: action === "state" ? (dirty ? state : thread.state) : "",
          assigned_to:
            action === "assign"
              ? dirty
                ? assigned
                : (thread.assigned_to ?? "")
              : "",
          order_id: action === "link" ? order : "",
          ...(action === "sharing"
            ? { booster_shared: !thread.booster_shared }
            : {}),
        },
        conversationSchema,
      );
      setDirty(false);
      done();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ActionFields error={error} busy={busy}>
      <section className="chat-staff-controls">
        <h3>Manage conversation</h3>
        {dirty && observed !== thread.version && (
          <p role="status">
            Conversation changed while you were editing. Review fresh controls
            before saving.{" "}
            <Action
              onClick={() => {
                setDirty(false);
                setOrder("");
                setError(null);
              }}
            >
              Reload conversation controls
            </Action>
          </p>
        )}
        <fieldset disabled={busy}>
          <legend>Staff controls</legend>
          <Select
            name="state"
            label="Set conversation status"
            value={dirty ? state : thread.state}
            change={(value) => {
              if (
                value === "open" ||
                value === "waiting" ||
                value === "resolved"
              ) {
                editing();
                setState(value);
              }
            }}
            options={[
              ["open", "Needs staff reply"],
              ["waiting", "Waiting for customer"],
              ["resolved", "Resolved"],
            ]}
          />
          <Action onClick={() => void change("state")}>
            Save conversation status
          </Action>
          <Select
            name="assigned_to"
            label="Assign support staff"
            value={dirty ? assigned : (thread.assigned_to ?? "")}
            change={(value) => {
              editing();
              setAssigned(value);
            }}
            options={[
              ["", "Unassigned"],
              ...(staff.data?.users
                .filter(
                  (user) =>
                    ["administrator", "owner"].includes(user.role) &&
                    user.mfa_enabled &&
                    !user.suspended,
                )
                .map(
                  (user) =>
                    [
                      user.id,
                      user.staff_alias || user.display_name || user.email,
                    ] as const,
                ) ?? []),
            ]}
          />
          <Action disabled={!staff.data} onClick={() => void change("assign")}>
            Save assignment
          </Action>
          {thread.kind === "fulfillment" && (
            <Action onClick={() => void change("sharing")}>
              {thread.booster_shared
                ? "Pause booster sharing"
                : "Resume booster sharing"}
            </Action>
          )}
          {thread.kind === "presales" && !thread.linked_order_id && (
            <>
              <Text
                name="order_id"
                label="Link to customer order ID"
                value={order}
                change={(value) => {
                  editing();
                  setOrder(value);
                }}
                help="The order must belong to this conversation’s customer. The original conversation is preserved."
              />
              <Action disabled={busy} onClick={() => void change("link")}>
                Link order
              </Action>
            </>
          )}
        </fieldset>
        <ErrorNotice error={error ?? staff.error} />
      </section>
    </ActionFields>
  );
}

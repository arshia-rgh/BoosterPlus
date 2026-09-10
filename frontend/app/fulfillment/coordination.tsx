import { useState } from "react";
import { Link } from "react-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { post } from "../identity/api";
import { conversationSchema } from "../support/model";
import { active, type Work } from "./model";
export default function Coordination({
  work,
  audience,
  reload,
}: {
  work: Work;
  audience: "account" | "admin" | "booster";
  reload: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function open() {
    setBusy(true);
    setError(null);
    try {
      await post(
        `/admin/fulfillment/${work.order_id}/conversation`,
        { version: work.version },
        conversationSchema,
      );
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <h3>Coordination and proof</h3>
      <p>
        This shared conversation is for player coordination and proof images.
        The currently assigned booster can read its shared history. Keep
        credentials in secure game access.
      </p>
      <ErrorNotice error={error} />
      {work.coordination_id ? (
        <>
          <p>
            {work.coordination_shared
              ? "Sharing with the assigned booster is enabled."
              : "Booster sharing is paused."}
          </p>
          <Link
            to={`${audience === "account" ? "" : "/" + audience}/support/${work.coordination_id}`}
          >
            Open coordination conversation
          </Link>
        </>
      ) : audience === "admin" && active(work) ? (
        <Action
          disabled={busy}
          onClick={() => {
            void open();
          }}
        >
          Enable shared coordination
        </Action>
      ) : (
        <p>
          An administrator has not shared a coordination conversation for this
          work.
        </p>
      )}
    </section>
  );
}

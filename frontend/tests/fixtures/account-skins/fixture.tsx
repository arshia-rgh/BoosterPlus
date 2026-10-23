import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import SubmissionEditor from "../../../app/submissions/form";
import {
  configurationSchema,
  emptyConfiguration,
} from "../../../app/catalog/model";
import type { Submission } from "../../../app/submissions/model";
import configuration from "./configuration.json";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/ui/workspace.css";
const value: Submission = {
  submission: {
    id: "synthetic-submission",
    version: 1,
    title: "My Mobile Legends account",
    game: "Mobile Legends",
    state: "draft",
    created_at: "2026-10-23T00:00:00Z",
    updated_at: "2026-10-23T00:00:00Z",
  },
  offer: {
    id: "synthetic-release",
    game_id: "synthetic-game",
    slug: "mobile-legends",
    version: 301,
    configuration: configurationSchema.parse({
      ...emptyConfiguration("Mobile Legends"),
      ...configuration,
    }),
    paused: false,
    created_at: "2026-10-23T00:00:00Z",
  },
  answers: {},
  ownership_notes: "",
  ownership_declared: false,
  note: "",
  conversation_id: "synthetic-thread",
};
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(
  <BrowserRouter>
    <main
      className="catalog-page"
      style={{ maxWidth: 960, margin: "auto", padding: "1rem" }}
    >
      <h1>Sell your account</h1>
      <h2>My Mobile Legends account</h2>
      <h3>Private account details</h3>
      <SubmissionEditor value={value} reload={() => {}} />
    </main>
  </BrowserRouter>,
);

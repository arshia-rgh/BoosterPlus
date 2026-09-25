import { type ReactNode, type Ref } from "react";
import "./feedback.css";

/** Stable, in-context feedback. Do not dismiss results on a timer. */
export function Feedback({
  children,
  kind = "status",
  feedbackRef,
}: {
  children: ReactNode;
  kind?: "status" | "error";
  feedbackRef?: Ref<HTMLParagraphElement>;
}) {
  return (
    <p
      className="ui-feedback"
      data-kind={kind}
      ref={feedbackRef}
      tabIndex={-1}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export function PanelState({
  title,
  description,
  kind = "loading",
  children,
}: {
  title: string;
  description: string;
  kind?: "loading" | "error" | "empty";
  children?: ReactNode;
}) {
  return (
    <section className="ui-panel-state" data-kind={kind}>
      <span className="ui-state-symbol" aria-hidden="true">
        {kind === "error" ? "!" : kind === "loading" ? "···" : "○"}
      </span>
      <div>
        <h2>{title}</h2>
        <Feedback kind={kind === "error" ? "error" : "status"}>
          {description}
        </Feedback>
        {children && <div className="ui-state-actions">{children}</div>}
      </div>
    </section>
  );
}

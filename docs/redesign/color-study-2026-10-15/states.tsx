import { useRef } from "react";
import { PageHeader } from "../../../frontend/app/ui/page-header";
import "../../../frontend/app/support/chat.css";
import "../../../frontend/app/support/forms/forms.css";
import "../../../frontend/app/identity/action-verification.css";
import "./states.css";
export default function States() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <main id="main" className="page state-lab">
      <PageHeader
        title="Messages & important moments"
        eyebrow="INTERACTION SAMPLES"
      />
      <p className="quiet">
        Illustrative states using PLAYORA’s chat and verification styling. No
        messages or actions are sent.
      </p>
      <div className="state-grid">
        <section
          className="chat-workspace state-demo-chat"
          aria-label="Example support conversation"
        >
          <div className="chat-room">
            <header className="chat-room-header">
              <div className="chat-title">
                <h2>Mobile Legends request</h2>
                <span>Order conversation · Demo</span>
              </div>
              <span className="status">In progress</span>
            </header>
            <div className="chat-history">
              <ol className="message-list">
                <li className="message">
                  <div className="message-meta">
                    <strong>PLAYORA support</strong>
                    <time>10:30</time>
                  </div>
                  <div className="message-bubble">
                    <p>
                      Your preferences are saved. You can share the requested
                      details here when you’re ready.
                    </p>
                  </div>
                </li>
                <li className="message outgoing-message">
                  <div className="message-meta">
                    <strong>You</strong>
                    <time>10:32</time>
                  </div>
                  <div className="message-bubble">
                    <p>Thank you. Where should I add the account details?</p>
                  </div>
                </li>
                <li className="message">
                  <div className="message-meta">
                    <strong>PLAYORA support</strong>
                    <time>10:33</time>
                  </div>
                  <div className="chat-form-card">
                    <div>
                      <strong>Account details</strong>
                      <span className="form-secure-badge">
                        ▣ Protected fields
                      </span>
                    </div>
                    <p>
                      Requested by your support team. Protected answers are kept
                      separate from ordinary chat messages.
                    </p>
                    <button
                      className="button"
                      type="button"
                      onClick={() => dialog.current?.showModal()}
                    >
                      Preview protected action
                    </button>
                  </div>
                </li>
              </ol>
            </div>
            <form
              className="chat-composer"
              onSubmit={(e) => e.preventDefault()}
            >
              <label htmlFor="sample-message">Message</label>
              <textarea
                id="sample-message"
                placeholder="Write a message…"
                rows={2}
              />
              <div className="composer-toolbar">
                <span className="quiet">Design sample</span>
                <button className="button" type="submit" disabled>
                  Send message
                </button>
              </div>
            </form>
          </div>
        </section>
        <div className="state-samples">
          <section className="identity-card">
            <h2>Clear status, every time</h2>
            <div className="sample-state success">
              <strong>✓ Payment confirmed</strong>
              <p>Your payment has been verified.</p>
            </div>
            <div className="sample-state info">
              <strong>◷ Work in progress</strong>
              <p>Your team has shared a new update.</p>
            </div>
            <div className="sample-state warning">
              <strong>! Needs your attention</strong>
              <p>Review the proposed delivery window.</p>
            </div>
            <div className="sample-state danger">
              <strong>× Upload failed</strong>
              <p>Storage is unavailable. Retry the same image.</p>
            </div>
          </section>
          <section className="identity-card">
            <h2>Field & action states</h2>
            <label htmlFor="sample-title">
              Listing title
              <input
                id="sample-title"
                defaultValue="Mythic account · Example"
              />
            </label>
            <label htmlFor="sample-invalid">
              Delivery hours
              <input
                id="sample-invalid"
                aria-invalid="true"
                aria-describedby="sample-error"
                value=""
                readOnly
              />
            </label>
            <p id="sample-error" className="field-error">
              Enter the number of hours.
            </p>
            <div className="form-actions">
              <button
                className="button"
                type="button"
                onClick={() => dialog.current?.showModal()}
              >
                Preview verification
              </button>
              <button className="button secondary" type="button" disabled>
                Unavailable
              </button>
            </div>
          </section>
        </div>
      </div>
      <dialog
        ref={dialog}
        className="action-verification"
        aria-labelledby="sample-dialog-title"
      >
        <div className="action-verification-heading">
          <span className="action-verification-badge" aria-hidden="true">
            ✓
          </span>
          Protected action · Preview
        </div>
        <h2 id="sample-dialog-title">Confirm your requested action</h2>
        <p>This is a color preview. Do not enter a real authenticator code.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            dialog.current?.close();
          }}
        >
          <label htmlFor="sample-code">Authenticator code</label>
          <input
            id="sample-code"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000000"
            maxLength={6}
          />
          <button type="submit" className="button">
            Close preview
          </button>
          <button
            type="button"
            className="action-verification-cancel"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
        </form>
      </dialog>
    </main>
  );
}

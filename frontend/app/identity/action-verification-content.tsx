import { useEffect, useRef, useState } from "react";
import { z } from "../validation";
import {
  APIError,
  codesSchema,
  errorMessage,
  get,
  post,
  sessionSchema,
} from "./api";
import { activePortal } from "./portal";
import { actionRoute, type VerificationRequest } from "./action-verification";
import "./action-verification.css";

type Prompt = VerificationRequest & { resolve: () => void; reject: () => void };
const challengeSchema = z.object({
  challenge_id: z.string(),
  retry_after_seconds: z.number(),
  expires_in_seconds: z.number(),
});

export default function VerificationDialog({
  prompt,
  finish,
}: {
  prompt: Prompt;
  finish: (verified: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const restoreFocus = useRef(true);
  const returnFocus = prompt.returnFocus;
  const originalRoute = prompt.route;
  const [method, setMethod] = useState<"authenticator" | "email">(
    prompt.authenticator ? "authenticator" : "email",
  );
  const [challenge, setChallenge] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [verifyRetryAt, setVerifyRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [code, setCode] = useState("");
  useEffect(() => {
    alive.current = true;
    const previous = returnFocus ?? document.activeElement;
    dialog.current?.showModal();
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      alive.current = false;
      window.clearInterval(timer);
      window.setTimeout(() => {
        if (
          restoreFocus.current &&
          actionRoute() === originalRoute &&
          previous instanceof HTMLElement &&
          previous.isConnected
        )
          previous.focus();
      }, 0);
    };
  }, [returnFocus, originalRoute]);
  useEffect(() => {
    if (method === "authenticator" || challenge) input.current?.focus();
  }, [method, challenge]);
  useEffect(() => {
    if (!busy && problem) input.current?.focus();
  }, [busy, problem]);
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const expired = Boolean(challenge) && now >= expiresAt;
  const verifyRemaining = Math.max(0, Math.ceil((verifyRetryAt - now) / 1000));
  const expiresRemaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  async function assertIdentity() {
    const session = await get("/auth/session", sessionSchema, prompt.portal);
    if (
      !alive.current ||
      activePortal() !== prompt.portal ||
      actionRoute() !== prompt.route ||
      session.user?.id !== prompt.userId
    ) {
      finish(false);
      throw new Error("Sign-in changed");
    }
  }
  async function perform(
    work: () => Promise<void>,
    phase: "send" | "verify" = "verify",
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setProblem("");
    try {
      await assertIdentity();
      await work();
    } catch (error) {
      if (alive.current) {
        setProblem(errorMessage(error));
        if (error instanceof APIError && error.retryAt) {
          if (phase === "send") setRetryAt(error.retryAt);
          else setVerifyRetryAt(error.retryAt);
        }
        input.current?.focus();
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function sendEmail() {
    const started = Date.now();
    const value = await post(
      "/auth/email/request",
      { email: prompt.email, purpose: "reauth" },
      challengeSchema,
      prompt.portal,
    );
    if (!alive.current) return;
    setChallenge(value.challenge_id);
    setCode("");
    setRetryAt(started + value.retry_after_seconds * 1000);
    setExpiresAt(started + value.expires_in_seconds * 1000);
    setNow(Date.now());
    input.current?.focus();
  }
  return (
    <dialog
      ref={dialog}
      className="action-verification"
      aria-labelledby="action-verification-title"
      aria-describedby="action-verification-description"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled), a[href], [tabindex='0']",
          ),
        );
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        finish(false);
      }}
    >
      <div className="action-verification-heading">
        <span className="action-verification-badge" aria-hidden="true">
          ✓
        </span>
        <span>
          Secure confirmation ·{" "}
          {prompt.portal === "booster" ? "Pro" : prompt.portal}
        </span>
      </div>
      <h2 id="action-verification-title">{prompt.action}</h2>
      <p id="action-verification-description">
        Confirm it’s you before we continue. Verify once here, and we’ll carry
        out the action you just requested.
      </p>
      {prompt.authenticator && (
        <div
          className="action-verification-methods"
          aria-label="Verification method"
        >
          <button
            type="button"
            aria-pressed={method === "authenticator"}
            disabled={busy}
            onClick={() => {
              setMethod("authenticator");
              setCode("");
              setProblem("");
            }}
          >
            Authenticator
          </button>
          <button
            type="button"
            aria-pressed={method === "email"}
            disabled={busy}
            onClick={() => {
              setMethod("email");
              setCode("");
              setProblem("");
            }}
          >
            Email code
          </button>
        </div>
      )}
      {method === "email" && (
        <p className="action-verification-address">
          Use the email for this account: <strong>{prompt.email}</strong>
        </p>
      )}
      {method === "email" && !challenge ? (
        <button
          className="button"
          type="button"
          disabled={busy || remaining > 0}
          onClick={() => {
            void perform(sendEmail, "send");
          }}
        >
          {busy
            ? "Requesting code…"
            : remaining > 0
              ? `Request code in ${String(remaining)}s`
              : "Send email code"}
        </button>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (verifyRemaining > 0 || (expired && method === "email")) return;
            if (!/^[0-9]{6}$/.test(code)) {
              setProblem("Enter the six-digit code to continue.");
              input.current?.focus();
              return;
            }
            void perform(async () => {
              if (method === "authenticator")
                await post(
                  "/auth/mfa/verify",
                  { code },
                  codesSchema,
                  prompt.portal,
                );
              else
                await post(
                  "/auth/email/verify",
                  { challenge_id: challenge, code },
                  z.object({ purpose: z.string() }),
                  prompt.portal,
                );
              await assertIdentity();
              restoreFocus.current = false;
              finish(true);
            });
          }}
        >
          <label htmlFor="action-verification-code">
            {method === "authenticator"
              ? "Six-digit authenticator code"
              : "Email verification code"}
          </label>
          <input
            ref={input}
            id="action-verification-code"
            name="code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
            }}
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            disabled={busy}
            required
            aria-invalid={Boolean(problem)}
            aria-describedby={problem ? "action-verification-error" : undefined}
          />
          {method === "email" && (
            <>
              <p role="status">
                {expired
                  ? "Code expired. Request a new one below."
                  : "Code requested. Check your spam folder if it hasn’t arrived."}
              </p>
              {!expired && (
                <p role="timer" aria-live="off">
                  Code expires in {String(Math.floor(expiresRemaining / 60))}:
                  {String(expiresRemaining % 60).padStart(2, "0")}.
                </p>
              )}
            </>
          )}
          <button
            className="button"
            type="submit"
            disabled={
              busy || verifyRemaining > 0 || (method === "email" && expired)
            }
          >
            {busy
              ? "Verifying…"
              : verifyRemaining > 0
                ? `Try again in ${String(verifyRemaining)}s`
                : "Verify and continue"}
          </button>
        </form>
      )}
      {method === "email" && challenge && (
        <button
          className="action-verification-resend"
          type="button"
          disabled={busy || remaining > 0}
          onClick={() => {
            void perform(sendEmail, "send");
          }}
        >
          {remaining > 0
            ? `Resend code in ${String(remaining)}s`
            : "Resend code"}
        </button>
      )}
      {problem && (
        <p id="action-verification-error" role="alert">
          {problem}
        </p>
      )}
      <button
        className="action-verification-cancel"
        type="button"
        onClick={() => {
          finish(false);
        }}
      >
        Cancel and keep editing
      </button>
      <p className="action-verification-note">
        Your draft stays on this page. Never share a verification code with
        support.
      </p>
    </dialog>
  );
}

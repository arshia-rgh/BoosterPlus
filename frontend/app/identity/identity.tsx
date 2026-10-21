import { Text as EditableText } from "../catalog/controls";
import { Confirmation } from "../ui/form-validation";
import { SignInLayout } from "./sign-in-layout";
import { Loading } from "../ui/loading";
import { Anchor } from "../portal-router";
import { DisplayPreferences } from "./display-preferences";
import { MFASetup } from "./mfa-setup";
import { RecoveryResult } from "./recovery-result";
import { EmailRecoveryDialog } from "./email-recovery-dialog";
import { countdownLabel, useCountdown } from "./countdown";
import { parseMFAEnrollment, type MFAEnrollment } from "./mfa-enrollment";
import {
  portalFromPath,
  portalLogin,
  portalHome,
  portalSecurity,
  sessionEventMatches,
  type Portal,
} from "./portal";
import { Button } from "../ui/primitives";
import {
  FieldValidation,
  nativeFieldIssues,
  TextField as Text,
  ValidationSummary,
  useFormValidation,
  type FieldIssue,
} from "../ui/form-validation";
export { TextField as Text } from "../ui/form-validation";
import { clearConfigurationDraft } from "../catalog/configuration-draft";
import {
  SignInReturn,
  VerificationLink,
  VerificationReturn,
  rememberGoogleReturn,
  clearGoogleReturn,
  safeReturnPath,
} from "../account/return-path";
import AccountNavigation from "../account/navigation";
import AccountOverview from "../account/overview";
import { useResource } from "../orders/resource";
import { RetryButton, useRetryPending } from "../ui/retry-button";
import { Feedback, PanelState } from "../ui/feedback";
import "../ui/feedback.css";
import { PageHeader } from "../ui/page-header";
import { createContext, createElement, useContext } from "react";
import { AuthorizedIdentity, IdentityFrame } from "./frame";
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type RefObject,
  type SubmitEvent,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  useLocation,
  useSearchParams,
} from "../portal-router";
import { z } from "../validation";
import {
  get,
  post,
  command,
  errorMessage,
  APIError,
  sessionSchema,
  codesSchema,
  sessionsSchema,
  type Session,
} from "./api";

type Refresh = () => Promise<void>;
// Email and Google share entry progression, including a server-supplied cooldown.
const EntryProgress = createContext<{
  busy: boolean;
  acquire: () => boolean;
  release: () => void;
  retryAt: number | undefined;
  setRetryAt: (time: number | undefined) => void;
  consent?: boolean;
  checkConsent?: () => boolean;
} | null>(null);
function AuthEntryProgress({
  children,
  requireConsent = false,
}: {
  children: ReactNode;
  requireConsent?: boolean;
}) {
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const consentRef = useRef<HTMLInputElement>(null);
  function checkConsent() {
    if (!requireConsent || consent) return true;
    setConsentError(true);
    consentRef.current?.focus();
    if (typeof consentRef.current?.scrollIntoView === "function")
      consentRef.current.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    return false;
  }
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState<number | undefined>();
  const lock = useRef(false);
  const acquire = useCallback(() => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    return true;
  }, []);
  const release = useCallback(() => {
    lock.current = false;
    setBusy(false);
  }, []);
  return (
    <EntryProgress
      value={{
        busy,
        acquire,
        release,
        retryAt,
        setRetryAt,
        ...(requireConsent ? { consent, checkConsent } : {}),
      }}
    >
      {children}
      {requireConsent && (
        <div className="sign-in-consent">
          <label>
            <input
              ref={consentRef}
              type="checkbox"
              name="terms"
              checked={consent}
              disabled={busy}
              aria-invalid={consentError || undefined}
              aria-describedby={
                consentError ? "sign-in-terms-error" : undefined
              }
              onChange={(event) => {
                setConsent(event.target.checked);
                setConsentError(false);
              }}
            />
            <span>
              I accept the{" "}
              <Link to="/terms" target="_blank" rel="noreferrer">
                account terms
              </Link>
              .
            </span>
          </label>
          {consentError && (
            <p className="field-error" id="sign-in-terms-error">
              Accept the account terms to continue.
            </p>
          )}
        </div>
      )}
    </EntryProgress>
  );
}
export function Form({
  title,
  children,
  submit,
  label = title,
  compact = false,
  success = "Request completed.",
  disabled = false,
  google = false,
  entryMethod = false,
  titleRef,
  variant = "primary",
  footer,
}: {
  title: string;
  children?: ReactNode;
  submit: (data: FormData) => Promise<void>;
  label?: string;
  compact?: boolean;
  success?: string;
  disabled?: boolean;
  google?: boolean;
  entryMethod?: boolean;
  titleRef?: RefObject<HTMLHeadingElement | null>;
  variant?: "primary" | "secondary" | "destructive";
  footer?: ReactNode;
}) {
  const entry = useContext(EntryProgress);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false),
    [problem, setProblem] = useState<unknown>(null);
  const cooling = useRetryPending(
    Math.max(
      problem instanceof APIError ? (problem.retryAt ?? 0) : 0,
      entry?.retryAt ?? 0,
    ) || undefined,
  );
  const retrySeconds = useCountdown(
    Math.max(
      problem instanceof APIError ? (problem.retryAt ?? 0) : 0,
      entry?.retryAt ?? 0,
    ) || undefined,
  );
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const correct = useCallback(
    (name: string) => {
      if (!issues.some((issue) => issue.path === name)) return;
      const remaining = issues.filter((issue) => issue.path !== name);
      setIssues(remaining);
      if (remaining.length === 0) {
        setFailed(false);
        setMessage("");
      }
    },
    [issues],
  );
  const validation = useFormValidation(
    issues,
    correct,
    undefined,
    !busy && !entry?.busy,
  );
  const fields = validation.fields;
  const lock = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (failed && issues.length === 0) feedback.current?.focus();
  }, [failed, issues.length]);
  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || cooling || disabled) return;
    const invalid = nativeFieldIssues(event.currentTarget);
    if (invalid.length) {
      setIssues(invalid);
      setMessage("Check the highlighted fields.");
      setFailed(true);
      return;
    }
    if (entryMethod && entry?.checkConsent && !entry.checkConsent()) return;
    if (entry && !entry.acquire()) return;
    lock.current = true;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    setFailed(false);
    setProblem(null);
    setIssues([]);
    try {
      await submit(data);
      setMessage(success);
    } catch (error) {
      setMessage(errorMessage(error));
      setFailed(true);
      setProblem(error);
      if (error instanceof APIError && error.retryAt !== undefined)
        entry?.setRetryAt(error.retryAt);
      setIssues(error instanceof APIError ? error.issues : []);
    } finally {
      lock.current = false;
      entry?.release();
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={validation}>
      <form
        method="post"
        noValidate
        className={
          compact
            ? "identity-session-action"
            : `identity-card${entryMethod ? " sign-in-method" : ""}`
        }
        onSubmit={(event) => void send(event)}
      >
        {!compact && (
          <h2 ref={titleRef} tabIndex={titleRef ? -1 : undefined}>
            {title}
          </h2>
        )}
        <fieldset disabled={busy || entry?.busy || disabled}>
          {children}
          <Button
            variant={variant}
            className={`button${google ? " google-sign-in" : ""}`}
            type="submit"
            disabled={cooling}
            busy={busy}
          >
            {google && !cooling && (
              <img
                src="/brand/google-signin.png"
                alt=""
                width="20"
                height="20"
              />
            )}
            {cooling ? "Wait before trying again" : label}
          </Button>
        </fieldset>
        {footer}
        {cooling && (
          <p role="timer" aria-live="off">
            Try again in {countdownLabel(retrySeconds)}.
          </p>
        )}
        <Feedback feedbackRef={feedback} kind={failed ? "error" : "status"}>
          {message}
        </Feedback>
        <ValidationSummary issues={issues} fields={fields} autoFocusUnknown />
        <VerificationLink error={problem} />
      </form>
    </FieldValidation>
  );
}
export const value = (data: FormData, name: string) => {
  const field = data.get(name);
  return typeof field === "string" ? field : "";
};
const challengeSchema = z.object({
  challenge_id: z.string().min(1),
  retry_after_seconds: z.number().int().min(0).max(86400),
  expires_in_seconds: z.number().int().min(1).max(86400),
});
type EmailRequest = {
  email: string;
  account_email: string;
  purpose: "login" | "reauth" | "email_change" | "recovery";
  accept_terms: boolean;
  terms_version: string;
};
type EmailFormProps = {
  purpose: EmailRequest["purpose"];
  termsVersion?: string;
  email?: string;
  refresh: Refresh;
};
function EmailForm(props: EmailFormProps) {
  const entry = useContext(EntryProgress);
  return entry ? (
    <EmailFormFields {...props} />
  ) : (
    <AuthEntryProgress>
      <EmailFormFields {...props} />
    </AuthEntryProgress>
  );
}
function EmailFormFields({
  termsVersion = "",
  purpose,
  email = "",
  refresh,
}: EmailFormProps) {
  const portal = portalFromPath(useLocation().pathname);
  const entry = useContext(EntryProgress);
  const [challenge, setChallenge] = useState("");
  const [done, setDone] = useState(false);
  const [request, setRequest] = useState<EmailRequest | null>(null);
  const [retryAt, setRetryAt] = useState<number | undefined>();
  const [expiresAt, setExpiresAt] = useState<number | undefined>();
  const [sending, setSending] = useState(false);
  const [resendProblem, setResendProblem] = useState<unknown>(null);
  const [resent, setResent] = useState(false);
  const sendLock = useRef(false);
  const retrySeconds = useCountdown(
    Math.max(retryAt ?? 0, entry?.retryAt ?? 0) || undefined,
  );
  const expiresSeconds = useCountdown(expiresAt);
  const expired = expiresAt !== undefined && expiresSeconds === 0;
  const codeContainer = useRef<HTMLDivElement>(null);
  const entryFeedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (challenge) codeContainer.current?.querySelector("input")?.focus();
  }, [challenge]);
  useEffect(() => {
    if (!challenge && resendProblem) entryFeedback.current?.focus();
  }, [challenge, resendProblem]);
  async function requestCode(body: EmailRequest) {
    const startedAt = Date.now();
    const result = await post("/auth/email/request", body, challengeSchema);
    setRequest(body);
    setChallenge(result.challenge_id);
    setRetryAt(Date.now() + result.retry_after_seconds * 1000);
    setExpiresAt(startedAt + result.expires_in_seconds * 1000);
    setDone(false);
  }
  async function resend() {
    if (!request || retrySeconds > 0 || sendLock.current || entry?.busy) return;
    if (entry && !entry.acquire()) return;
    sendLock.current = true;
    setSending(true);
    setResendProblem(null);
    setResent(false);
    try {
      await requestCode(request);
      setResent(true);
    } catch (error) {
      setResendProblem(error);
      if (error instanceof APIError && error.code === "staff_access_required") {
        setChallenge("");
        setDone(false);
        setRetryAt(undefined);
        setExpiresAt(undefined);
      }
      if (error instanceof APIError && error.retryAt !== undefined) {
        setRetryAt(error.retryAt);
        entry?.setRetryAt(error.retryAt);
      }
    } finally {
      sendLock.current = false;
      entry?.release();
      setSending(false);
    }
  }
  const title =
    new Map([
      ["login", "Continue with email"],
      ["reauth", "Verify your email again"],
      ["email_change", "Change email"],
      ["recovery", "Request account recovery"],
    ]).get(purpose) ?? "Verify email";
  return (
    <section className="identity-section">
      {!challenge && resendProblem !== null && (
        <p role="alert" ref={entryFeedback} tabIndex={-1}>
          {errorMessage(resendProblem)}
        </p>
      )}
      {!challenge && (
        <Form
          title={title}
          entryMethod={purpose === "login"}
          success="Check your inbox for the verification code."
          disabled={retrySeconds > 0}
          label={
            purpose === "recovery"
              ? "Send recovery verification code"
              : "Send verification code"
          }
          submit={async (data) => {
            setResendProblem(null);
            setResent(false);
            await requestCode({
              email: email || value(data, "email"),
              account_email: value(data, "account_email"),
              purpose,
              accept_terms: entry?.consent ?? data.get("terms") === "on",
              terms_version: termsVersion,
            });
          }}
        >
          {purpose === "recovery" && (
            <>
              <p>
                An owner reviews every recovery request.{" "}
                {portal === "customer"
                  ? "Your authenticator stays required if you set one up."
                  : "Your authenticator stays required."}
              </p>
              <Text
                name="account_email"
                label="Current account email"
                type="email"
              />
            </>
          )}
          {email ? (
            <p>Send a code to {email}.</p>
          ) : (
            <Text
              name="email"
              label={
                purpose === "recovery" || purpose === "email_change"
                  ? "New email address"
                  : portal === "customer"
                    ? "Email address"
                    : "Work email address"
              }
              type="email"
              autoComplete="email"
              defaultValue={request?.email}
            />
          )}
          {purpose === "login" && entry?.consent === undefined && (
            <Confirmation name="terms">
              I accept the{" "}
              <Link to="/terms" target="_blank" rel="noreferrer">
                account terms
              </Link>
              .
            </Confirmation>
          )}
          {retrySeconds > 0 && (
            <p role="timer" aria-live="off">
              Request another code in {countdownLabel(retrySeconds)}.
            </p>
          )}
        </Form>
      )}
      {challenge && !done && (
        <div ref={codeContainer}>
          <Form
            key={challenge}
            title="Check your inbox"
            success="Email verified."
            label="Verify email code"
            disabled={expired || sending}
            submit={async (data) => {
              await post(
                "/auth/email/verify",
                { challenge_id: challenge, code: value(data, "code") },
                z.object({ purpose: z.string() }),
              );
              setDone(true);
              await refresh();
            }}
          >
            <p>If eligible, a code is on its way to {request?.email}.</p>
            <Text
              name="code"
              label="Email verification code"
              autoComplete="one-time-code"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]{6}"
            />
            {expired ? (
              <p role="status">
                This code has expired. Request a new code below.
              </p>
            ) : (
              <p role="timer" aria-live="off">
                Code expires in {countdownLabel(expiresSeconds)}.
              </p>
            )}
          </Form>
          <div className="identity-resend">
            <Button
              className="button"
              type="button"
              busy={sending}
              disabled={retrySeconds > 0 || entry?.busy || sending}
              onClick={() => {
                void resend();
              }}
            >
              {retrySeconds > 0
                ? `Resend code in ${countdownLabel(retrySeconds)}`
                : "Resend code"}
            </Button>
            {resent && (
              <p role="status">New code requested. Use the newest email.</p>
            )}
            {resendProblem !== null && (
              <>
                <p role="alert">{errorMessage(resendProblem)}</p>
                <VerificationLink error={resendProblem} />
              </>
            )}
            <p className="quiet">Not there? Check spam.</p>
            {!email && (
              <button
                className="account-text-action"
                type="button"
                disabled={sending || entry?.busy}
                onClick={() => {
                  setChallenge("");
                  setDone(false);
                  setResendProblem(null);
                  setResent(false);
                }}
              >
                Change email address
              </button>
            )}
          </div>
        </div>
      )}
      {done && (
        <p role="status">
          {purpose === "recovery"
            ? "Email verified. An owner will review your request; no access has been granted yet."
            : purpose === "email_change"
              ? "Email changed. Sign in again with your new email address."
              : "Email verified."}
          {purpose === "reauth" && (
            <button
              className="account-text-action"
              type="button"
              onClick={() => {
                setChallenge("");
                setDone(false);
              }}
            >
              Verify again
            </button>
          )}
        </p>
      )}
    </section>
  );
}

function Google({
  session,
  purpose,
  refresh,
}: {
  session: Session;
  purpose: "login" | "link" | "reauth";
  refresh: Refresh;
}) {
  const location = useLocation();
  const entry = useContext(EntryProgress);
  return (
    <Form
      google
      entryMethod={purpose === "login"}
      title={
        purpose === "login"
          ? "Continue with Google"
          : purpose === "link"
            ? "Link Google"
            : "Verify Google again"
      }
      submit={async (data) => {
        const result = await post(
          "/auth/google/start",
          {
            purpose,
            accept_terms: entry?.consent ?? data.get("terms") === "on",
            terms_version: session.terms_version,
          },
          z.object({ url: z.url() }),
        );
        const target = new URL(result.url);
        if (target.origin !== "https://accounts.google.com")
          throw new Error("Unexpected provider");
        await refresh();
        const requested = safeReturnPath(
          new URLSearchParams(location.search).get("returnTo"),
          session.portal,
        );
        rememberGoogleReturn(
          purpose === "login"
            ? (requested ?? location.pathname)
            : portalSecurity(session.portal),
          purpose === "login" ? undefined : (requested ?? undefined),
          session.portal,
        );
        window.location.assign(target.href);
      }}
    >
      {purpose === "login" && entry?.consent === undefined && (
        <Confirmation name="terms">
          I accept the{" "}
          <Link to="/terms" target="_blank" rel="noreferrer">
            account terms
          </Link>
          .
        </Confirmation>
      )}
    </Form>
  );
}
function Security({
  session,
  refresh,
  onCodes,
  showRecoveryTools = true,
}: {
  session: Session;
  refresh: Refresh;
  onCodes: (codes: string[]) => void;
  showRecoveryTools?: boolean;
}) {
  const [enrollment, setEnrollment] = useState<{
    value: MFAEnrollment;
    expiresAt: number;
  } | null>(null);
  const [setupExpired, setSetupExpired] = useState(false);
  useEffect(() => {
    if (!enrollment) return;
    const expire = () => {
      setEnrollment(null);
      setSetupExpired(true);
    };
    const timer = window.setTimeout(
      expire,
      Math.max(0, enrollment.expiresAt - Date.now()),
    );
    const leave = () => {
      setEnrollment(null);
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", leave);
    };
  }, [enrollment]);
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = session.mfa_required;
  useEffect(() => {
    if (pending) heading.current?.focus();
  }, [pending]);
  const user = session.user;
  if (!user) return null;
  return (
    <section className="identity-section">
      {!pending && (
        <>
          <h2>Authenticator security</h2>
          <p>
            {session.portal === "customer"
              ? "Adds a code from your authenticator app at sign-in."
              : "Required at every sign-in."}
          </p>
        </>
      )}
      {user.mfa_enabled && !pending && (
        <p role="status">Authenticator enabled for this account.</p>
      )}
      {!user.mfa_enabled && !enrollment && (
        <Form
          title="Set up authenticator"
          submit={async () => {
            const startedAt = Date.now();
            const result = await post(
              "/auth/mfa/enroll",
              {},
              z.object({ secret: z.string(), url: z.string() }),
            );
            setEnrollment({
              value: parseMFAEnrollment(result, user.email, session.portal),
              expiresAt: startedAt + 10 * 60 * 1000,
            });
            setSetupExpired(false);
          }}
        />
      )}
      {setupExpired && (
        <p role="status">
          Your setup code expired. Start setup again to get a new QR code.
        </p>
      )}
      {enrollment && <MFASetup enrollment={enrollment.value} />}
      {((pending && user.mfa_enabled) || enrollment) && (
        <Form
          title="Verify authenticator"
          titleRef={heading}
          submit={async (data) => {
            const result = await post(
              "/auth/mfa/verify",
              { code: value(data, "code") },
              codesSchema,
            );
            onCodes(result.recovery_codes);
            setEnrollment(null);
            await refresh();
          }}
        >
          <Text
            name="code"
            label={
              user.mfa_enabled
                ? "Authenticator or recovery code"
                : "Six-digit authenticator code"
            }
            autoComplete="one-time-code"
            maxLength={user.mfa_enabled ? 26 : 6}
            inputMode={user.mfa_enabled ? "text" : "numeric"}
            {...(!user.mfa_enabled
              ? {
                  pattern: "[0-9]{6}",
                  help: "6-digit code from your authenticator app.",
                }
              : {})}
          />
        </Form>
      )}
      {session.mfa_required && user.mfa_enabled && (
        <details className="auth-recovery-help">
          <summary>Can’t use your authenticator?</summary>
          <p>
            Use one of your unused recovery codes in the field above. Each code
            works once, after your email or Google verification.
          </p>
          <p>
            {session.portal === "customer" ? (
              <>
                If you have no remaining codes, recovery requires a PLAYORA
                support review. Consult the{" "}
                <Link to="/terms">public account terms</Link> or your existing
                PLAYORA correspondence for recovery assistance.
              </>
            ) : (
              "If you have no remaining codes, contact your PLAYORA administrator through your established staff contact channel for an access review."
            )}{" "}
            Do not send your setup key, verification codes or recovery codes.
            Email verification alone cannot remove the authenticator
            requirement.
          </p>
        </details>
      )}
      {user.mfa_enabled && !session.mfa_required && (
        <>
          {showRecoveryTools && (
            <RecoveryCodes session={session} onCodes={onCodes} />
          )}
          {session.portal === "customer" && (
            <Form
              title="Disable authenticator"
              variant="destructive"
              submit={async () => {
                await command("/auth/mfa/disable");
                await refresh();
              }}
            >
              <p>This signs out all your sessions.</p>
              <Confirmation>Disable my second factor</Confirmation>
            </Form>
          )}
        </>
      )}
    </section>
  );
}
function RecoveryCodes({
  session,
  onCodes,
}: {
  session: Session;
  onCodes: (codes: string[]) => void;
}) {
  if (!session.user?.mfa_enabled || session.mfa_required) return null;
  return (
    <Form
      title="Replace recovery codes"
      submit={async () => {
        const result = await post("/auth/mfa/recovery-codes", {}, codesSchema);
        onCodes(result.recovery_codes);
      }}
    >
      <p>Your old codes stop working and your other sessions are signed out.</p>
      <Confirmation>Replace my existing recovery codes</Confirmation>
    </Form>
  );
}
function sessionTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function SessionList({
  session,
  refresh,
}: {
  session: Session;
  refresh: Refresh;
}) {
  const resource = useResource("/me/sessions", sessionsSchema);
  const wrongPortal =
    resource.data?.sessions.some((item) => item.portal !== session.portal) ??
    false;
  return (
    <section className="identity-section">
      <h2>Active sessions</h2>
      {session.portal !== "customer" && (
        <p>
          These sessions belong only to your{" "}
          {session.portal === "admin" ? "admin" : "booster"} account. Separate
          PLAYORA accounts have their own sessions.
        </p>
      )}
      <RetryButton
        deadline={
          resource.error instanceof APIError
            ? resource.error.retryAt
            : undefined
        }
        busy={resource.loading}
        onRetry={resource.reload}
        secondary
      >
        {resource.loading ? "Loading sessions…" : "Refresh sessions"}
      </RetryButton>
      {resource.error != null && (
        <p role="alert">{errorMessage(resource.error)}</p>
      )}
      {wrongPortal && (
        <p role="alert">
          Session information did not match this workspace. Refresh this page
          before trying again.
        </p>
      )}
      {resource.data && !wrongPortal && (
        <>
          {resource.data.sessions.length === 0 && (
            <p role="status">
              No active sessions were returned. Refresh to check your sign-in.
            </p>
          )}
          {resource.data.sessions.map((item) => (
            <Form
              key={item.id}
              title={item.current ? "This device" : "Other session"}
              label={
                item.current ? "Sign out this device" : "Sign out this session"
              }
              variant="secondary"
              submit={async () => {
                await command("/auth/sessions/revoke", {
                  id: item.id,
                  all: false,
                });
                resource.reload();
                await refresh();
              }}
            >
              <p>
                Last active {sessionTime(item.last_seen_at)} · Started{" "}
                {sessionTime(item.created_at)} · Expires{" "}
                {sessionTime(item.expires_at)}
              </p>
            </Form>
          ))}
        </>
      )}
      <Form
        title="Sign out everywhere"
        label="Sign out this account everywhere"
        variant="destructive"
        submit={async () => {
          await command("/auth/sessions/revoke", { id: "", all: true });
          await refresh();
        }}
      >
        <Confirmation>
          End every session for this {session.portal} account, including this
          device
        </Confirmation>
      </Form>
    </section>
  );
}

function Account({
  session,
  refresh,
  onCodes,
  section = "profile",
}: {
  session: Session;
  refresh: Refresh;
  onCodes: (codes: string[]) => void;
  section?: "profile" | "security" | "preferences" | "sessions" | "recovery";
}) {
  const portal = session.portal;
  const base = portal === "customer" ? "/account" : `/${portal}/account`;
  const user = session.user;
  const [name, setName] = useState(user?.display_name ?? "");
  const [alias, setAlias] = useState(user?.staff_alias ?? "");
  if (!user) return null;
  return (
    <div className="account-settings">
      {section === "security" && <VerificationReturn />}
      <nav className="settings-navigation" aria-label="Account settings">
        <NavLink to={`${base}/settings`}>Profile</NavLink>
        <NavLink to={`${base}/security`}>Security</NavLink>
        <NavLink to={`${base}/sessions`}>Sessions</NavLink>
        <NavLink to={`${base}/recovery`}>Recovery codes</NavLink>
        <NavLink to={`${base}/preferences`}>Preferences</NavLink>
        {portal === "customer" && <Link to="/privacy">Privacy</Link>}
      </nav>
      {portal !== "customer" && (
        <p className="quiet">
          Your {portal === "admin" ? "admin" : "booster"} profile, sign-in
          methods, authenticator and sessions belong to this workspace only,
          even if you use the same email for another PLAYORA account.
        </p>
      )}
      {section === "sessions" && (
        <SessionList session={session} refresh={refresh} />
      )}
      {section === "recovery" && (
        <section className="identity-section">
          <h2>Recovery for this account</h2>
          {!user.mfa_enabled ? (
            <>
              <p>
                You haven’t set up an authenticator for this account, so there
                are no recovery codes yet.
              </p>
              <Link className="button" to={`${base}/security`}>
                Set up an authenticator
              </Link>
            </>
          ) : (
            <>
              <p>
                Each recovery code replaces one authenticator check, once. Keep
                them private.
              </p>
              <RecoveryCodes session={session} onCodes={onCodes} />
              <details>
                <summary>Lost your authenticator and recovery codes?</summary>
                <p>
                  {portal === "customer"
                    ? "Contact PLAYORA support for an independent ownership review."
                    : "Contact your PLAYORA administrator through your established staff channel for an independent ownership review."}{" "}
                  Email verification alone does not remove the second factor.
                  Never send a setup key, password or recovery code.
                </p>
              </details>
            </>
          )}
        </section>
      )}
      {section === "profile" && (
        <Form
          title="Profile"
          label="Save profile"
          success="Profile saved."
          footer={
            <dl className="profile-facts">
              <div>
                <dt>Email</dt>
                <dd>
                  {user.email} · Verified ·{" "}
                  <Link to={`${base}/security`}>
                    Manage email and sign-in methods
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Account reference</dt>
                <dd>
                  <details>
                    <summary>Show reference</summary>
                    <p className="quiet">{user.id}</p>
                  </details>
                </dd>
              </div>
            </dl>
          }
          submit={async (data) => {
            await command("/me/profile", {
              display_name: value(data, "display_name"),
              staff_alias:
                portal === "customer"
                  ? user.staff_alias
                  : value(data, "staff_alias"),
              notify_updates: user.notify_updates,
            });
            await refresh();
            setName(value(data, "display_name").trim());
            setAlias(
              portal === "customer"
                ? user.staff_alias
                : value(data, "staff_alias").trim(),
            );
          }}
        >
          <EditableText
            name="display_name"
            label="Display name"
            value={name}
            change={setName}
            maxLength={100}
            autoComplete="nickname"
          />
          {portal !== "customer" && (
            <EditableText
              name="staff_alias"
              label="Customer-facing staff alias"
              value={alias}
              change={setAlias}
              maxLength={80}
            />
          )}
        </Form>
      )}
      {section === "preferences" && (
        <>
          <DisplayPreferences />
          <Form
            title="Email preferences"
            label="Save preferences"
            success="Email preferences saved."
            submit={async (data) => {
              await command("/me/profile", {
                display_name: user.display_name,
                staff_alias: user.staff_alias,
                notify_updates: data.get("notify_updates") === "on",
              });
              await refresh();
            }}
          >
            <div>
              <label className="check">
                <input
                  type="checkbox"
                  name="notify_updates"
                  aria-describedby="notify-updates-hint"
                  defaultChecked={user.notify_updates}
                />
                Email me order updates
              </label>
              <p id="notify-updates-hint" className="check-hint">
                Security emails are always sent.
              </p>
            </div>
            {portal === "customer" && (
              <p>
                <Link to="/availability">Manage package alerts</Link>
              </p>
            )}
          </Form>
        </>
      )}
      {section === "security" && (
        <>
          <Security
            key={`${session.portal}:${user.id}:${user.email}:${String(user.mfa_enabled)}`}
            session={session}
            refresh={refresh}
            onCodes={onCodes}
            showRecoveryTools={false}
          />
          {portal === "customer" ? (
            <details>
              <summary>Active sessions and sign-out options</summary>
              <SessionList session={session} refresh={refresh} />
            </details>
          ) : (
            <p>
              <Link to={`${base}/sessions`}>
                Manage this workspace’s sessions
              </Link>{" "}
              · <Link to={`${base}/recovery`}>Manage recovery codes</Link>
            </p>
          )}
          <details>
            <summary>Email and linked Google account</summary>
            <EmailForm purpose="email_change" refresh={refresh} />
            {session.google_enabled && !session.google_linked && (
              <Google session={session} purpose="link" refresh={refresh} />
            )}
            {session.google_linked && (
              <Form
                title="Disconnect Google"
                submit={async () => {
                  await command("/me/google/unlink");
                  await refresh();
                }}
              >
                <p>
                  Your verified email remains available. All sessions will end.
                </p>
                <Confirmation>Disconnect Google and sign out</Confirmation>
              </Form>
            )}
          </details>
        </>
      )}
    </div>
  );
}
type IdentityProps = {
  title: string;
  view?:
    | "overview"
    | "profile"
    | "security"
    | "preferences"
    | "sessions"
    | "recovery";
  capability?: "self" | "account" | "admin" | "booster" | "owner";
  children?: ReactNode;
};
export default function Identity(props: IdentityProps) {
  const portal = portalFromPath(useLocation().pathname);
  return <PortalIdentity key={portal} {...props} portal={portal} />;
}
function PortalIdentity({
  title,
  capability = "account",
  children,
  view = "profile",
  portal,
}: IdentityProps & { portal: Portal }) {
  const location = useLocation();
  const entry = location.pathname === portalLogin(portal);
  if (entry)
    title =
      portal === "admin"
        ? "Admin sign-in"
        : portal === "booster"
          ? "Booster sign-in"
          : "Sign in";
  const Frame = useContext(IdentityFrame);
  const [search] = useSearchParams();
  const googleError = new Map([
    ["verification", "Google verification failed. Start again or use email."],
    [
      "staff_access",
      `${portal === "booster" ? "Booster" : "Admin"} access is not available for this Google account. Ask the owner to add or restore your account in this workspace.`,
    ],
    [
      "link_conflict",
      "Sign in to your existing account with email, then link Google from account security.",
    ],
    [
      "terms",
      "Accept the current account terms before continuing with Google.",
    ],
  ]).get(search.get("error") ?? "");
  const [session, setSession] = useState<Session | null>(null),
    [failure, setFailure] = useState(""),
    [failureStatus, setFailureStatus] = useState<number | undefined>(undefined),
    [retryAt, setRetryAt] = useState<number | undefined>(undefined),
    [refreshing, setRefreshing] = useState(false),
    [codes, setCodes] = useState<string[]>([]);
  const revision = useRef(0);
  const currentUser = useRef<string | null>(null);
  const pending = useRef(false);
  const cooldown = useRef<number | undefined>(undefined);
  const refresh = useCallback(
    async (sessionChanged = true) => {
      // Focus and manual retry share the same lock. A completed auth mutation can
      // supersede an older read, but even that must respect the server cooldown.
      if (cooldown.current !== undefined && cooldown.current > Date.now())
        return;
      if (pending.current && !sessionChanged) return;
      const requestRevision = ++revision.current;
      pending.current = true;
      setRefreshing(true);
      try {
        const result = await get("/auth/session", sessionSchema, portal);
        if (requestRevision !== revision.current) return;
        setSession(result);
        if ((result.user?.id ?? null) !== currentUser.current) setCodes([]);
        currentUser.current = result.user?.id ?? null;
        setFailure("");
        setFailureStatus(undefined);
        cooldown.current = undefined;
        setRetryAt(undefined);
      } catch (error) {
        if (requestRevision !== revision.current) return;
        setSession(null);
        setFailure(errorMessage(error));
        setFailureStatus(error instanceof APIError ? error.status : undefined);
        cooldown.current =
          error instanceof APIError ? error.retryAt : undefined;
        setRetryAt(cooldown.current);
      } finally {
        if (requestRevision === revision.current) {
          pending.current = false;
          setRefreshing(false);
        }
      }
    },
    [portal],
  );
  const cancelRefresh = useCallback(() => {
    revision.current++;
    pending.current = false;
  }, []);
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, portal)) void refresh();
    };
    const focused = () => {
      void refresh(false);
    };
    window.addEventListener("boosterplus:session-changed", changed);
    window.addEventListener("focus", focused);
    let active = true;
    // Start the bootstrap read asynchronously; unmount cancels queued work and
    // invalidates any read already in flight without changing another session.
    void Promise.resolve().then(async () => {
      if (active) await refresh();
    });
    return () => {
      active = false;
      window.removeEventListener("boosterplus:session-changed", changed);
      window.removeEventListener("focus", focused);
      cancelRefresh();
    };
  }, [refresh, cancelRefresh, portal]);
  if (!entry && session && (!session.user || session.mfa_required)) {
    const target =
      safeReturnPath(location.pathname + location.search, portal) ??
      portalHome(portal);
    return (
      <Navigate
        replace
        to={`${portalLogin(portal)}?returnTo=${encodeURIComponent(target)}`}
      />
    );
  }
  return createElement(Frame, {
    session: entry ? null : session,
    title,
    navigation:
      session?.user && !entry && portal !== "admin" ? (
        <AccountNavigation
          key={`${portal}:${session.user.id}`}
          session={session}
          action={
            <Form
              compact
              title="Sign out"
              submit={async () => {
                await command("/auth/logout");
                clearGoogleReturn(portal);
                if (portal === "customer") clearConfigurationDraft();
                setCodes([]);
                await refresh();
              }}
            />
          }
        />
      ) : session?.user && !entry && portal === "admin" ? (
        <Form
          compact
          title="Sign out"
          submit={async () => {
            await command("/auth/logout");
            clearGoogleReturn(portal);
            setCodes([]);
            await refresh();
          }}
        />
      ) : null,
    children: (
      <main
        id="main"
        className={`page identity-page${entry ? " portal-sign-in" : ""}`}
        data-portal={portal}
      >
        <SignInReturn
          ready={
            !!session?.user &&
            !session.mfa_required &&
            session.capabilities.includes(capability) &&
            codes.length === 0
          }
        />
        <title>{`${title} | PLAYORA`}</title>
        <SignInLayout enabled={entry} portal={portal}>
          <PageHeader
            title={title}
            eyebrow={
              portal === "admin"
                ? "Admin workspace"
                : portal === "booster"
                  ? "Booster workspace"
                  : "My account"
            }
          />
          {entry && (portal !== "customer" || session?.mfa_required) && (
            <ol className="portal-sign-in-steps" aria-label="Sign-in steps">
              <li aria-current={!session?.user ? "step" : undefined}>
                1 · Verify email or Google
              </li>
              {(portal !== "customer" || session?.mfa_required) && (
                <li aria-current={session?.mfa_required ? "step" : undefined}>
                  2 · Verify authenticator
                </li>
              )}
            </ol>
          )}
          {googleError && <p role="alert">{googleError}</p>}
          {failure ? (
            <PanelState
              kind="error"
              title={
                failureStatus === 429
                  ? "Please wait before trying again"
                  : "Connection unavailable"
              }
              description={failure}
            >
              <RetryButton
                deadline={retryAt}
                busy={refreshing}
                onRetry={() => {
                  void refresh(false);
                }}
              >
                {refreshing ? "Checking connection…" : "Retry connection"}
              </RetryButton>
            </PanelState>
          ) : !session ? (
            <Loading label="Loading your workspace…" />
          ) : (
            <>
              {codes.length > 0 && (
                <RecoveryResult
                  codes={codes}
                  acknowledge={() => {
                    setCodes([]);
                  }}
                />
              )}
              {!session.user ? (
                <>
                  <p>
                    {portal === "customer"
                      ? "Sign in or create your account"
                      : `Use your invited ${portal} account. Email or Google verification is followed by your authenticator.`}
                  </p>
                  <AuthEntryProgress requireConsent>
                    <div className="identity-grid">
                      {session.google_enabled ? (
                        <Google
                          session={session}
                          purpose="login"
                          refresh={refresh}
                        />
                      ) : (
                        <p>
                          Google sign-in is currently unavailable. Continue with
                          email.
                        </p>
                      )}
                      <EmailForm
                        purpose="login"
                        refresh={refresh}
                        termsVersion={session.terms_version}
                      />
                    </div>
                  </AuthEntryProgress>
                  {portal !== "customer" && (
                    <details>
                      <summary>Need access to this workspace?</summary>
                      <p>
                        Ask the owner to add your email in Customers &amp; staff
                        and select the{" "}
                        {portal === "booster" ? "Booster" : "Admin"} workspace
                        first. An account in another workspace does not give
                        access here.
                      </p>
                    </details>
                  )}
                  <EmailRecoveryDialog>
                    <EmailForm purpose="recovery" refresh={refresh} />
                  </EmailRecoveryDialog>
                </>
              ) : (
                <>
                  {entry && (
                    <Form
                      compact
                      title="Sign out"
                      submit={async () => {
                        await command("/auth/logout");
                        clearGoogleReturn(portal);
                        if (portal === "customer") clearConfigurationDraft();
                        setCodes([]);
                        await refresh();
                      }}
                    />
                  )}
                  {session.mfa_required ? (
                    <>
                      <p role="status">
                        Enter your authenticator code to finish signing in.
                      </p>
                      <Security
                        key={`${session.portal}:${session.user.id}:${session.user.email}:${String(session.user.mfa_enabled)}`}
                        session={session}
                        refresh={refresh}
                        onCodes={setCodes}
                      />
                    </>
                  ) : !session.capabilities.includes(capability) ? (
                    <p role="alert">You do not have access to this portal.</p>
                  ) : entry ? (
                    <p role="status">
                      {codes.length
                        ? "Save your recovery codes to finish signing in."
                        : "Opening your workspace…"}
                    </p>
                  ) : children ? (
                    <AuthorizedIdentity
                      key={`${portal}:${session.user.id}`}
                      value={{ session, refresh }}
                    >
                      {children}
                    </AuthorizedIdentity>
                  ) : capability === "booster" && view === "overview" ? (
                    <section
                      className="booster-start"
                      aria-label="Booster workspace shortcuts"
                    >
                      <h2>Your work, in focus.</h2>
                      <p>
                        Open your{" "}
                        <Link to="/booster/orders">
                          assigned-order workspace
                        </Link>{" "}
                        or your{" "}
                        <Link to="/booster/calendar">
                          availability calendar
                        </Link>
                        .
                      </p>
                      <div className="catalog-cards">
                        <Link
                          className="workspace-shortcut"
                          to="/booster/orders"
                        >
                          <span className="eyebrow">01 · ASSIGNED WORK</span>
                          <h3>Pick up where you left off ↗</h3>
                          <p>
                            Review the agreed scope, update progress and
                            coordinate in the fulfillment conversation.
                          </p>
                        </Link>
                        <Link
                          className="workspace-shortcut"
                          to="/booster/calendar"
                        >
                          <span className="eyebrow">02 · YOUR SCHEDULE</span>
                          <h3>Make room for good work ↗</h3>
                          <p>
                            Manage availability and proposed sessions with an
                            explicit time zone.
                          </p>
                        </Link>
                      </div>
                    </section>
                  ) : view === "overview" ? (
                    <AccountOverview key={`${portal}:${session.user.id}`} />
                  ) : (
                    <Account
                      key={`${portal}:${session.user.id}`}
                      section={view}
                      session={session}
                      refresh={refresh}
                      onCodes={setCodes}
                    />
                  )}
                </>
              )}
            </>
          )}
          {entry && portal !== "customer" && (
            <p className="portal-entry-help">
              <Anchor href="/">Visit the PLAYORA website ↗</Anchor>
            </p>
          )}
        </SignInLayout>
      </main>
    ),
  });
}

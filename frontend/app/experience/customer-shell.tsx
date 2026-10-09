import CustomerActivity from "../account/activity";
import "../ui/workspace.css";
import "../account/account.css";
import { useLocation } from "../portal-router";
import type { FrameProps } from "../identity/frame";
export default function CustomerShell({
  session,
  children,
  navigation,
}: FrameProps) {
  const booster = useLocation().pathname.startsWith("/booster");
  const signedIn =
    !!session?.user &&
    !session.mfa_required &&
    session.capabilities.includes(booster ? "booster" : "account");
  return (
    <div
      data-workspace={booster ? "booster" : "customer"}
      className={
        signedIn
          ? "customer-shell account-layout"
          : "customer-entry account-entry"
      }
    >
      {signedIn ? navigation : null}
      {children}
      {!signedIn ? navigation : null}
      {signedIn && !booster && <CustomerActivity session={session} />}
    </div>
  );
}

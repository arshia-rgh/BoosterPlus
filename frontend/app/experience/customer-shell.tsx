import "../ui/workspace.css";
import "../account/account.css";
import type { FrameProps } from "../identity/frame";
export default function CustomerShell({
  session,
  children,
  navigation,
}: FrameProps) {
  const signedIn =
    !!session?.user &&
    !session.mfa_required &&
    session.capabilities.includes("account");
  return (
    <div
      className={
        signedIn
          ? "customer-shell account-layout"
          : "customer-entry account-entry"
      }
    >
      {signedIn ? navigation : null}
      {children}
      {!signedIn ? navigation : null}
    </div>
  );
}

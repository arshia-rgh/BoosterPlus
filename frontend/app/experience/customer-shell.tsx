import { Link, useLocation } from "react-router";
import type { FrameProps } from "../identity/frame";
export default function CustomerShell({ session, children }: FrameProps) {
  const { pathname } = useLocation();
  const booster = pathname.startsWith("/booster");
  const signedIn = !!session?.user && !session.mfa_required;
  return (
    <div className={signedIn ? "customer-shell" : "customer-entry"}>
      {!signedIn && (
        <section className="customer-welcome" aria-label="Account introduction">
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h2>
            A better climb.
            <br />
            <em>One place for it all.</em>
          </h2>
          <p>
            Your requests, conversations, and progress stay together in your
            Booster Plus account.
          </p>
          <ul>
            <li>
              <span aria-hidden="true">01</span> Sign in with Google or an email
              code
            </li>
            <li>
              <span aria-hidden="true">02</span> Review the scope and price
              before payment
            </li>
            <li>
              <span aria-hidden="true">03</span> Follow updates and chat with
              our team
            </li>
          </ul>
          <Link to="/games">Explore the game lineup ↗</Link>
        </section>
      )}
      {signedIn && (
        <section className="customer-banner" aria-label="Workspace overview">
          <div>
            <p className="eyebrow">
              {booster ? "BOOSTER WORKSPACE" : "YOUR BOOSTER PLUS"}
            </p>
            <p>
              {booster
                ? "Good work starts with a clear plan."
                : "Every step of your next climb."}
            </p>
          </div>
          <Link
            className="button"
            to={booster ? "/booster/calendar" : "/games"}
          >
            {booster ? "Manage availability" : "Find your next boost"}{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        </section>
      )}
      {children}
    </div>
  );
}

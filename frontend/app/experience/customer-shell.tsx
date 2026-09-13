import "../ui/workspace.css";
import { Link } from "react-router";
import type { FrameProps } from "../identity/frame";
export default function CustomerShell({ session, children }: FrameProps) {
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
            PLAYORA account.
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
      {children}
    </div>
  );
}

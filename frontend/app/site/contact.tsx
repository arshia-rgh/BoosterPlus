import { Anchor, Link } from "../portal-router";
import {
  contactEmail,
  contactLinks,
  type ContactLinks,
} from "./contact-config";
import ContactIcon from "./contact-icons";
import "./contact.css";

export default function Contact({
  links = contactLinks,
}: {
  links?: ContactLinks;
}) {
  const channels = [
    { id: "discord", name: "Discord", href: links.discord },
    { id: "whatsapp", name: "WhatsApp", href: links.whatsapp },
    { id: "instagram", name: "Instagram", href: links.instagram },
  ] as const;
  return (
    <main id="main" className="page contact-page">
      <Link className="context-back" to="/">
        <span aria-hidden="true">←</span> Back to PLAYORA
      </Link>
      <header className="contact-heading">
        <p className="eyebrow">HERE TO HELP</p>
        <h1>Contact us.</h1>
        <p>
          A question before you start, help with an order, or trouble signing
          in. Choose the best way to reach the PLAYORA team.
        </p>
      </header>

      <div className="contact-main-grid">
        <section
          className="contact-card contact-email"
          aria-labelledby="contact-email-title"
        >
          <span className="contact-icon-tile">
            <ContactIcon kind="email" />
          </span>
          <p className="contact-kicker">NO SIGN-IN NEEDED</p>
          <h2 id="contact-email-title">Send us an email.</h2>
          <p>Ask about our services or get help with your account.</p>
          <Anchor
            className="contact-email-link"
            href={`mailto:${contactEmail}`}
          >
            <span className="contact-email-address">
              {contactEmail.slice(0, contactEmail.indexOf("@") + 1)}
              <wbr />
              <span className="contact-email-domain">
                {contactEmail.slice(contactEmail.indexOf("@") + 1)}
              </span>
            </span>
            <span aria-hidden="true">↗</span>
          </Anchor>
          <p className="contact-detail">Opens your email app.</p>
        </section>

        <section
          className="contact-card contact-support"
          aria-labelledby="contact-support-title"
        >
          <span className="contact-icon-tile">
            <ContactIcon kind="chat" />
          </span>
          <p className="contact-kicker">PRIVATE CONVERSATIONS</p>
          <h2 id="contact-support-title">Keep every reply together.</h2>
          <p>
            Open your support conversations for order questions, shared proof,
            and updates from the team.
          </p>
          <Link className="button" to="/support">
            Chat with support <span aria-hidden="true">→</span>
          </Link>
          <p className="contact-detail">
            Sign-in required. You’ll return to support after signing in.
          </p>
        </section>
      </div>

      <section
        className="contact-socials"
        aria-labelledby="contact-social-title"
      >
        <div className="contact-section-heading">
          <h2 id="contact-social-title">Find PLAYORA.</h2>
          <p>Our social channels, all in one place.</p>
        </div>
        <ul className="contact-social-grid">
          {channels.map(({ id, name, href }) => (
            <li key={id}>
              {href ? (
                <Anchor
                  className="contact-social-card"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open PLAYORA on ${name} (opens in a new tab)`}
                >
                  <ContactIcon kind={id} />
                  <span className="contact-social-copy">
                    <strong>{name}</strong>
                    <span>
                      Open {name} <span className="sr-only">in a new tab</span>
                    </span>
                  </span>
                  <span className="contact-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Anchor>
              ) : (
                <div className="contact-social-card contact-social-unavailable">
                  <ContactIcon kind={id} />
                  <span className="contact-social-copy">
                    <strong>{name}</strong>
                    <span>Link not available yet</span>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <aside className="contact-access" aria-labelledby="contact-access-title">
        <div>
          <h2 id="contact-access-title">Can’t sign in?</h2>
          <p>
            Email us with a short description of the problem. Use your account
            email address if you can, and keep passwords, authenticator codes,
            and recovery codes out of your message.
          </p>
        </div>
        <Anchor href={`mailto:${contactEmail}`}>
          Email for account access <span aria-hidden="true">↗</span>
        </Anchor>
      </aside>
    </main>
  );
}

import type { HomeContent } from "./model";
import "./public-info.css";
const services = [
  [
    "A boost shaped around you",
    "Choose a game and a published service. Custom requests receive an estimate, then a final staff-reviewed quote for you to accept. Fixed packages have a defined price and scope; check their requirements before checkout.",
  ],
  [
    "Accounts, with clear terms",
    "Browse available accounts inside your game. To sell, submit privately for staff review. Accept a specific offer with its price, fees, payment timing and transfer obligations before proceeding.",
  ],
  [
    "Your game's shop",
    "Choose a published item and check its region, platform and recipient requirements. PLAYORA staff fulfill the order after payment is verified. Your order keeps the delivery terms and evidence together.",
  ],
  [
    "Direct crypto checkout",
    "Pay for each order directly. There is no stored wallet balance. Network confirmation and provider verification determine payment status; opening checkout or sending a transaction alone does not confirm payment.",
  ],
  [
    "Stay close to every update",
    "Your account holds order history, private messages, progress and shared proof. Open an order to ask for help, review a delay or submit a case. Any refund or seller payment follows its explicit accepted terms.",
  ],
  [
    "Read before your next game",
    "Find staff-published news, patch notes and guides in each game. Only the services currently available for that game can be selected.",
  ],
];
export default function HowItWorks({ content }: { content: HomeContent }) {
  return (
    <main id="main" className="page public-info">
      <title>How PLAYORA works | PLAYORA</title>
      <p className="eyebrow">CLEAR CHOICES. ONE PLACE.</p>
      <h1>How PLAYORA works.</h1>
      <p>
        Choose your game, review the details, and keep every decision with your
        order. Available services and their terms are shown before you commit.
      </p>
      <div className="info-grid">
        {services.map(([title, description]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
          </section>
        ))}
      </div>
      <section aria-labelledby="info-contact">
        <h2 id="info-contact">Here to help.</h2>
        <p>
          Use your account's support conversations for private order questions.
        </p>
        {content.contact_email && (
          <p>
            Email:{" "}
            <a href={`mailto:${content.contact_email}`}>
              {content.contact_email}
            </a>
          </p>
        )}
        {content.support_hours && <p>Support hours: {content.support_hours}</p>}
        <div className="catalog-actions">
          <a className="button" href="/games">
            Choose your game
          </a>
          <a href="/support">Contact support</a>
          <a href="/terms">Read terms & policies</a>
        </div>
      </section>
    </main>
  );
}

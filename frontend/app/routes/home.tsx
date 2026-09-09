import { Link } from "react-router";

export function meta() {
  return [
    { title: "Booster Plus — Game boosting & accounts" },
    {
      name: "description",
      content:
        "Mobile Legends boosting and reviewed game accounts. Booster Plus is preparing for launch.",
    },
  ];
}

export default function Home() {
  return (
    <main id="main" className="home">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">Booster Plus / Coming soon</p>
        <h1 id="hero-title">
          YOUR NEXT
          <br />
          LEVEL<span>.</span>
        </h1>
        <p className="intro">
          Mobile Legends boosting, built around the way you play.
        </p>
        <Link className="button" to="/games">
          Explore games <span aria-hidden="true">↗</span>
        </Link>
        <p className="quiet">
          We’re preparing our services. Orders aren’t open yet.
        </p>
      </section>
      <aside className="feature-panel" aria-label="Mobile Legends launch">
        <span className="panel-number" aria-hidden="true">
          01
        </span>
        <p className="eyebrow">FIRST UP</p>
        <h2>
          MOBILE
          <br />
          LEGENDS
        </h2>
        <div className="panel-divider" />
        <p>Play together or let an assigned booster take the lead.</p>
        <span className="status">
          <span aria-hidden="true">●</span> Preparing for launch
        </span>
      </aside>
    </main>
  );
}

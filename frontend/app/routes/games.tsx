export function meta() {
  return [
    { title: "Games — Booster Plus" },
    {
      name: "description",
      content:
        "Explore the games coming to Booster Plus, starting with Mobile Legends.",
    },
  ];
}

export default function Games() {
  return (
    <main id="main" className="page">
      <p className="eyebrow">THE LINEUP</p>
      <h1>Choose your game.</h1>
      <article className="game-card">
        <span className="status">Coming soon</span>
        <h2>Mobile Legends</h2>
        <p>Custom boosting and fixed packages are being prepared.</p>
        <p className="quiet">
          Prices and availability will appear when services open.
        </p>
      </article>
    </main>
  );
}

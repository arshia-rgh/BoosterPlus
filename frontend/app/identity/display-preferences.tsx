export function DisplayPreferences() {
  return (
    <section
      className="account-panel"
      aria-labelledby="display-preferences-title"
    >
      <h2 id="display-preferences-title">Language and times</h2>
      <p>
        PLAYORA currently uses English. Dates and times use your browser's
        timezone unless a field explicitly says UTC. Scheduled service sessions
        show their stated timezone. Changing your browser or device settings
        changes local date formatting.
      </p>
    </section>
  );
}

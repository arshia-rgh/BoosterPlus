import { Action } from "../catalog/controls";
import { setMotionPreference, useMotionPreference } from "../ui/motion";
export function DisplayPreferences() {
  const motion = useMotionPreference();
  return (
    <section
      className="account-panel"
      aria-labelledby="display-preferences-title"
    >
      <h2 id="display-preferences-title">Display preferences</h2>
      <p>
        Animation preference applies immediately in this browser. Your device's
        reduced-motion setting is always respected.
      </p>
      <p role="status">
        {motion === "reduced"
          ? "Optional animations are paused."
          : motion === "system-reduced"
            ? "Your device requests reduced motion."
            : "Animations follow your device setting."}
      </p>
      <Action
        onClick={() => {
          setMotionPreference(motion !== "reduced");
        }}
      >
        {motion === "reduced"
          ? "Use device motion setting"
          : "Pause optional animations"}
      </Action>
      <h3>Language and times</h3>
      <p>
        PLAYORA currently uses English. Dates and times use your browser's
        timezone unless a field explicitly says UTC. Scheduled service sessions
        show their stated timezone. Changing your browser or device settings
        changes local date formatting.
      </p>
    </section>
  );
}

import { Select, Text } from "../catalog/controls";
import type { LocalTime } from "./calendar-model";
export default function TimeInput({
  label,
  value,
  change,
}: {
  label: string;
  value: LocalTime;
  change: (value: LocalTime) => void;
}) {
  return (
    <div className="catalog-grid">
      <Text
        label={`${label} (local time)`}
        type="datetime-local"
        value={value.local}
        change={(local) => {
          change({ ...value, local });
        }}
      />
      <Select
        label={`${label}: repeated clock hour`}
        value={value.occurrence}
        options={[
          ["", "Require an unambiguous time"],
          ["first", "First occurrence"],
          ["second", "Second occurrence"],
        ]}
        change={(occurrence) => {
          change({
            ...value,
            occurrence:
              occurrence === "first"
                ? "first"
                : occurrence === "second"
                  ? "second"
                  : "",
          });
        }}
      />
    </div>
  );
}

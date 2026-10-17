import { Select, Text } from "../catalog/controls";
import type { LocalTime } from "./calendar-model";
export default function TimeInput({
  name,
  label,
  value,
  change,
  split = false,
}: {
  name?: string;
  label: string;
  value: LocalTime;
  change: (value: LocalTime) => void;
  split?: boolean;
}) {
  return (
    <div className="catalog-grid">
      {split ? (
        <>
          <Text
            name={name ? `${name}.date` : undefined}
            label={`${label} date`}
            type="date"
            value={value.local.split("T")[0] ?? ""}
            change={(date) => {
              change({
                ...value,
                local: `${date}T${value.local.split("T")[1] ?? ""}`,
              });
            }}
          />
          <Text
            name={name ? `${name}.time` : undefined}
            label={`${label} time`}
            type="time"
            value={value.local.split("T")[1] ?? ""}
            change={(time) => {
              change({
                ...value,
                local: `${value.local.split("T")[0] ?? ""}T${time}`,
              });
            }}
          />
        </>
      ) : (
        <Text
          name={name ? `${name}.local` : undefined}
          label={`${label} (local time)`}
          type="datetime-local"
          value={value.local}
          change={(local) => {
            change({ ...value, local });
          }}
        />
      )}
      {value.zone !== "UTC" && (
        <Select
          name={name ? `${name}.occurrence` : undefined}
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
      )}
    </div>
  );
}

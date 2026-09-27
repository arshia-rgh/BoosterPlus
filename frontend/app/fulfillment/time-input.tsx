import { Select, Text } from "../catalog/controls";
import type { LocalTime } from "./calendar-model";
export default function TimeInput({
  label,
  value,
  change,
  split = false,
}: {
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
          <p>
            {value.local.replace("T", " at ") || "Choose a date and time"} ·{" "}
            {value.zone}
          </p>
        </>
      ) : (
        <Text
          label={`${label} (local time)`}
          type="datetime-local"
          value={value.local}
          change={(local) => {
            change({ ...value, local });
          }}
        />
      )}
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
      {split && (
        <p>
          Repeated clock hour:{" "}
          {value.occurrence === "first"
            ? "First occurrence"
            : value.occurrence === "second"
              ? "Second occurrence"
              : "Require an unambiguous time"}
          .
        </p>
      )}
    </div>
  );
}

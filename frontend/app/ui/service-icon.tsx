export type ServiceKind = "boost" | "accounts" | "shop" | "payment" | "news";
/** Authored vectors share an optical size without an icon-font dependency. */
export function ServiceIcon({ kind }: { kind: ServiceKind }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "boost" && (
        <>
          <path
            d="m16 3 10 5v8c0 6-6 10-10 13C12 26 6 22 6 16V8Z"
            fill="currentColor"
            fillOpacity=".08"
          />
          <path d="m11 16 5-5 5 5m-10 6 5-5 5 5M3 12H1m30 0h-2" />
        </>
      )}
      {kind === "accounts" && (
        <>
          <rect
            x="3"
            y="6"
            width="26"
            height="21"
            rx="4"
            fill="currentColor"
            fillOpacity=".08"
          />
          <circle cx="12" cy="13" r="3" />
          <path d="M7 22c0-5 10-5 10 0m4-10h4m-4 5h4m-4 5h2M10 6V3h12v3" />
        </>
      )}
      {kind === "shop" && (
        <>
          <path d="M6 11h20l2 17H4Z" fill="currentColor" fillOpacity=".08" />
          <path d="M11 12V8a5 5 0 0 1 10 0v4m-10 8h5m-2.5-2.5v5m7-3h.01m2 2h.01" />
        </>
      )}
      {kind === "news" && (
        <>
          <path
            d="M5 4h19v22a3 3 0 0 0 6 0V12h-6M27 29H8a3 3 0 0 1-3-3Z"
            fill="currentColor"
            fillOpacity=".08"
          />
          <path d="M10 10h9m-9 5h9m-9 5h4m-4 4h9" />
        </>
      )}
      {kind === "payment" && (
        <>
          <circle
            cx="13"
            cy="14"
            r="10"
            fill="currentColor"
            fillOpacity=".08"
          />
          <path d="M10 10h7m-3.5 0v9m-5-6c0 3 10 3 10 0" />
          <path d="m24 17 6 3v4c0 3-4 6-6 7-2-1-6-4-6-7v-4Z" fill="#10251c" />
          <path d="m21 24 2 2 4-4" />
        </>
      )}
    </svg>
  );
}

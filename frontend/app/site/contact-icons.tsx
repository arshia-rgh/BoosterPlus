import type { SocialChannel } from "./contact-config";

// Local decorative vectors inherit the surrounding green theme.
// Every icon is paired with visible text; it never supplies the accessible name.
export default function ContactIcon({
  kind,
}: {
  kind: SocialChannel | "email" | "chat";
}) {
  return (
    <svg
      className="contact-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "email" && (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 8 6 8-6" />
        </>
      )}
      {kind === "chat" && (
        <>
          <path d="M20.5 11.2a8.5 8.5 0 0 1-8.5 8.3 9.3 9.3 0 0 1-3.8-.8L3 21l1.6-5.1a8 8 0 0 1-1.1-4.7 8.5 8.5 0 0 1 17 0Z" />
          <path d="M8 10h8M8 14h5" />
        </>
      )}
      {kind === "instagram" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "whatsapp" && (
        <>
          <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-4.7a8.5 8.5 0 1 1 15.9-4.3Z" />
          <path d="m8 7-1 1c-.5.5.2 2.6 2.3 4.7s4.2 2.8 4.7 2.3l1-1-2-1.5-1 1a8.1 8.1 0 0 1-3-3l1-1L8 7Z" />
        </>
      )}
      {kind === "discord" && (
        <>
          <path d="M8.7 5.5a19 19 0 0 0-4.2 1.3C2.7 9.5 2 12.5 2.5 16a16 16 0 0 0 4.8 2.3l1-1.6m7.4-11.2a19 19 0 0 1 3.8 1.3c1.8 2.7 2.5 5.7 2 9.2a16 16 0 0 1-4.8 2.3l-1-1.6M8.7 5.5l.5 1.2a17 17 0 0 1 5.6 0l.5-1.2" />
          <path d="M7 15.7a12.2 12.2 0 0 0 10 0" />
          <ellipse
            cx="8.5"
            cy="12"
            rx="1.1"
            ry="1.5"
            fill="currentColor"
            stroke="none"
          />
          <ellipse
            cx="15.5"
            cy="12"
            rx="1.1"
            ry="1.5"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}
    </svg>
  );
}

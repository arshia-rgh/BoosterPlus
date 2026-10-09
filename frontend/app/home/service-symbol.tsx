import { ServiceIcon, type ServiceKind } from "../ui/service-icon";
/** Decorative vectors share the same service vocabulary as game cards. */
export function ServiceSymbol({ kind }: { kind: ServiceKind }) {
  return (
    <div className={`service-symbol symbol-${kind}`} aria-hidden="true">
      <div className="symbol-halo" />
      <div className="symbol-core">
        <ServiceIcon kind={kind} />
      </div>
      {[0, 1, 2, 3].map((index) => (
        <span key={index} className={`symbol-mark mark-${String(index)}`}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {index === 0 && <path d="m7 7 5 5-5 5m6-10 5 5-5 5" />}
            {index === 1 && (
              <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
            )}
            {index === 2 && (
              <>
                <circle cx="12" cy="12" r="8" />
                <path d="m8 12 3 3 5-6" />
              </>
            )}
            {index === 3 && <path d="M5 17 17 5M7 5h10v10" />}
          </svg>
        </span>
      ))}
      <span className="symbol-trail" />
      <span className="symbol-trail second-trail" />
    </div>
  );
}

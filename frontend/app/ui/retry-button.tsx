import { useEffect, useState, type ReactNode } from "react";

export function useRetryPending(deadline: number | undefined) {
  // A deterministic first render avoids server/browser clock hydration differences.
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (deadline === undefined || deadline <= now) return;
    const timer = window.setTimeout(
      () => {
        setNow(Date.now());
      },
      Math.max(0, Math.min(2147483647, deadline - Date.now())),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [deadline, now]);
  return deadline !== undefined && now < deadline;
}
export function RetryButton({
  deadline,
  onRetry,
  children,
  busy = false,
}: {
  deadline: number | undefined;
  onRetry: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const pending = useRetryPending(deadline);
  return (
    <button
      className="button"
      type="button"
      disabled={pending || busy}
      aria-busy={busy}
      onClick={onRetry}
    >
      {children}
    </button>
  );
}

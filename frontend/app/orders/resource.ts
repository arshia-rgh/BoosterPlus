import { activePortal } from "../identity/portal";
import { useCallback, useEffect, useState } from "react";
import type { z } from "../validation";
import { actionVerifiedEvent, get } from "../identity/api";
// Private data is held in component memory and discarded on route/session unmount.
export function useResource<T>(
  path: string,
  schema: z.ZodType<T>,
): {
  data: T | null;
  error: unknown;
  loading: boolean;
  reload: () => void;
  requestedAt?: number | undefined;
} {
  const portal = activePortal();
  const scopedPath = `${portal}:${path}`;
  const [value, setValue] = useState<{
      path: string;
      revision: number;
      data: T;
      requestedAt: number;
    } | null>(null),
    [failure, setFailure] = useState<{
      path: string;
      revision: number;
      cause: unknown;
    } | null>(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const requestedAt = performance.now();
    void get(path, schema, portal)
      .then((data) => {
        if (active) {
          setValue({ path: scopedPath, revision, data, requestedAt });
          setFailure(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setFailure({ path: scopedPath, revision, cause });
      });
    return () => {
      active = false;
    };
  }, [path, schema, revision, portal, scopedPath]);
  const reload = useCallback(() => {
    setRevision((v) => v + 1);
  }, []);
  useEffect(() => {
    const verified = (event: Event) => {
      const detail: unknown =
        event instanceof CustomEvent ? event.detail : null;
      if (
        typeof detail === "object" &&
        detail !== null &&
        "portal" in detail &&
        detail.portal === portal
      )
        reload();
    };
    window.addEventListener(actionVerifiedEvent, verified);
    return () => {
      window.removeEventListener(actionVerifiedEvent, verified);
    };
  }, [portal, reload]);
  const failed = failure?.path === scopedPath && failure.revision === revision;
  return {
    requestedAt: value?.path === scopedPath ? value.requestedAt : undefined,
    data:
      value?.path === scopedPath && failure?.path !== scopedPath
        ? value.data
        : null,
    // A retry must not briefly expose cached private data after an access failure.
    error: failure?.path === scopedPath ? failure.cause : null,
    loading:
      !(value?.path === scopedPath && value.revision === revision) && !failed,
    reload,
  };
}

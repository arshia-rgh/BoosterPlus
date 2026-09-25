import { activePortal } from "../identity/portal";
import { useCallback, useEffect, useState } from "react";
import type { z } from "../validation";
import { get } from "../identity/api";
// Private data is held in component memory and discarded on route/session unmount.
export function useResource<T>(path: string, schema: z.ZodType<T>) {
  const portal = activePortal();
  const scopedPath = `${portal}:${path}`;
  const [value, setValue] = useState<{
      path: string;
      revision: number;
      data: T;
    } | null>(null),
    [failure, setFailure] = useState<{
      path: string;
      revision: number;
      cause: unknown;
    } | null>(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void get(path, schema, portal)
      .then((data) => {
        if (active) {
          setValue({ path: scopedPath, revision, data });
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
  const failed = failure?.path === scopedPath && failure.revision === revision;
  return {
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

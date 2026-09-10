import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import { get } from "../identity/api";
// Private data is held in component memory and discarded on route/session unmount.
export function useResource<T>(path: string, schema: z.ZodType<T>) {
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
    void get(path, schema)
      .then((data) => {
        if (active) {
          setValue({ path, revision, data });
          setFailure(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setFailure({ path, revision, cause });
      });
    return () => {
      active = false;
    };
  }, [path, schema, revision]);
  const reload = useCallback(() => {
    setRevision((v) => v + 1);
  }, []);
  const failed = failure?.path === path && failure.revision === revision;
  return {
    data: value?.path === path ? value.data : null,
    error: failed ? failure.cause : null,
    loading: !(value?.path === path && value.revision === revision) && !failed,
    reload,
  };
}

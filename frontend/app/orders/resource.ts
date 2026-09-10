import { useEffect, useState } from "react";
import type { z } from "zod";
import { get } from "../identity/api";
// Private data is held in component memory and discarded on route/session unmount.
export function useResource<T>(path: string, schema: z.ZodType<T>) {
  const [value, setValue] = useState<{ path: string; data: T } | null>(null),
    [error, setError] = useState<unknown>(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void get(path, schema)
      .then((data) => {
        if (active) {
          setValue({ path, data });
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      });
    return () => {
      active = false;
    };
  }, [path, schema, revision]);
  return {
    data: value?.path === path ? value.data : null,
    error,
    reload: () => {
      setRevision((v) => v + 1);
    },
  };
}

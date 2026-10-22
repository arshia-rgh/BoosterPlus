import { useCallback, useEffect, useState } from "react";
import { get } from "../identity/api";
import { activePortal } from "../identity/portal";
import type { components } from "../api/schema";
import { z } from "../validation";

const decimal = z
  .string()
  .max(125)
  .refine((value) => {
    const exponentParts = value.split(/[eE]/);
    if (exponentParts.length > 2) return false;
    const [mantissa = "", exponent] = exponentParts;
    if (exponent !== undefined && !/^[+-]?[0-9]{1,2}$/.test(exponent))
      return false;
    const parts = mantissa.split(".");
    if (parts.length > 2) return false;
    const [integer = "", fraction] = parts;
    return (
      /^(0|[1-9][0-9]*)$/.test(integer) &&
      (fraction === undefined || /^[0-9]+$/.test(fraction))
    );
  });
export const paymentOptionsSchema = z
  .object({
    contract_id: z.string(),
    policy_id: z.string(),
    currency: z.string(),
    amount_minor: z.string().regex(/^[1-9][0-9]*$/),
    server_time: z.iso.datetime({ offset: true }),
    routes: z
      .array(
        z.object({
          code: z.string(),
          status: z.enum(["available", "below_minimum", "unavailable"]),
          minimum_crypto: z.union([z.literal(""), decimal]),
          minimum_fiat: z.union([z.literal(""), decimal]),
          checked_at: z.iso.datetime({ offset: true }).nullable(),
          valid_until: z.iso.datetime({ offset: true }).nullable(),
        }),
      )
      .max(40),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>();
    value.routes.forEach((route, index) => {
      if (
        seen.has(route.code) ||
        (route.status !== "unavailable" &&
          (!(Number(route.minimum_crypto) > 0) ||
            !(Number(route.minimum_fiat) > 0) ||
            !route.checked_at ||
            !route.valid_until))
      )
        context.addIssue({
          code: "custom",
          path: ["routes", index],
          message: "Invalid payment eligibility evidence",
        });
      seen.add(route.code);
    });
  }) satisfies z.ZodType<components["schemas"]["PaymentOptions"]>;
export type PaymentOptions = z.infer<typeof paymentOptionsSchema>;

export function usePaymentOptions(base: string, binding: string | null) {
  const portal = activePortal();
  const key = `${portal}:${base}:${binding ?? ""}`;
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    revision: number;
    data: PaymentOptions | null;
    error: boolean;
    requestedAt: number;
  } | null>(null);
  const [clock, setClock] = useState(() => performance.now());
  const reload = useCallback(() => {
    setRevision((v) => v + 1);
  }, []);
  useEffect(() => {
    if (!binding) return;
    let active = true;
    const requestedAt = performance.now();
    void get(base + "/payments/options", paymentOptionsSchema, portal)
      .then((data) => {
        if (active) {
          setResult({ key, revision, data, error: false, requestedAt });
          setClock(performance.now());
        }
      })
      .catch(() => {
        if (active)
          setResult({ key, revision, data: null, error: true, requestedAt });
      });
    return () => {
      active = false;
    };
  }, [base, binding, key, portal, revision]);
  useEffect(() => {
    if (!binding) return;
    const refresh = () => {
      if (!document.hidden && navigator.onLine) reload();
    };
    const timer = window.setInterval(() => {
      setClock(performance.now());
    }, 1000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [binding, reload]);
  const current =
    !!binding && result?.key === key && result.revision === revision;
  const data = current ? result.data : null;
  const now =
    data && result
      ? Date.parse(data.server_time) + Math.max(0, clock - result.requestedAt)
      : NaN;
  const expired = !!data?.routes.some(
    (v) =>
      v.status !== "unavailable" &&
      (!v.valid_until || Date.parse(v.valid_until) <= now),
  );
  useEffect(() => {
    if (!expired) return;
    const timer = window.setTimeout(reload, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [expired, reload]);
  return {
    data,
    loading: !!binding && !current,
    error: current && result.error,
    expired,
    reload,
  };
}

import { safeCheckout } from "./model";

/** Navigate only to the validated, fixed provider checkout origin. */
export function continueToProvider(href: string) {
  if (href && safeCheckout(href)) window.location.assign(href);
}

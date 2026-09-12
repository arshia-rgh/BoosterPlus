import { z } from "zod";
// Zod's eval capability probe itself triggers a CSP violation. Use its maintained
// interpreter path before constructing any browser schemas; strict CSP stays intact.
z.config({ jitless: true });
export { z };

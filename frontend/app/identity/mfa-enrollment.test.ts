import decodeQR from "qr/decode.js";
import { expect, it } from "vitest";
import {
  enrollmentSymbol,
  parseMFAEnrollment,
  authenticatorIssuer,
} from "./mfa-enrollment";

// Public, synthetic fixture: never a real enrollment key.
const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
function payload(account = "staff@example.test") {
  return {
    secret,
    url: `otpauth://totp/${encodeURIComponent(`PLAYORA Customer:${account}`)}?algorithm=SHA1&digits=6&issuer=PLAYORA%20Customer&period=30&secret=${secret}`,
  };
}

it("preserves the complete issuer/account URI without making a navigation target", () => {
  const input = payload("staff+security@example.test");
  expect(parseMFAEnrollment(input, "staff+security@example.test")).toEqual({
    ...input,
    issuer: "PLAYORA Customer",
    account: "staff+security@example.test",
  });
});

it.each([
  ["HTTPS URL", (url: string) => url.replace("otpauth:", "https:")],
  ["HOTP", (url: string) => url.replace("//totp/", "//hotp/")],
  [
    "foreign issuer",
    (url: string) => url.replace("issuer=PLAYORA", "issuer=OTHER"),
  ],
  ["foreign account", (url: string) => url.replace("staff", "other")],
  ["mismatched secret", (url: string) => url.replace(secret, "A".repeat(32))],
  ["duplicate secret", (url: string) => `${url}&secret=${secret}`],
  ["extra query", (url: string) => `${url}&redirect=https://example.test`],
  ["fragment", (url: string) => `${url}#fragment`],
  ["credentials", (url: string) => url.replace("//totp/", "//user:pass@totp/")],
  ["wrong digit count", (url: string) => url.replace("digits=6", "digits=8")],
  ["wrong algorithm", (url: string) => url.replace("SHA1", "SHA512")],
  ["wrong period", (url: string) => url.replace("period=30", "period=60")],
  ["malformed escape", (url: string) => url.replace("PLAYORA", "%ZZ")],
  ["oversize URI", (url: string) => url + "x".repeat(1536)],
])("rejects %s without echoing private material", (_name, change) => {
  const input = payload();
  expect(() =>
    parseMFAEnrollment(
      { ...input, url: change(input.url) },
      "staff@example.test",
    ),
  ).toThrow("Invalid authenticator setup response");
});

it("rejects malformed or empty secrets before invoking the encoder", () => {
  for (const invalid of ["", "not-base32", "A".repeat(129)])
    expect(() =>
      parseMFAEnrollment(
        { ...payload(), secret: invalid },
        "staff@example.test",
      ),
    ).toThrow("Invalid authenticator setup response");
});

it.each([
  "staff@example.test",
  `${"long".repeat(15)}+security@${"domain".repeat(30)}.test`,
])(
  "decodes rendered QR geometry back to the exact synthetic URI for %s",
  (account) => {
    const enrollment = parseMFAEnrollment(payload(account), account);
    const { path, size } = enrollmentSymbol(enrollment);
    const scale = 4;
    const width = size * scale;
    const data = new Uint8ClampedArray(width * width * 4).fill(255);
    // Rasterize the exact integer rectangles used by the SVG, then ask the
    // decoder to recover the full URI (a roundtrip, not an encoder snapshot).
    for (const match of path.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
      const x = Number(match[1]);
      const y = Number(match[2]);
      expect(x).toBeGreaterThanOrEqual(4);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(x).toBeLessThan(size - 4);
      expect(y).toBeLessThan(size - 4);
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const offset = ((y * scale + dy) * width + x * scale + dx) * 4;
          data.fill(0, offset, offset + 3);
        }
      }
    }
    expect(decodeQR({ width, height: width, data })).toBe(enrollment.url);
  },
);

it.each(["customer", "admin", "booster"] as const)(
  "binds the %s issuer to the exact authenticated workspace",
  (portal) => {
    const issuer = authenticatorIssuer(portal);
    const url = `otpauth://totp/${encodeURIComponent(`${issuer}:same@example.test`)}?algorithm=SHA1&digits=6&issuer=${encodeURIComponent(issuer)}&period=30&secret=${secret}`;
    expect(
      parseMFAEnrollment({ secret, url }, "same@example.test", portal).issuer,
    ).toBe(issuer);
    const other = portal === "admin" ? "customer" : "admin";
    expect(() =>
      parseMFAEnrollment({ secret, url }, "same@example.test", other),
    ).toThrow("Invalid authenticator setup response");
  },
);

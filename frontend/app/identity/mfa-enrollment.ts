import encodeQR from "qr";
import type { Portal } from "./portal";

export function authenticatorIssuer(portal: Portal): string {
  return `PLAYORA ${portal === "admin" ? "Admin" : portal === "booster" ? "Booster" : "Customer"}`;
}

export interface MFAEnrollment {
  secret: string;
  url: string;
  issuer: string;
  account: string;
}

/** Validate the authenticated API payload before encoding its exact URI locally. */
export function parseMFAEnrollment(
  result: { secret: string; url: string },
  expectedAccount: string,
  portal: Portal = "customer",
): MFAEnrollment {
  const issuer = authenticatorIssuer(portal);
  const invalid = () => new Error("Invalid authenticator setup response");
  if (result.url.length > 1536 || !/^[A-Z2-7]{32,128}$/.test(result.secret))
    throw invalid();
  let uri: URL;
  let label: string;
  try {
    uri = new URL(result.url);
    label = decodeURIComponent(uri.pathname.slice(1));
  } catch {
    throw invalid();
  }
  const expected = new Map([
    ["issuer", issuer],
    ["secret", result.secret],
    ["digits", "6"],
    ["period", "30"],
    ["algorithm", "SHA1"],
  ]);
  if (
    uri.protocol !== "otpauth:" ||
    uri.hostname !== "totp" ||
    uri.username ||
    uri.password ||
    uri.port ||
    uri.hash ||
    label !== `${issuer}:${expectedAccount}` ||
    uri.searchParams.size !== expected.size ||
    [...expected].some(([name, value]) => uri.searchParams.get(name) !== value)
  )
    throw invalid();
  return {
    secret: result.secret,
    url: result.url,
    issuer,
    account: expectedAccount,
  };
}

/** Four quiet-zone modules and medium correction, without images or external URLs. */
export function enrollmentSymbol(enrollment: MFAEnrollment) {
  const matrix = encodeQR(enrollment.url, "raw", {
    ecc: "medium",
    border: 4,
  });
  const path = matrix
    .flatMap((row, y) =>
      row.map((dark, x) => (dark ? `M${String(x)} ${String(y)}h1v1h-1z` : "")),
    )
    .join("");
  return { size: matrix.length, path };
}

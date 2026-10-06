import {
  contentSchema,
  defaultHome,
  homeSchema,
  legalSchema,
  type PolicySection,
} from "./model";
import { readablePolicyText } from "./policy-layout.server";
export async function loadContent(kind: string) {
  const response = await fetch(
    new URL(
      "/api/v1/site/" + kind,
      process.env.API_ORIGIN ?? "http://127.0.0.1:8080",
    ),
    { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) throw new Error("Published content unavailable");
  return contentSchema.parse(await response.json());
}
export async function loadHome() {
  try {
    const content = await loadContent("home");
    return content.release_id ? homeSchema.parse(content.data) : defaultHome;
  } catch {
    return defaultHome;
  }
}
const previewText =
  "This environment is for testing PLAYORA accounts. Do not provide real game credentials or payment information. Public launch requires operator-approved account terms and privacy information.";
export async function loadTerms(versionLabel = "") {
  if (versionLabel && !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(versionLabel))
    throw new Error("Invalid legal version");
  if (versionLabel && versionLabel === process.env.TERMS_VERSION)
    return bootstrapTerms();
  const content = await loadContent(
    versionLabel
      ? "legal/versions/" + encodeURIComponent(versionLabel)
      : "legal",
  );
  if (content.release_id) {
    const text = content.data.text;
    if (typeof text !== "string" || !text.trim())
      throw new Error("Account terms unavailable");
    const sections = legalSchema.parse(content.data).sections ?? [];
    return {
      text: readablePolicyText(text),
      sections,
      preview: false,
      version: content.label,
    };
  }
  return bootstrapTerms();
}
function bootstrapTerms() {
  const text = process.env.ACCOUNT_TERMS_TEXT?.trim(),
    version = process.env.TERMS_VERSION ?? "development-preview-v1";
  const local = ["development", "test"].includes(
    process.env.APP_ENV ?? "development",
  );
  if (!local && (!text || version.startsWith("development-")))
    throw new Error("Account terms unavailable");
  return {
    text: readablePolicyText(text || previewText),
    sections: [] as PolicySection[],
    preview: !text,
    version,
  };
}

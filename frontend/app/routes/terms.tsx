const previewText =
  "This environment is for testing Booster Plus accounts. Do not provide real game credentials or payment information. Purchases and public service terms are not available yet.\n\nTest accounts use a verified email or Google identity. Staff require an authenticator at each sign-in. Security notifications are mandatory.\n\nPublic launch requires approved account terms and privacy information from the operator. This preview text must be replaced before public registration opens.";
export function loader() {
  const text = process.env.ACCOUNT_TERMS_TEXT?.trim();
  const version = process.env.TERMS_VERSION ?? "development-preview-v1";
  const local = ["development", "test"].includes(
    process.env.APP_ENV ?? "development",
  );
  if (!local && (!text || version.startsWith("development-")))
    throw new Error("Account terms unavailable");
  return { text: text || previewText, preview: !text, version };
}
export default function Terms({
  loaderData,
}: {
  loaderData: ReturnType<typeof loader>;
}) {
  return (
    <main id="main" className="page">
      <title>Account terms | Booster Plus</title>
      <h1>
        {loaderData.preview
          ? "Development preview account terms"
          : "Account terms and privacy"}
      </h1>
      <p>Version: {loaderData.version}</p>
      <div className="legal-text">{loaderData.text}</div>
    </main>
  );
}

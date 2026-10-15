import { z } from "../../validation";
import { useResource } from "../../orders/resource";
import { SecretReveal } from "../../resale/secret";
const schema = z.object({
  links: z.array(
    z.object({
      label: z.string(),
      path: z
        .string()
        .regex(
          /^\/(?:admin\/seller-offers|account-orders|(?:admin|booster)\/fulfillment)\/[a-zA-Z0-9-]+\/secret\/reveal$/,
        ),
    }),
  ),
});
export function LegacyChatAccess({ base }: { base: string }) {
  const resource = useResource(base + "/forms/legacy", schema);
  if (resource.error || !resource.data?.links.length) return null;
  return (
    <details className="chat-legacy-access">
      <summary>Previously shared access</summary>
      {resource.data.links.map((link) => (
        <section key={link.path}>
          <h3>{link.label}</h3>
          <SecretReveal path={link.path} />
        </section>
      ))}
    </details>
  );
}

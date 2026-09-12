import { useState } from "react";
import { Link } from "react-router";
import { Form, Text, value } from "../identity/identity";
import { post } from "../identity/api";
import { listingSchema as gamesSchema } from "../catalog/model";
import { useResource } from "../orders/resource";
import { consentVersion, subscriptionSchema } from "./model";

export default function AccountAlerts({
  slug = "",
  listingID = "",
}: {
  slug?: string;
  listingID?: string;
}) {
  const games = useResource("/games", gamesSchema),
    [saved, setSaved] = useState(false);
  return (
    <section className="catalog-section">
      <h2>Account availability alerts</h2>
      <p>
        Receive email for new matching inventory or renewed availability. Alerts
        reserve neither accounts nor prices. Existing available listings do not
        trigger an immediate email.
      </p>
      {saved ? (
        <p role="status">
          Account alert saved.{" "}
          <Link to="/availability">Manage your alerts</Link>
        </p>
      ) : (
        <Form
          title="Follow account availability"
          label="Save account alert"
          submit={async (data) => {
            const amount = value(data, "amount");
            const [units, fraction = "", ...extra] = amount.split(".");
            if (
              amount &&
              (extra.length > 0 ||
                !/^\d{1,10}$/.test(units ?? "") ||
                (fraction !== "" && !/^\d{1,2}$/.test(fraction)))
            )
              throw new Error("Use a price with up to two decimal places.");
            const minor = amount
              ? Number(units) * 100 + Number(fraction.padEnd(2, "0"))
              : 0;
            await post(
              "/availability",
              {
                slug: slug || value(data, "game"),
                package: "",
                variant: "",
                account: {
                  listing_id: listingID,
                  region: value(data, "region"),
                  rank: value(data, "rank"),
                  currency: value(data, "currency").toUpperCase(),
                  max_amount_minor: minor,
                },
                accept: data.get("consent") === "on",
                consent_version: consentVersion,
              },
              subscriptionSchema,
            );
            setSaved(true);
          }}
        >
          {!slug && (
            <label>
              Game
              <select name="game" required defaultValue="">
                <option value="" disabled>
                  Select a game
                </option>
                {games.data?.games
                  .filter((g) => g.published && !g.archived)
                  .map((g) => (
                    <option key={g.id} value={g.slug}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {!listingID && (
            <>
              <Text
                name="region"
                label="Region (optional exact match)"
                required={false}
                maxLength={80}
              />
              <Text
                name="rank"
                label="Rank (optional exact match)"
                required={false}
                maxLength={80}
              />
              <Text
                name="currency"
                label="Price currency (optional, for example USD)"
                required={false}
                maxLength={3}
              />
              <Text
                name="amount"
                label="Maximum price (optional, requires currency)"
                required={false}
                maxLength={13}
              />
            </>
          )}
          <label className="check">
            <input type="checkbox" name="consent" required />
            Email me about matching account availability. I can unsubscribe at
            any time.
          </label>
        </Form>
      )}
    </section>
  );
}

import { useLoaderData } from "react-router";
import { AccountMarket, AccountProduct } from "../resale/market";
import type { Release } from "./model";
import { serviceAvailable } from "./public-discovery";
export function GameAccounts({ detail = false }: { detail?: boolean }) {
  const release = useLoaderData<Release>();
  return (
    <section className="game-panel">
      {serviceAvailable(release, "accounts") ? (
        detail ? (
          <AccountProduct gameSlug={release.slug} />
        ) : (
          <AccountMarket gameSlug={release.slug} />
        )
      ) : (
        <>
          <h2>Accounts are currently unavailable</h2>
          <p>
            This game is not accepting new account purchases. Existing purchases
            remain available in My account.
          </p>
        </>
      )}
    </section>
  );
}

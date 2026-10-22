import { useState } from "react";
import { Action, Check, Text } from "../catalog/controls";
import type { Policy } from "./model";
import {
  knownRoute,
  manualPayoutNetwork,
  maximumRoutes,
  paymentRoutes,
  routeGroups,
  routeMatches,
} from "./routes";

export default function PolicyRoutes({
  routes,
  change,
}: {
  routes: Policy["routes"];
  change: (routes: Policy["routes"]) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const selected = (choice: Policy["routes"][number]) =>
    routes.some(
      (route) => route.code === choice.code && route.network === choice.network,
    );
  const collision = (choice: Policy["routes"][number]) =>
    routes.some(
      (route) => route.code === choice.code && route.network !== choice.network,
    );
  const visible = paymentRoutes.filter(
    (route) =>
      manualPayoutNetwork(route.network) &&
      routeMatches(route, search) &&
      (!selectedOnly || selected(route)),
  );
  const legacy = routes.filter(
    (route) =>
      !knownRoute(route.code, route.network) ||
      !manualPayoutNetwork(route.network),
  );
  return (
    <fieldset className="payment-route-editor">
      <legend>Seller payout assets and networks</legend>
      <p>
        Choose the networks staff can use for manual seller payouts. These
        choices do not limit customer checkout coins. Existing agreements keep
        their original asset and network.
      </p>
      <Text
        name="routes"
        label="Find a coin or network"
        value={search}
        change={setSearch}
      />
      <div className="payment-route-toolbar">
        <Check
          label="Selected only"
          value={selectedOnly}
          change={setSelectedOnly}
        />
        <p role="status">
          {routes.length} selected · {visible.length} shown
        </p>
      </div>
      <div
        className="payment-route-scroll"
        role="region"
        aria-label="Seller payout assets and networks list"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The named bounded list needs keyboard scrolling independently of checkbox selection.
        tabIndex={0}
      >
        {routeGroups.map((group) => {
          const options = visible.filter((route) => route.group === group);
          return options.length ? (
            <section
              key={group}
              className="payment-route-group"
              aria-label={group}
            >
              <h3>{group}</h3>
              <div className="payment-choice-list">
                {options.map((route) => (
                  <label
                    className="payment-choice"
                    key={route.code}
                    data-selected={selected(route)}
                    data-disabled={collision(route)}
                  >
                    <input
                      type="checkbox"
                      checked={selected(route)}
                      disabled={
                        collision(route) ||
                        (!selected(route) && routes.length >= maximumRoutes)
                      }
                      onChange={(event) => {
                        if (
                          collision(route) ||
                          (!selected(route) && routes.length >= maximumRoutes)
                        )
                          return;
                        change(
                          event.target.checked
                            ? [
                                ...routes,
                                {
                                  code: route.code,
                                  label: route.label,
                                  network: route.network,
                                },
                              ]
                            : routes.filter(
                                (value) =>
                                  value.code !== route.code ||
                                  value.network !== route.network,
                              ),
                        );
                      }}
                      aria-label={route.label}
                      aria-describedby={
                        collision(route)
                          ? `review-route-${route.code}`
                          : undefined
                      }
                    />
                    <span>
                      <strong>{route.symbol}</strong>
                      <span className="payment-choice-network">
                        {route.network_label}
                      </span>
                      <small>Asset code: {route.code}</small>
                      {collision(route) && (
                        <small id={`review-route-${route.code}`}>
                          Review the saved option below.
                        </small>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ) : null;
        })}
        {!visible.length && <p>No matching coin or network.</p>}
      </div>
      {search && (
        <Action
          variant="secondary"
          onClick={() => {
            setSearch("");
          }}
        >
          Clear search
        </Action>
      )}
      {!!legacy.length && (
        <section aria-label="Saved options needing review">
          <h3>Saved options needing review</h3>
          <p>
            Review these saved options. Remove one and choose its replacement
            from the list if needed.
          </p>
          {legacy.map((route) => (
            <div key={route.code} className="payment-route-legacy">
              <p>
                {route.label} · {route.network} · {route.code}
              </p>
              <Action
                variant="secondary"
                onClick={() => {
                  change(
                    routes.filter(
                      (value) =>
                        value.code !== route.code ||
                        value.network !== route.network,
                    ),
                  );
                }}
              >
                Remove {route.label}
              </Action>
            </div>
          ))}
        </section>
      )}
    </fieldset>
  );
}

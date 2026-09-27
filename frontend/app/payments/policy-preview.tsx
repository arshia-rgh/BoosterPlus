import { remedyLabels, remedyText, type Policy } from "./model";
export default function PolicyPreview({ policy }: { policy: Policy }) {
  const remedies = policy.remedies;
  return (
    <div className="payment-policy-preview">
      <h4>{policy.label}</h4>
      <p className="payment-policy">{policy.text}</p>
      <dl className="account-attributes">
        <div>
          <dt>Order currencies</dt>
          <dd>{policy.currencies.join(", ")}</dd>
        </div>
        <div>
          <dt>Processing fees paid by</dt>
          <dd>
            {policy.fee_mode === "merchant"
              ? "PLAYORA"
              : policy.fee_mode === "customer"
                ? "Customer"
                : "Not set"}
          </dd>
        </div>
        <div>
          <dt>Exchange rate</dt>
          <dd>{policy.rate_mode || "Not set"}</dd>
        </div>
        <div>
          <dt>Local checkout window</dt>
          <dd>{policy.window_minutes} minutes</dd>
        </div>
      </dl>
      <h4>Supported assets and networks</h4>
      <ul>
        {policy.routes.map((route) => (
          <li key={route.code}>
            {route.label} · {route.code} · Network {route.network}
          </li>
        ))}
      </ul>
      {remedies && (
        <>
          <h4>Service remedies and appeal terms</h4>
          <dl>
            {remedyLabels.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd className="payment-policy">{remedyText(remedies, key)}</dd>
              </div>
            ))}
          </dl>
          <p>
            Dispute window: {remedies.dispute_hours} hours. Appeal window:{" "}
            {remedies.appeal_hours} hours. Maximum appeals:{" "}
            {remedies.max_appeals}.
          </p>
        </>
      )}
    </div>
  );
}

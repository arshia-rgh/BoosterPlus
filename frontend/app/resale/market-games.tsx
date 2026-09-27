import { useEffect, useState } from "react";
import { Action, ErrorNotice, Select } from "../catalog/controls";
import { get } from "../identity/api";
import { z } from "../validation";

const schema = z.object({
  games: z.array(z.object({ slug: z.string(), name: z.string() })),
  next: z.string(),
});
type Game = z.infer<typeof schema>["games"][number];

export default function MarketGames({
  value,
  change,
}: {
  value: string;
  change: (slug: string) => void;
}) {
  const [games, setGames] = useState<Game[]>([]);
  const [after, setAfter] = useState("");
  const [next, setNext] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let active = true;
    void get(`/accounts/games?after=${encodeURIComponent(after)}`, schema)
      .then((result) => {
        if (!active) return;
        setGames((current) => [
          ...new Map(
            [...current, ...result.games].map((game) => [game.slug, game]),
          ).values(),
        ]);
        setNext(result.next);
        setError(null);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [after, revision]);
  return (
    <div className="market-game-filter">
      <Select
        label="Game"
        value={value}
        change={change}
        options={[
          ["", "All games"],
          ...(value && !games.some((game) => game.slug === value)
            ? [[value, `Selected game: ${value}`] as const]
            : []),
          ...games.map((game) => [game.slug, game.name] as const),
        ]}
      />
      {loading && <p role="status">Loading games with available accounts…</p>}
      <ErrorNotice error={error} />
      {!!error && (
        <Action
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setRevision((v) => v + 1);
          }}
        >
          Retry game choices
        </Action>
      )}
      {!error && next && (
        <Action
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setAfter(next);
          }}
        >
          More game choices
        </Action>
      )}
    </div>
  );
}

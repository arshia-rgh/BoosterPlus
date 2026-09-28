import { expect, it } from "vitest";
import { gameMetadata } from "./metadata";
import { releaseSchema, emptyConfiguration } from "./model";
it("uses only configured canonical origin and published game metadata", () => {
  const data = {
    ...releaseSchema.parse({
      id: "release",
      game_id: "game",
      slug: "game",
      version: 1,
      paused: false,
      created_at: "2026-09-28T00:00:00Z",
      configuration: emptyConfiguration("Game"),
    }),
    public_origin: "https://example.test",
  };
  expect(gameMetadata({ data })).toContainEqual({
    tagName: "link",
    rel: "canonical",
    href: "https://example.test/games/game",
  });
  expect(
    gameMetadata({ data: { ...data, public_origin: null } }).some(
      (v) => "rel" in v,
    ),
  ).toBe(false);
  expect(gameMetadata()).toContainEqual({ name: "robots", content: "noindex" });
});

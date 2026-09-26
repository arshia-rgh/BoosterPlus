// These local derivatives preserve the accepted atlas artwork. Publication rights
// remain a final-launch checkpoint; a catalog release must explicitly select one.
const games = ["mlbb", "wow", "lol", "valorant", "dota", "wildrift"] as const;
export function cardArtwork(source: string) {
  return games.some(
    (game) =>
      source ===
      `/catalog-assets/game-${game}-1536.${game === "valorant" ? "png" : "jpg"}`,
  )
    ? source.replace("-1536.", "-640.")
    : source;
}

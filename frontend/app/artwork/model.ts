import { z } from "../validation";
export type Purpose = "game" | "cover" | "product" | "inline";
export const uploadSchema = z.object({
  id: z.uuid(),
  asset: z.string(),
  purpose: z.enum(["game", "cover", "product", "inline"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  focus_x: z.number(),
  focus_y: z.number(),
  variants: z.record(
    z.string(),
    z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      size: z.number().int().positive(),
      content_type: z.string(),
      checksum: z.string(),
    }),
  ),
});
export type Uploaded = z.infer<typeof uploadSchema>;
const pattern =
  /^\/api\/v1\/artwork\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/wide$/;
export function uploadedArtwork(source: string) {
  return pattern.test(source);
}
export function validArtwork(source: string) {
  return (
    uploadedArtwork(source) ||
    /^\/catalog-assets\/[a-z0-9][a-z0-9_-]{0,79}\.(png|jpg|webp|avif|svg)$/.test(
      source,
    )
  );
}
export function rendition(
  source: string,
  variant: "wide" | "wide-small" | "mobile" | "mobile-small" | "card" | "thumb",
  preview = false,
) {
  const id = pattern.exec(source)?.[1];
  return id
    ? `/api/v1/${preview ? "admin/" : ""}artwork/${id}/${variant}`
    : source;
}
export const guidance: Record<
  Purpose,
  { label: string; recommendation: string; details: string }
> = {
  game: {
    label: "Game artwork",
    recommendation:
      "Recommended: 1920 × 1080 px or larger, with room around the main character.",
    details:
      "We prepare a wide hero, a phone crop, game cards and smaller backgrounds. Keep text and logos away from the edges.",
  },
  cover: {
    label: "Article cover",
    recommendation: "Recommended: 1600 × 900 px (16:9).",
    details:
      "We prepare wide article covers and compact news cards. Choose the focal point to keep the subject visible.",
  },
  product: {
    label: "Product artwork",
    recommendation: "Recommended: 1600 × 1600 px (square).",
    details:
      "We keep the full image and prepare smaller product and card versions. Product names, quantities and details will not be cropped out.",
  },
  inline: {
    label: "Article image",
    recommendation: "Recommended: 1600 px on the longest edge.",
    details:
      "We preserve the full image and its proportions. Screenshots, charts and instructions are never automatically cropped.",
  },
};
export function defaultGameArtwork(slug: string): string | undefined {
  const map: Record<string, string> = {
    "mobile-legends": "mlbb",
    "world-of-warcraft": "wow",
    "league-of-legends": "lol",
    valorant: "valorant",
    "dota-2": "dota",
    "wild-rift": "wildrift",
  };
  const game = Object.entries(map).find(([key]) => key === slug)?.[1];
  return game
    ? `/catalog-assets/game-${game}-1536.${game === "valorant" ? "png" : "jpg"}`
    : undefined;
}

export function defaultGameLayout(slug: string) {
  const layouts = new Map<string, readonly [number, number, "left" | "right"]>([
    ["mobile-legends", [75, 85, "left"]],
    ["world-of-warcraft", [18, 5, "right"]],
    ["league-of-legends", [65, 65, "left"]],
    ["valorant", [57, 57, "left"]],
    ["dota-2", [53, 53, "left"]],
    ["wild-rift", [67, 67, "left"]],
  ]);
  const value = layouts.get(slug);
  return value
    ? {
        desktop_x: value[0],
        desktop_y: 20,
        mobile_x: value[1],
        mobile_y: 20,
        copy_side: value[2],
      }
    : undefined;
}

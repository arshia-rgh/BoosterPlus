import { z } from "../validation";
export const kinds = [
  ["update", "Updates"],
  ["patch", "Patch notes"],
  ["guide", "Guides"],
] as const;
export const blockKinds = [
  "paragraph",
  "heading",
  "quote",
  "code",
  "link",
  "image",
  "gallery",
  "list",
  "table",
] as const;
export const blockSchema = z.object({
  kind: z.enum(blockKinds),
  text: z.string(),
  level: z.number().int(),
  url: z.string(),
  alt: z.string(),
  source: z.string(),
  items: z.array(z.string()).nullable(),
  headers: z.array(z.string()).nullable(),
  rows: z.array(z.array(z.string())).nullable(),
  images: z
    .array(
      z.object({
        url: z.string(),
        alt: z.string(),
        source: z.string(),
        caption: z.string(),
      }),
    )
    .optional(),
});
export const definitionSchema = z.object({
  title: z.string(),
  slug: z.string(),
  kind: z.enum(["update", "patch", "guide"]),
  summary: z.string(),
  author: z.string(),
  source: z.string(),
  source_url: z.string(),
  game_version: z.string(),
  asset: z.string(),
  asset_alt: z.string(),
  asset_source: z.string(),
  reviewed: z.boolean(),
  blocks: z.array(blockSchema),
});
export const draftSchema = z.object({
  game_name: z.string(),
  schedule_state: z.string(),
  id: z.string(),
  game_id: z.string(),
  version: z.number().int(),
  state: z.string(),
  revision_id: z.string(),
  current_revision: z.string(),
  scheduled_revision: z.string(),
  scheduled_at: z.string().nullable(),
  published_at: z.string().nullable(),
  updated_at: z.string(),
  definition: definitionSchema,
});
export const listSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      game_id: z.string(),
      game_name: z.string(),
      title: z.string(),
      kind: z.string(),
      author: z.string(),
      state: z.string(),
      version: z.number().int(),
      updated_at: z.string(),
      scheduled_at: z.string().nullable(),
    }),
  ),
  next: z.string(),
});
export const publicSchema = z.object({
  id: z.string(),
  game_slug: z.string(),
  revision_id: z.string(),
  definition: definitionSchema,
  published_at: z.string(),
  updated_at: z.string(),
  redirect: z.boolean(),
});
export const publicPageSchema = z.object({
  items: z.array(publicSchema),
  next: z.string(),
});
export const issueSchema = z.object({ path: z.string(), message: z.string() });
export const previewSchema = z.object({
  definition: definitionSchema,
  issues: z.array(issueSchema),
});
export const historySchema = z.object({
  items: z.array(
    z.object({
      version: z.number().int(),
      action: z.string(),
      revision_id: z.string(),
      at: z.string(),
    }),
  ),
  next: z.number().int(),
});
export type Definition = z.infer<typeof definitionSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Draft = z.infer<typeof draftSchema>;
export const emptyDefinition: Definition = {
  title: "",
  slug: "",
  kind: "guide",
  summary: "",
  author: "",
  source: "",
  source_url: "",
  game_version: "",
  asset: "",
  asset_alt: "",
  asset_source: "",
  reviewed: false,
  blocks: [],
};
export function emptyBlock(kind: Block["kind"]): Block {
  return {
    kind,
    text: "",
    level: kind === "heading" ? 2 : 0,
    url: "",
    alt: "",
    source: "",
    items: [],
    headers: [],
    rows: [],
    ...(kind === "gallery"
      ? { images: [{ url: "", alt: "", source: "", caption: "" }] }
      : {}),
  };
}
export function articlePath(game: string, slug: string) {
  return `/games/${encodeURIComponent(game)}/news/${encodeURIComponent(slug)}`;
}
export function safeLink(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !/[\r\n\t\\]/.test(value)
    );
  } catch {
    return false;
  }
}

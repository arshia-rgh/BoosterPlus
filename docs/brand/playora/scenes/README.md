# Fighting-spirit environments

These original environment paintings were generated with the built-in image-generation tool for the approved multi-game showcase. They contain no character artwork; existing character masters are separate. They are thematic environments, not extracted game screenshots.

| Master | Public derivative | Bytes | Direction |
| --- | --- | ---: | --- |
| `miya-woodland.png` | `frontend/public/scenes/miya.jpg` | 121709 | Moonlit woodland, ancient trees, elven ruin arch and mossy path |
| `illidan-temple.png` | `frontend/public/scenes/illidan.jpg` | 95128 | Ruined basalt temple, broken arches, distant fortress and subdued fel-green sky/cracks |
| `ahri-spirit-grove.png` | `frontend/public/scenes/ahri.jpg` | 104946 | Jade forest shrine, torii, pond, mist and pale blossoms |

Prompt direction used for all three: cinematic realistic fantasy painting in green/charcoal; left 45% dark, low-detail negative space for website copy; right 55% a dark clearing for a separately composited character; environmental detail on edges and in the distance. No characters, text, logos or UI. Avoid neon and a bright central light source. Each generation used the game-specific environment direction above. This is a prompt summary, not a verbatim generation transcript.

The inspected PNG masters are 1536 × 1024. Derivatives are 1024 × 683 JPEG, produced with macOS `sips`:

```sh
sips -Z 1024 -s format jpeg -s formatOptions 64 docs/brand/playora/scenes/miya-woodland.png --out frontend/public/scenes/miya.jpg
sips -Z 1024 -s format jpeg -s formatOptions 64 docs/brand/playora/scenes/illidan-temple.png --out frontend/public/scenes/illidan.jpg
sips -Z 1024 -s format jpeg -s formatOptions 64 docs/brand/playora/scenes/ahri-spirit-grove.png --out frontend/public/scenes/ahri.jpg
```

Keep each background below 125,000 bytes. Review the combined character/background at desktop and phone sizes; the runtime darkens the artwork for readable copy. Do not replace the accepted homepage hero or social artwork with these automatically.

# Approved MLBB service scenes

The owner accepted the four IMMERSIVE187 preview pictures and their framing on 24 October 2026. This implementation reuses them without repainting or replacing subjects. The built-in image generation prompts and source files are recorded in `docs/ux/previews/immersive-services-2026-10-23/artwork-prompts.json`; those originals remain unchanged.

Production files: `frontend/public/artwork/mlbb-services/{boost,accounts,shop,news}-v1-{480,960}.jpg`. They are proportional 480/960px JPEG derivatives (quality78), encoded from the approved preview assets with sips. No crop, recoloring or compositing. Responsive scene images retain the approved narrow-card feathering, with a small blurred copy behind them to extend the image to the full card edge. All artwork is decorative alongside equivalent text and lazy-loaded below the game introduction. Other games retain their own published artwork. These are generated illustrations, not official screenshots or endorsement claims.

Four 960px files total approximately1.03MiB; four480px files approximately313KiB. Immutable paths permit normal asset caching. A high-density phone may select960px for clarity. Failed images retain the complete service name, description, availability and link against a dark green fallback.

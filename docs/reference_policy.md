# Reference Policy

The Gurrimming_ref workflow uses local images only as visual abstraction references. Reference images should guide general elements such as background type, pose logic, outfit silhouette, prop interaction, lighting style, makeup and hair direction, and mood.

Do not directly copy, trace, recreate, or republish a Pinterest image or other third-party image. Do not store copyrighted images in this repository. Local reference images belong under `reference_library/` and are ignored by Git.

Do not generate prompts that imitate a specific living artist, photographer, influencer, model, brand campaign, or named commercial shoot. Use generic, reusable visual language instead.

Preferred language examples:

- `soft high-key studio lighting`
- `oversized knit silhouette`
- `relaxed standing pose`
- `small handheld camera prop`
- `clean pure white cyclorama studio`

Avoid direct-copy language:

- `same as this Pinterest image`
- `copy this campaign`
- `in the style of [living artist or photographer]`
- `make this exact influencer photo`

Reviewed JSON assets in `reference_data/*.json` should contain only abstract descriptions and prompt fragments. Draft files in `reference_data/drafts/` may contain `TODO` placeholders until manually reviewed.

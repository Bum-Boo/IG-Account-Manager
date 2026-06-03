# Gurrimming_ref Workflow

This workflow creates repeatable Z-Image Turbo prompt packages from local abstract reference assets. It is intentionally file-based so a future plugin can load the same JSON contracts without depending on a UI.

## Add Local Reference Images

Place local images under the matching folder in `reference_library/`.

```text
reference_library/backgrounds/white_studio/
reference_library/outfits/soft_casual/
reference_library/props/camera/
reference_library/poses/standing/
reference_library/lighting/softbox/
reference_library/makeup_hair/natural/
reference_library/mood/calm/
```

Images in `reference_library/` are ignored by Git. Do not commit copyrighted images or third-party image files.

## Create Draft JSON

Run the draft analyzer against one folder:

```bash
python scripts/analyze_reference_images.py --category backgrounds --input reference_library/backgrounds/white_studio --output reference_data/drafts/backgrounds_draft.json
```

The analyzer only records filenames and placeholder fields. It does not copy, move, embed, or analyze image pixels.

## Review And Promote

Open the draft JSON in `reference_data/drafts/`, replace `TODO` fields with abstract descriptions, and manually copy reviewed items into the matching final file:

```text
reference_data/backgrounds.json
reference_data/outfits.json
reference_data/props.json
reference_data/poses.json
reference_data/lighting.json
reference_data/makeup_hair.json
reference_data/mood.json
```

Final reviewed JSON must not contain `TODO`, direct-copy language, artist names, photographer names, influencer names, brand campaign names, or real source URLs from Pinterest.

## Generate Prompt Packages

Use the included sample recipe:

```bash
python -m src.prompt_engine.generate --recipe reference_data/prompt_recipes/gurrimming_white_studio_example.json
```

The output JSON is ComfyUI-friendly and includes:

- `z_image_turbo_prompt`
- `z_image_turbo_compact_prompt`
- `recommended_aspect_ratio`
- `recommended_use`

The output TXT is Instagram-friendly and includes caption, pinned comment prompt, hashtags, and alt text.

## Use With ComfyUI Z-Image Turbo

Copy `z_image_turbo_prompt` or `z_image_turbo_compact_prompt` into the positive prompt field of the local Z-Image Turbo workflow. Use the recommended vertical aspect ratio for full-body white studio fashion pose references.

This v1 workflow does not install a ComfyUI custom node. Node integration is a future extension after the JSON contract and CLI output are stable.

## New Account Concepts

Create a new recipe in `reference_data/prompt_recipes/` with a new `account_concept`, `base_style`, selected asset IDs, and output targets. Reuse the same JSON output contract so future plugins can load packages consistently.

## Release Checklist

- Run `python scripts/validate_json.py`.
- Run `python -m unittest discover -s tests`.
- Generate a sample output package.
- Confirm no local images are committed.
- Confirm final JSON has no `TODO` values.
- Confirm output has exactly five hashtags.
- Confirm compact prompt is under 800 characters.

## Roadmap

- ComfyUI custom node integration.
- Vision model integration for automatic abstract reference analysis.
- Manual review UI for draft promotion.
- Account-specific prompt recipes.
- Batch generation mode.
- Instagram scheduling/export support.
- Local folder watcher.

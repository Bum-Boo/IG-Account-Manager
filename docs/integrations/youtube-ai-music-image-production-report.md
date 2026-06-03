# YouTube AI Music Image Production Report

Date recorded: 2026-06-03 KST

## Purpose

This report is the source-of-truth playbook for future YouTube AI music background image generation in this project.

The goal is not to make isolated pretty images. The goal is to build repeatable, channel-consistent visual assets that can sit behind 1 to 6 hour music videos without distracting viewers.

## Current State

Final accepted images are stored under:

```text
C:/Users/Hojun/Documents/hojun_google_drive/youtube_ai_music_images
```

Current accepted total:

- 10 theme folders.
- 10 accepted images per theme.
- 100 accepted images total.
- All accepted images are 16:9 landscape backgrounds.

Theme folders:

```text
01_animal_plush/
02_animal_2d_character/
03_campfire/
04_kodoromo/
05_cafe/
06_university_library/
07_magic_library/
08_racing/
09_teto_nam/
10_classical_orchestra_stage/
```

Repo-side metadata, contact sheets, scripts, and rejected candidates are stored under:

```text
outputs/workflows/
outputs/generated_images/youtube_ai_music_contact_sheets/
outputs/generated_images/rejected/
scripts/
```

## Production Batches Completed

### Batch 1: Initial Theme Coverage

- Batch ID: `20260603_082206`
- Output: 10 themes x 6 images = 60 accepted images.
- Metadata: `outputs/workflows/20260603_082206_youtube_ai_music_10themes_60images.meta.json`
- Template workflow: `outputs/workflows/20260603_082206_youtube_ai_music_zimage_template.api.json`
- Final clean index: `outputs/workflows/20260603_final_clean_youtube_ai_music_10themes_60images.index.json`
- Final clean contact sheet: `outputs/generated_images/youtube_ai_music_contact_sheets/20260603_final_clean_all_10themes_60images_sheet.png`

Important cleanup:

- Rejected racing images with car decals, fake sponsor text, numbers, billboards, or signage.
- Rejected one `teto_nam` image with visible windshield text.
- Replaced rejected images with cleaner unbranded racing still-life, dark vehicle, and silhouette compositions.

### Batch 2: Large Concept Variation

- Batch ID: `20260603_090912`
- Output: 10 themes x 2 concept sets x 2 images = 40 accepted images.
- Metadata: `outputs/workflows/20260603_090912_youtube_ai_music_variation_10themes_40images.meta.json`
- Final clean index: `outputs/workflows/20260603_final_variation_clean_10themes_40images.index.json`
- Final clean contact sheet: `outputs/generated_images/youtube_ai_music_contact_sheets/20260603_final_variation_clean_10themes_40images_sheet.png`

Important cleanup:

- Rejected university library images that produced crest, seal, shield, or emblem-like wall decorations.
- Replaced them with safer modern library and archive scenes that reduce wall-decoration risk.

## Local Generation Environment

Use local ComfyUI in the background. Do not open the ComfyUI browser UI unless the user explicitly requests it.

```text
ComfyUI location:
C:/Users/Hojun/Documents/comfy ui

Startup file:
C:/Users/Hojun/Documents/comfy ui/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable/run_nvidia_gpu.bat

API:
http://127.0.0.1:8188

Primary model:
z_image_turbo_nvfp4.safetensors

Text encoder:
qwen_3_4b_fp4_mixed.safetensors

VAE:
ae.safetensors
```

Default generation settings used so far:

```text
width: 1280
height: 720
aspect_ratio: 16:9
steps: 8
cfg: 1.0
sampler_name: res_multistep
scheduler: simple
model_sampling: ModelSamplingAuraFlow
shift: 3.0
```

Flux was intentionally avoided.

## Core Quality Philosophy

The user's image preference is:

```text
stable composition > anatomy/geometry correctness > material texture > prop/background continuity > prettiness
```

Always prioritize:

- Stable, readable composition.
- Low visual fatigue for long music playback.
- Believable material texture.
- No broken anatomy when people or animals are present.
- No text, captions, logos, watermarks, signatures, readable letters, or brand marks.
- Strong preservation of requested props, background, lighting, and aspect ratio.

## Universal Image Rules

Use these defaults for future generation:

- For YouTube music backgrounds, default to `16:9`.
- Use `1280 x 720` for drafts and broad batch exploration.
- Move to `1920 x 1080` only after a theme direction is selected.
- Generate in batches, then review via contact sheets.
- Keep accepted images in Google Drive folders by theme.
- Keep metadata, prompts, seeds, workflow JSON, and rejected notes in the repo.
- Do not directly copy a specific Pinterest image, artist, photographer, model, influencer, brand campaign, living person, school identity, vehicle brand, mascot, or existing character.
- Do not store copyrighted reference images in the repo.

## Prompt Architecture

Use this structure:

```text
[theme identity],
[specific set direction],
[specific scene variation],
wide 16:9 long-form YouTube AI music background,
stable composition for 1 to 6 hour playback,
calm visual rhythm,
detailed material texture,
coherent light direction,
no text,
no captions,
no logos,
no watermark,
no signature,
no readable letters,
no numbers,
no brand marks,
no posters,
no signage,
no UI,
no malformed geometry
```

For high-risk categories, add extra constraints:

- University library: `no crest, no seal, no shield, no emblem, no plaques, no clock, no university identity`.
- Racing: `no decals, no race numbers, no team livery, no license plate, no sponsor boards, no billboards`.
- Teto Nam: `fictional adult male only, not a celebrity, not a real person, no posters, no window text`.
- 2D characters/plush: `original character only, not a mascot, not a franchise character`.

## Review And Rejection Protocol

After every batch:

1. Make a contact sheet.
2. Scan for text, logos, readable letters, numbers, crests, shields, sponsor marks, watermarks, and UI-like elements.
3. Scan for broken subject logic: malformed vehicles, distorted instruments, odd hands, incorrect paws, duplicated characters, or incoherent props.
4. Move failed images into `outputs/generated_images/rejected/<timestamp_reason>/`.
5. Regenerate only the failed slots.
6. Rebuild the final contact sheet and index.

Do not leave rejected images in the Google Drive final theme folders.

## Known Failure Modes

### Racing

Most likely failures:

- Fake sponsor decals.
- Race numbers.
- Billboard text.
- License plate-like text.
- Brand-like marks on car body.

Safer alternatives:

- Plain unmarked car in dark studio.
- Tire, helmet, gloves, pit-light still life.
- Empty wet track with no car and no billboards.
- Crop to material textures instead of full livery.

### University Library

Most likely failures:

- Crest, shield, emblem, seal, or university-like wall ornament.
- Plaques and unreadable fake text.

Safer alternatives:

- Side-angle views between bookshelves.
- Concrete columns and skylights.
- Archive shelves and catalog drawers.
- Avoid large blank central back walls, because the model tends to place emblems there.

### Teto Nam

Most likely failures:

- Window or windshield text.
- Real-person likeness drift.
- Posters or signs in the background.

Safer alternatives:

- Silhouette against plain wall.
- Back view near turntable or speakers.
- Rooftop silhouette with distant skyline and no signage.
- Low-key lounge with minimal props.

### Animal 2D Character

Most likely failures:

- Existing character or mascot resemblance.
- Decorative music-note symbols if the prompt mentions music directly.

Safer alternatives:

- Use "portable speaker shape", "radio shape", or "listening mood" instead of musical symbols.
- Keep original animal shapes simple and generic.

## Theme Identity Guide

### 01 Animal Plush

Identity:

- Handmade plush animal scenes.
- Soft fabric, seams, stitching, stuffing volume, gentle fiber texture.
- Cozy bedtime, window, lamp, cushion, blanket, shelf, or music box settings.

Do:

- Use original plush animals.
- Emphasize tactile fabric.
- Keep expressions simple and stable.

Avoid:

- Known mascot shapes.
- Brand-like toys.
- Overly busy nursery clutter.

### 02 Animal 2D Character

Identity:

- Original 2D animal characters.
- Clean silhouettes and consistent line weight.
- Calm rooms, sunrise fields, rainy windows, or simple listening scenes.

Do:

- Keep poses simple.
- Use broad animal ideas rather than recognizable IP.
- Keep backgrounds calm and flat enough for long viewing.

Avoid:

- Studio-style imitation.
- Existing mascot resemblance.
- Large music notes or fake text.

### 03 Campfire

Identity:

- Cozy, believable fire scenes.
- Fire, embers, wood, ash, smoke, rocks, ground texture.
- Forest rain, lake night, snow, beach, desert, or canyon variants.

Do:

- Keep flame physically plausible.
- Make ground and wood textures readable.
- Use wide calm framing.

Avoid:

- Overly explosive fire.
- Busy campers or complex people.
- Text on camping gear.

### 04 Kodoromo

Identity:

- Internal original theme bucket.
- Dreamy handmade childlike folklore room.
- Paper moon, mobiles, tiny wooden toys, fabric dolls, low futon, rainy craft room.

Do:

- Keep warm, soft, handmade, nostalgic tone.
- Preserve spelling as `kodoromo`.
- Keep props small and gentle.

Avoid:

- Existing children's characters.
- Readable labels on toys or spools.
- Overly commercial nursery design.

### 05 Cafe

Identity:

- Original cozy cafe interiors.
- Warm wood, ceramic cups, glass, pastry, linen, rain windows, coastal morning light.

Do:

- Use empty or quiet seating.
- Emphasize ceramic, wood, glass, and fabric texture.
- Keep logos and menus out.

Avoid:

- Chain branding.
- Menu boards with fake text.
- Recognizable venue designs.

### 06 University Library

Identity:

- Broad prestigious academic library atmosphere.
- Historic halls, modern concrete atriums, rare-book archives.
- Wood, stone, brass, paper, leather, lamps, shelves, long desks.

Do:

- Keep it generic and original.
- Use side-angle shelves and study tables.
- Add "no crest, no seal, no emblem" aggressively.

Avoid:

- Named university identities.
- Crests, shields, seals, emblems, plaques, clocks, readable text.
- Large blank wall focal points.

### 07 Magic Library

Identity:

- Original fantasy library.
- Crystals, observatory light, candles, floating dust, blank books, carved stone, warm or blue magical light.

Do:

- Keep shelves coherent.
- Keep magical props readable.
- Use atmospheric but stable lighting.

Avoid:

- Readable spellbook text.
- Chaotic floating objects.
- Overcrowded fantasy props.

### 08 Racing

Identity:

- Original racing ambience.
- Unbranded vehicles, empty tracks, wet asphalt, studio still life, helmets, tires, gloves, garage lighting.

Do:

- Use unmarked cars or no car.
- Prefer still-life if text risk is high.
- Keep geometry and wheels stable.

Avoid:

- Brand logos.
- Race numbers.
- Decals.
- Sponsor marks.
- Billboards and license plates.

### 09 Teto Nam

Identity:

- Internal original theme bucket.
- Moody masculine music background.
- Fictional adult male silhouette, dark lounge, rooftop dawn, turntable, speaker, guitar case, plain walls.

Do:

- Keep the figure fictional and anonymous.
- Prefer silhouette/back view.
- Use low-key warm light or dawn rooftop.

Avoid:

- Celebrity or real-person resemblance.
- Posters, signs, window text, windshield text.
- Close-up face identity.

### 10 Classical Orchestra Stage

Identity:

- Original classical concert hall and orchestra stage imagery.
- Coherent instruments, chairs, music stands, piano, strings, brass, stage lights, curtains.

Do:

- Keep wide stage composition.
- Use empty-after-rehearsal or concert-light variants.
- Make instruments coherent enough at a distance.

Avoid:

- Famous orchestra, conductor, or venue identity.
- Logos or readable sheet music.
- Cropped chaotic instrument clusters.

## File Naming

Use stable names:

```text
YYYYMMDD_HHMMSS_theme_slug_set_name_variant_16x9_seed.png
YYYYMMDD_HHMMSS_theme_slug_16x9_seed.png
YYYYMMDD_HHMMSS_batch_name.meta.json
YYYYMMDD_HHMMSS_batch_name.index.json
YYYYMMDD_HHMMSS_batch_name_sheet.png
```

For rejected images:

```text
outputs/generated_images/rejected/YYYYMMDD_HHMMSS_reason_slug/
```

Examples of useful rejection reasons:

```text
racing_text_logo_risk
racing_number_risk
teto_nam_text_risk
university_library_crest_risk
```

## Future Workflow

For any new image request in this project:

1. Determine whether it is a YouTube AI music background.
2. If yes, default to `16:9`, `1280 x 720`, local ComfyUI API, Z-Image Turbo, no Flux unless explicitly requested.
3. Pick the target theme folder.
4. Write 2 to 4 prompt variants with intentionally different composition or mood.
5. Generate drafts.
6. Build a contact sheet.
7. Reject text/logo/crest/decals/anatomy failures.
8. Regenerate only failed slots.
9. Save final images to Google Drive.
10. Save metadata and contact sheet to the repo.
11. Show the user a final contact sheet and concise quality review.

## Upscale Policy

Use `1280 x 720` for exploration. Move to `1920 x 1080` when:

- The user chooses a specific theme or image direction.
- A channel visual identity is being finalized.
- The image will be used as a final YouTube video background.

Do not upscale a flawed draft. First fix prompt direction, text risk, composition, and object stability.

## Review Format For Final Responses

For generated batches, report:

- Output root and per-folder counts.
- Contact sheet path.
- Metadata/index path.
- Whether Flux was avoided.
- Any rejected/replaced images and why.
- Short quality review:
  - Composition and ratio.
  - Subject/prop stability.
  - Text/logo absence.
  - Material texture.
  - Next improvement point.

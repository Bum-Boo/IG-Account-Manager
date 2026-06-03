# YouTube AI Music Image Workflow

Date recorded: 2026-06-03 KST

For the current production history, accepted-output counts, rejection patterns, and future consistency rules, use `docs/integrations/youtube-ai-music-image-production-report.md` as the source-of-truth companion to this workflow.

## Goal

Create stable background images for long-form YouTube AI music videos, usually 1 to 6 hours long.

For this workflow, prioritize composition stability, material texture, anatomy, prop continuity, and long-viewing comfort over a merely pretty image.

## Output Root

Final accepted images should be copied into categorized folders under:

```text
C:/Users/Hojun/Documents/hojun_google_drive
```

Use this folder structure:

```text
youtube_ai_music_images/
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

Keep source-independent workflow JSON, prompts, seeds, and accepted metadata in the repo under `outputs/workflows/`. Copy final images to the Google Drive output root after acceptance.

## Aspect Ratio

For YouTube music video backgrounds, default to landscape `16:9` unless the user requests another format.

Recommended sizes:

- Draft: `1280 x 720`
- Standard final: `1920 x 1080`
- High detail final: `2560 x 1440`

If a source image is provided, preserve the source ratio. If the user explicitly says `3:4`, use exactly `3:4`.

## Theme Rules

### Animal Plush

Generate original plush animal scenes only. Do not copy existing toy brands, mascots, characters, or recognizable franchise designs.

Quality priorities:

- Soft fabric texture, seams, stuffing volume, believable fibers.
- Stable cute expression without copying known characters.
- Cozy long-viewing composition with clean negative space for video overlays if needed.

### Animal 2D Character

Generate original 2D animal characters only. Avoid existing animated characters, mascots, or studio styles.

Quality priorities:

- Clear silhouette, stable eyes, consistent line weight.
- Simple readable pose.
- Background and lighting should support the music mood without visual clutter.

### Campfire

Generate cozy, atmospheric fire scenes without text or logos.

Quality priorities:

- Fire shape and ember glow should be believable.
- Wood, ash, smoke, and ground texture should remain readable.
- Composition should stay calm enough for long music playback.

### Kodoromo

Use this as a project theme bucket until the user defines the exact visual meaning. Preserve the spelling as `kodoromo` for folders and metadata.

Quality priorities:

- Ask for clarification before producing final channel-defining imagery if the visual identity is unclear.
- Once clarified, preserve core props, composition, background, and lighting across style variations.

### Cafe

Generate original cafe interiors or exterior windows. Do not copy real chain branding, logos, or recognizable venue designs.

Quality priorities:

- Warm believable lighting, readable wood/ceramic/fabric textures.
- Stable table props such as coffee cups, books, lamps, or pastries.
- Cozy but not cluttered.

### University Library

Generate prestigious academic library scenes inspired by broad architectural ideas only. Do not directly copy a named university's specific library, reading room, logo, seal, or campus identity unless the user provides a permitted source and requests an abstracted version.

Quality priorities:

- Grand reading-room composition, stable shelves, desks, lamps, books, and architectural symmetry.
- No university logos, crests, or readable text.
- Materials should read clearly: wood, stone, brass, leather, paper.

### Magic Library

Generate original fantasy library scenes.

Quality priorities:

- Bookshelves, candles, floating dust, magical light, and props should remain coherent.
- Avoid unreadable fake text as a focal point.
- Keep lighting cinematic but stable.

### Racing

Generate original racing scenes without real car brand logos, sponsor decals, team liveries, or track branding.

Quality priorities:

- Car geometry, wheels, reflections, and motion direction should be stable.
- Preserve composition and vehicle placement across style variants.
- Avoid fake text on cars and billboards.

### Teto Nam

Use this as a project theme bucket until the user defines the exact visual identity. Preserve the spelling as `teto_nam` for folders and metadata.

Quality priorities:

- Ask for clarification before producing final channel-defining imagery if the character, mood, or setting is unclear.
- Do not infer a real person or existing IP.

### Classical Orchestra Stage

Generate original concert hall and orchestra stage imagery.

Quality priorities:

- Instruments, chairs, stands, stage lights, curtains, and hall materials should be coherent.
- Avoid copying a famous orchestra, conductor, venue, logo, or stage design.
- Keep the composition wide and balanced for long-form music backgrounds.

## Generation Process

1. Confirm the theme and intended mood.
2. Use local ComfyUI in the background via API.
3. Generate a draft batch before finalizing.
4. Pick the image with the most stable composition, textures, props, and anatomy.
5. Save accepted output metadata: prompt, seed, model, dimensions, ratio, file path, and workflow JSON.
6. Copy accepted image to the matching Google Drive category folder.
7. Show the image directly to the user and provide a short quality review.

## Review Checklist

For every accepted image, briefly evaluate:

- Composition and ratio.
- Main subject stability.
- Anatomy if people or animals are present.
- Hands or paws if visible.
- Prop and background preservation.
- Material texture.
- Text, logo, and watermark absence.
- Next improvement point.

## Naming

Use stable names:

```text
YYYYMMDD_HHMMSS_theme_slug_ratio_seed.png
YYYYMMDD_HHMMSS_theme_slug_ratio_seed.api.json
YYYYMMDD_HHMMSS_theme_slug_ratio_seed.meta.json
```

Example:

```text
20260603_082500_magic_library_16x9_123456789.png
```

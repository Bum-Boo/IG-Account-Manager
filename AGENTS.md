# AGENTS.md

This repository includes a local reference abstraction and prompt generation workflow for Gurrimming-style Instagram visual references.

Rules for agents working in this project:

- Do not include copyrighted reference images in the repository.
- Do not generate prompts that directly copy a specific Pinterest image, artist, photographer, model, influencer, brand campaign, or living person.
- Store only abstracted visual descriptions, compatibility metadata, and reusable prompt fragments.
- Treat `reference_library/` images as local-only input material. Final JSON should contain metadata and abstract descriptions only.
- For local image generation, use the user's ComfyUI API workflow defaults in `docs/integrations/local-comfyui-image-generation-preferences.md`.
- For long-form YouTube AI music background images, use `docs/integrations/youtube-ai-music-image-workflow.md` and copy accepted final images into the user's Google Drive output folder by theme.
- For continuity across YouTube AI music image batches, follow the production report in `docs/integrations/youtube-ai-music-image-production-report.md`.
- Prefer stable composition, anatomy, material texture, and prop/background preservation over making merely pretty images.
- When generating people, default to one clear adult subject, visible stable hands, natural skin texture, readable clothing material, no text/logos/watermarks, and the requested or source aspect ratio.
- Run `python scripts/validate_json.py` after schema or reference data changes.
- Run `python -m unittest discover -s tests` after prompt engine changes.
- Keep changes small, reviewable, and testable.

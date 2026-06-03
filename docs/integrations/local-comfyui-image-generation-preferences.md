# Local ComfyUI Image Generation Preferences

Date recorded: 2026-06-03 KST

## Operating Defaults

Use the user's local ComfyUI in the background whenever possible. Do not open the ComfyUI browser UI unless the user explicitly asks for it.

- ComfyUI location: `C:/Users/Hojun/Documents/comfy ui`
- Startup file: `C:/Users/Hojun/Documents/comfy ui/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable/run_nvidia_gpu.bat`
- API: `http://127.0.0.1:8188`
- Z-Image model: `C:/Users/Hojun/Documents/comfy ui/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable/ComfyUI/models/diffusion_models/z_image_turbo_nvfp4.safetensors`

Before generating, check whether the API is open. If it is not open, start ComfyUI in the background, then poll the API before submitting a workflow.

After generating, show the image directly in the response. If the user likes a result or the result is selected as best, save the prompt, settings, aspect ratio, seed, workflow JSON, and file path.

## Quality Priorities

Prioritize stable composition, physical plausibility, anatomy, material texture, and prompt adherence over a superficially pretty image.

For people:

- Use one clear main subject unless the user requests otherwise.
- Avoid stretched, missing, duplicated, or extra arms, legs, hands, and fingers.
- Treat hands as a primary quality gate: finger count, wrist angle, grip logic, and object contact must look natural.
- Keep skin realistic. Avoid overly smooth plastic skin; preserve subtle pores and fine texture on face, arms, and legs.
- Make clothing materials readable: thin fabric, thick fabric, lace, knit, leather, and layered garments should look materially different.
- Keep extreme low-angle and high-angle compositions structurally stable.
- Do not add text, logos, or watermarks.

For props, backgrounds, and lighting:

- If the user asks to preserve a prop, background, lighting setup, or composition, keep it stable even when changing style.
- When extending style, change only style unless the user explicitly requests changes to pose, prop, background, lighting, or framing.
- For hand-held props, check the grip, contact points, finger overlap, wrist direction, and prop scale.

## Aspect Ratio Defaults

- If there is a source image, preserve the source aspect ratio.
- If there is no source image and the user does not specify a ratio, default to a vertical image.
- If the user says `3:4`, the output must be exactly 3:4.

## Review Format

After generation, briefly assess:

- Face quality.
- Hand and finger errors.
- Composition and aspect ratio.
- Whether props and background were preserved.
- Skin, clothing, and material texture.
- Next improvement point.

## Storage

Store accepted local ComfyUI workflows in `outputs/workflows/`.

Store generated image outputs in `outputs/generated_images/` and copy to Downloads when useful for review.

Do not store copyrighted reference images in the repository. Store only abstract prompts, metadata, workflow settings, and generated outputs that comply with the repository policy.

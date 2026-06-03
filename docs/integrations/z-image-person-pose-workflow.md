# Z-Image Person and Pose Workflow

Date recorded: 2026-06-03 KST

## Goal

Generate photorealistic adult model and pose-reference images through local ComfyUI without opening the ComfyUI browser UI.

This workflow is for abstract model/pose direction only. Do not use it to copy a specific Pinterest image, living person, influencer, model, artist, photographer, or brand campaign.

## Current Accepted Workflow

- API workflow: `outputs/workflows/person_pose_zimage_best_20260603_073707.api.json`
- Metadata: `outputs/workflows/person_pose_zimage_best_20260603_073707.meta.json`
- Accepted image: `outputs/generated_images/person_pose_zimage_best_20260603_073707.png`
- Downloads copy: `C:/Users/Hojun/Downloads/person_pose_zimage_best_20260603_073707.png`
- Seed: `1550815067`
- Size: `768 x 1024`
- Aspect ratio: `3:4`

## Local ComfyUI Setup

- API: `http://127.0.0.1:8188`
- Startup file: `C:/Users/Hojun/Documents/comfy ui/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable/run_nvidia_gpu.bat`
- Model: `z_image_turbo_nvfp4.safetensors`
- Text encoder: `qwen_3_4b_fp4_mixed.safetensors`
- VAE: `ae.safetensors`

Run ComfyUI in the background. Confirm readiness with:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:8188/system_stats' -UseBasicParsing -TimeoutSec 3
```

Do not open the ComfyUI browser interface unless explicitly requested.

## Recommended Pipeline

1. Start with a low-risk full-body pose.
   Use standing, three-quarter, contrapposto, relaxed arms, and visible hands before trying seated, kneeling, crossed limbs, props, or hand interactions.

2. Generate a small draft batch.
   Use `768 x 1024`, `steps 8-10`, `cfg 1.0`, `res_multistep`, `simple`, `shift 3.0`. Generate 4 candidates with different pose phrases or seeds.

3. Evaluate manually.
   Prioritize one adult subject, face stability, visible hands, correct fingers, stable feet, readable body silhouette, full-body framing, and realistic skin/fabric texture.

4. Only upscale or increase resolution after a stable draft.
   Test `960 x 1280` or `1080 x 1440` only after a draft has clean anatomy. If the higher-resolution run introduces foot or hand errors, keep the stable lower-resolution seed as the accepted workflow.

5. Save the accepted workflow.
   Store the exact ComfyUI API graph, prompt, seed, dimensions, model names, and selection notes in `outputs/workflows/`. Copy the accepted image to `outputs/generated_images/` and optionally `Downloads`.

## Prompt Structure

Use this order:

```text
photorealistic real-person full-body fashion model pose reference photo,
single adult [broad demographic] model,
[pose phrase with explicit body logic],
clean white photography studio,
vertical 3:4 centered composition,
full body visible from head to shoes,
face visible,
natural human proportions,
realistic skin texture,
simple clothing,
high-key softbox lighting,
anatomy and artifact constraints
```

Keep pose phrases concrete:

- `three-quarter standing contrapposto pose`
- `weight on back leg`
- `one leg slightly forward`
- `shoulders gently angled`
- `both hands visible`
- `arms relaxed and separated from the body`
- `bare feet visible` or `visible simple shoes`

Avoid high-risk details in the first pass:

- Props held in both hands
- Extreme low-angle or high-angle framing
- Complicated finger overlap
- Crossed arms
- Multiple people
- Brand logos or campaign styling
- Requests to resemble a real person

## Accepted Prompt

```text
photorealistic real-person full-body fashion model pose reference photo, single adult East Asian model, three-quarter standing contrapposto pose, weight on back leg, one leg slightly forward, shoulders gently angled, one hand lightly near the waist, the other hand relaxed downward, both hands visible, clean white photography studio, seamless white cyc wall, vertical 3:4 centered composition, full body visible from head to shoes, face visible, natural human proportions, realistic skin texture with subtle pores, detailed natural hair, simple fitted neutral knit top and clean neutral skirt, visible simple shoes, high-key softbox studio lighting, even illumination, soft floor shadow, neutral white balance, crisp focus, professional model casting photo and pose reference, no furniture, no extra objects, no text, no logo, no watermark, no extra people, no duplicated limbs, no extra arms, no extra hands, no missing fingers, no distorted fingers, no fused feet, no cropped feet, no plastic skin, no CGI, no cartoon
```

## Quality Gate

Accept only when these checks pass:

- Exactly one adult subject.
- Face is natural and not distorted.
- Full body is visible within the frame.
- Pose direction is readable at a glance.
- Both hands are visible or intentionally hidden by a simple pose.
- Fingers are not duplicated, fused, or missing.
- Feet are visible and not cropped when the prompt requests full body.
- Clothing does not merge with limbs in a way that hides anatomy.
- No text, logos, watermarks, furniture, extra objects, or extra people.

## Notes From This Run

The selected `768 x 1024` draft was better than the `960 x 1280` reruns for this specific workflow. The higher-resolution checks improved detail but introduced more foot-detail risk, so the saved accepted workflow keeps the lower-resolution stable output.

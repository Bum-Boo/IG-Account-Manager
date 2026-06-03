# Z-Image Low-Angle Gothic Editorial Settings

Date recorded: 2026-06-01 KST

## Accepted Output

- Reference image: `C:\Users\Hojun\Downloads\TA-2026-05-21-12-15-57-lowangle,d-491816139-0.png`
- Accepted generated image: `C:\Users\Hojun\Downloads\generated-lowangle-gothic-editorial-3x4-20260601-012924.png`
- Actual output size: `1086 x 1448`
- Aspect ratio: `3:4`
- User feedback: face is good; overall direction is good.

## Visual Direction To Preserve

- Single adult East Asian woman.
- Intense refined face, long slightly messy black hair, focused sideways/upward gaze.
- Black gothic lace veil over the head.
- Layered black lace dress and skirt with visible lace and fabric thickness.
- Kneeling/seated pose on a clean white-gray studio floor.
- Strong low-angle editorial composition.
- Prop pistol held with both hands toward the right side of the frame.
- Raw high-end fashion magazine photo feel, not a marketing/stock-photo look.

## Quality Priorities

- Natural skin texture should be visible where appropriate: subtle pores, fine grain, realistic face/arm/leg surface.
- Hands must stay anatomically correct.
- Clothing texture and thickness must be readable: veil, sleeves, bodice, and skirt should feel materially different.
- Extreme low-angle and high-angle compositions should remain consistent.
- Single protagonist only: no extra arms, legs, hands, or duplicated fingers.

## Prompt Used For The Accepted 3:4 Version

```text
Create a photorealistic vertical fashion editorial image in an exact 3:4 portrait composition, intended for a 1080x1440 canvas. Use the previous generated image as the face and mood reference: a single adult East Asian woman with an intense, refined face, long slightly messy black hair, and a focused sideways-upward gaze. Match the original reference framing more closely: kneeling on the floor, more of the full seated/kneeling pose visible, black gothic lace veil over the head, layered black lace dress and skirt, lace sleeves, clean white-gray studio background. Keep a strong low-angle perspective, but do not make the frame overly tall or cropped; show the knees, skirt volume, arms, hands, face, and prop clearly within a 3:4 frame. She holds a black cinematic prop pistol with both hands extended toward the right side of the frame, non-graphic, no violence, no injury, no gore. Prioritize realistic natural skin texture with subtle pores on face, arms, and legs; visible lace pattern; separated black fabric layers; cloth thickness differences between veil, sleeves, bodice, and skirt. Accurate anatomy: exactly one person, two arms, two legs, two hands, five fingers on each visible hand, realistic grip, correct wrist alignment, no extra limbs, no missing fingers, no duplicated fingers, no distorted face. High-end raw magazine photography, realistic studio lighting, crisp focus on face, hands, and lace textures, no text, no logo, no watermark.
```

## Negative Constraints To Keep

- No extra people.
- No extra arms, extra legs, extra hands, or duplicated fingers.
- No missing fingers.
- No distorted face.
- No text, logo, or watermark.
- No gore, injury, violence, or graphic content.
- Avoid overly tall portrait framing; keep `3:4`.

## Next Iteration Notes

- Preserve the face direction from the accepted output.
- Preserve the `3:4` frame and kneeling full-pose visibility.
- Improve hand/finger overlap around the prop.
- Improve black garment separation so the skirt layers do not merge into one dark mass.
- Add more controlled skin microtexture on arms and legs without making it noisy.

## Local ComfyUI Mapping

Known local ComfyUI path:

```text
C:\Users\Hojun\Documents\comfy ui
```

Known available Z-Image model:

```text
C:\Users\Hojun\Documents\comfy ui\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ComfyUI\models\diffusion_models\z_image_turbo_nvfp4.safetensors
```

Suggested local generation sizes:

- Draft: `768 x 1024`
- Better final base: `960 x 1280`
- Match accepted/reference output: `1080 x 1440`

Recommended workflow direction:

- Generate at `3:4`.
- Use low-denoise upscale/detail pass after the base image.
- Use targeted hand/detail inpaint if fingers overlap.
- Save seed and workflow JSON for every accepted run.

Note: The accepted image was generated through the built-in image generator, which did not expose exact seed/model/sampler settings. For ComfyUI reproduction, record the seed and exported workflow JSON once a comparable local result is produced.

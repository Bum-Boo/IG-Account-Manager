from __future__ import annotations

import json
import shutil
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from random import Random
from typing import Any

from PIL import Image, ImageDraw


API = "http://127.0.0.1:8188"
COMFY_ROOT = Path(
    r"C:\Users\Hojun\Documents\comfy ui\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ComfyUI"
)
DRIVE_ROOT = Path(r"C:\Users\Hojun\Documents\hojun_google_drive\youtube_ai_music_images")
WORKSPACE = Path(r"C:\Users\Hojun\Desktop\Bumboo\Codes\IG post manager")
WORKFLOW_OUT = WORKSPACE / "outputs" / "workflows"
SHEET_OUT = WORKSPACE / "outputs" / "generated_images" / "youtube_ai_music_contact_sheets"

WIDTH = 1280
HEIGHT = 720
STEPS = 8
CFG = 1.0
SAMPLER = "res_multistep"
SCHEDULER = "simple"
SHIFT = 3.0
MODEL = "z_image_turbo_nvfp4.safetensors"
TEXT_ENCODER = "qwen_3_4b_fp4_mixed.safetensors"
VAE = "ae.safetensors"

COMMON_POSITIVE = (
    "wide 16:9 YouTube long-form AI music background image, calm stable composition, "
    "cinematic but not cluttered, high detail, coherent lighting, clean negative space, "
    "no text, no captions, no logos, no watermark, no signature, no brand marks, "
    "no readable letters, no UI elements, no duplicated subjects, no malformed objects"
)


@dataclass(frozen=True)
class Theme:
    folder: str
    slug: str
    base: str
    variants: tuple[str, ...]


THEMES: tuple[Theme, ...] = (
    Theme(
        "01_animal_plush",
        "animal_plush",
        (
            "original plush animal music room scene, handmade soft toy protagonist, "
            "believable fabric fibers, seams, stitched details, gentle stuffing volume, "
            "cozy bedtime ambience, warm lamp light, soft blankets and wooden shelf, "
            "not a known mascot or franchise character"
        ),
        (
            "sleepy plush bear beside a small music box on a windowsill at blue hour",
            "round plush rabbit with a knitted scarf on a soft rug near a glowing lamp",
            "tiny plush fox sitting on a pillow fort with warm fairy lights",
            "plush penguin in a snowy bedroom scene with soft moonlight through window",
            "plush puppy curled beside a record player and folded blanket",
            "plush deer on a cozy reading chair with gentle amber light",
        ),
    ),
    Theme(
        "02_animal_2d_character",
        "animal_2d_character",
        (
            "original 2D animal character illustration for relaxing music, clean silhouette, "
            "consistent line weight, soft cel shading, simple readable pose, calm background, "
            "not an existing cartoon, mascot, anime character, or studio style"
        ),
        (
            "small cat character playing a tiny piano in a quiet moonlit room",
            "gentle dog character wearing headphones beside a window with rain outside",
            "owl character reading sheet music under a desk lamp in a cozy study",
            "rabbit character holding a warm cup in a pastel bedroom with music notes implied by shapes only",
            "fox character sitting on a rooftop at sunset with a portable speaker",
            "bear character napping near an old radio in a warm cabin interior",
        ),
    ),
    Theme(
        "03_campfire",
        "campfire",
        (
            "cozy campfire ambience for long relaxing music, believable fire shape, glowing embers, "
            "readable wood grain, ash, smoke, stones, forest floor texture, calm wide composition"
        ),
        (
            "campfire beside a quiet forest lake under a starry sky",
            "small mountain campsite with pine trees and glowing tent in the distance",
            "rainy shelter campfire under a tarp with wet stones and steam",
            "winter campfire in a snowy clearing with warm orange light on snow",
            "desert night campfire with low rocks and distant silhouettes of mesas",
            "beach campfire with driftwood, soft waves, and moonlit horizon",
        ),
    ),
    Theme(
        "04_kodoromo",
        "kodoromo",
        (
            "original kodoromo theme visual identity, dreamy childlike folklore music background, "
            "soft handmade room, paper charms, small wooden toys, gentle textiles, nostalgic but not copied, "
            "calm composition for long playback"
        ),
        (
            "tiny attic room with handmade mobiles, soft futon, and warm paper lantern glow",
            "quiet wooden playroom with little fabric dolls and moonlight on tatami-like mat texture",
            "storybook corner with folded blankets, paper stars, and gentle dusk window light",
            "small shrine-like shelf with handmade charms, soft cloth, and candle-safe lantern light",
            "dreamy rainy bedroom with wooden toys, low table, and muted pastel fabric textures",
            "cozy nursery-like music corner with old radio, plush cushions, and paper garland",
        ),
    ),
    Theme(
        "05_cafe",
        "cafe",
        (
            "original cozy cafe background for chill music, warm believable lighting, "
            "readable wood, ceramic, glass, paper, pastry, and fabric textures, no chain branding, "
            "no recognizable venue design"
        ),
        (
            "empty window seat with coffee cup, rain on glass, warm lamp reflections",
            "quiet late-night cafe counter with espresso machine silhouettes and pastries",
            "sunny morning cafe table with ceramic cup, book, linen napkin, and soft shadows",
            "small jazz cafe corner with vinyl records, wooden chair, and amber wall light",
            "greenhouse cafe interior with plants, wooden tables, and diffused daylight",
            "minimal Korean-style cafe room with low warm lights, clean table props, and calm negative space",
        ),
    ),
    Theme(
        "06_university_library",
        "university_library",
        (
            "prestigious historic university library inspired background, broad academic architecture only, "
            "not copying a specific real library, no university name, no crest, no seals, "
            "grand reading room, stable shelves, desks, lamps, books, wood, stone, brass, leather, paper"
        ),
        (
            "grand arched reading room with long wooden tables and green banker lamps",
            "high-ceiling old library with balcony stacks and warm afternoon light",
            "quiet gothic academic reading hall with stone columns and symmetrical bookcases",
            "mahogany study hall with brass lamps, leather chairs, and tall windows",
            "snowy evening university library interior with warm desk lamps and empty chairs",
            "sunlit classical research library with marble floor, wooden shelves, and dust in the air",
        ),
    ),
    Theme(
        "07_magic_library",
        "magic_library",
        (
            "original fantasy magic library background, coherent bookshelves, candles, floating dust, "
            "magical light, readable props, cinematic stable lighting, no readable book titles"
        ),
        (
            "towering circular library with floating candles and blue-gold magical light",
            "old wizard study with open blank spellbook, glass bottles, and soft green glow",
            "moonlit magic archive with spiral stairs and glowing dust motes",
            "cozy enchanted library fireplace with hovering lanterns and deep wooden shelves",
            "ancient underground library with crystal light and carved stone arches",
            "starry observatory library with brass telescope, bookshelves, and magical sky window",
        ),
    ),
    Theme(
        "08_racing",
        "racing",
        (
            "original racing music background, no real car brand, no sponsor decals, no team livery, "
            "stable vehicle geometry, clean wheels, believable reflections, motion direction clear, "
            "no fake text on cars, billboards, suits, or track walls"
        ),
        (
            "sleek original prototype race car parked in a rainy pit lane at night",
            "cinematic endurance race car silhouette entering a misty corner at dawn",
            "futuristic neon racing garage with one unbranded car under strip lights",
            "empty mountain road racing scene with blurred original car and golden sunset",
            "wet city circuit corner with reflections and a single unbranded race car",
            "classic-inspired unbranded race car on a desert test track under dramatic clouds",
        ),
    ),
    Theme(
        "09_teto_nam",
        "teto_nam",
        (
            "original teto nam channel visual identity, moody masculine music background, "
            "single fictional adult male presence or silhouette, not a real person, not a celebrity, "
            "stable anatomy when visible, clean hands if visible, no text, no brand logo"
        ),
        (
            "fictional adult man silhouette in a dark studio with warm side light and vinyl player",
            "quiet city apartment at night with a single adult male figure seen from behind near window",
            "moody gym locker room ambience with jacket on bench and subtle human silhouette",
            "late-night black car interior ambience with fictional driver silhouette and rain on glass",
            "minimal rooftop scene with adult male figure leaning on railing, hands relaxed and visible",
            "low-key lounge room with leather chair, guitar case, and fictional male silhouette in background",
        ),
    ),
    Theme(
        "10_classical_orchestra_stage",
        "classical_orchestra_stage",
        (
            "original classical orchestra stage background, no famous orchestra, no conductor likeness, "
            "no venue logo, coherent instruments, chairs, music stands, stage lights, curtains, "
            "wide balanced concert hall composition"
        ),
        (
            "empty symphony stage before concert with chairs, stands, and warm golden hall lights",
            "grand concert hall stage with string instruments resting on chairs and red curtains",
            "quiet rehearsal stage with piano, cellos, music stands, and soft morning light",
            "dramatic orchestra stage viewed from balcony with polished wood and amber spotlights",
            "minimal chamber orchestra setup in a small hall with black stands and soft side light",
            "large classical stage with harp, timpani, strings, and deep blue evening lighting",
        ),
    ),
)


def http_json(path: str, payload: dict[str, Any] | None = None, timeout: int = 30) -> Any:
    url = f"{API}{path}"
    if payload is None:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def ensure_api_ready() -> None:
    try:
        stats = http_json("/system_stats", timeout=5)
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError("ComfyUI API is not ready. Start ComfyUI in the background first.") from exc
    devices = stats.get("devices", [])
    if not devices:
        raise RuntimeError("ComfyUI API is ready but no device was reported.")


def workflow(prompt: str, seed: int, prefix: str) -> dict[str, Any]:
    return {
        "28": {
            "class_type": "UNETLoader",
            "inputs": {"unet_name": MODEL, "weight_dtype": "default"},
        },
        "30": {
            "class_type": "CLIPLoader",
            "inputs": {"clip_name": TEXT_ENCODER, "type": "lumina2", "device": "default"},
        },
        "29": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "27": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["30", 0], "text": prompt},
        },
        "33": {
            "class_type": "ConditioningZeroOut",
            "inputs": {"conditioning": ["27", 0]},
        },
        "13": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {"width": WIDTH, "height": HEIGHT, "batch_size": 1},
        },
        "11": {
            "class_type": "ModelSamplingAuraFlow",
            "inputs": {"model": ["28", 0], "shift": SHIFT},
        },
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["11", 0],
                "positive": ["27", 0],
                "negative": ["33", 0],
                "latent_image": ["13", 0],
                "seed": seed,
                "steps": STEPS,
                "cfg": CFG,
                "sampler_name": SAMPLER,
                "scheduler": SCHEDULER,
                "denoise": 1.0,
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["29", 0]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"images": ["8", 0], "filename_prefix": prefix},
        },
    }


def wait_for_prompt(prompt_id: str, timeout_seconds: int = 900) -> dict[str, Any]:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        history = http_json(f"/history/{prompt_id}", timeout=30)
        entry = history.get(prompt_id)
        if entry and entry.get("outputs"):
            return entry
        time.sleep(3)
    raise TimeoutError(f"Timed out waiting for prompt {prompt_id}")


def extract_first_image(entry: dict[str, Any]) -> Path:
    for output in entry.get("outputs", {}).values():
        for image in output.get("images", []):
            image_type = image.get("type", "output")
            subfolder = image.get("subfolder") or ""
            filename = image["filename"]
            base = COMFY_ROOT / image_type
            return base / subfolder / filename if subfolder else base / filename
    raise RuntimeError("No image found in ComfyUI history output.")


def make_contact_sheet(theme: Theme, image_paths: list[Path], run_id: str) -> Path:
    SHEET_OUT.mkdir(parents=True, exist_ok=True)
    sheet_path = SHEET_OUT / f"{run_id}_{theme.slug}_sheet.png"
    thumb_w, thumb_h = 320, 180
    label_h = 24
    margin = 12
    cols, rows = 3, 2
    canvas = Image.new(
        "RGB",
        (cols * thumb_w + (cols + 1) * margin, rows * (thumb_h + label_h) + (rows + 1) * margin),
        "white",
    )
    draw = ImageDraw.Draw(canvas)
    for idx, path in enumerate(image_paths):
        image = Image.open(path).convert("RGB")
        image.thumbnail((thumb_w, thumb_h), Image.LANCZOS)
        x = margin + (idx % cols) * (thumb_w + margin)
        y = margin + (idx // cols) * (thumb_h + label_h + margin)
        thumb = Image.new("RGB", (thumb_w, thumb_h), "white")
        thumb.paste(image, ((thumb_w - image.width) // 2, (thumb_h - image.height) // 2))
        draw.text((x, y), f"{idx + 1:02d} {theme.slug}", fill=(20, 20, 20))
        canvas.paste(thumb, (x, y + label_h))
    canvas.save(sheet_path)
    return sheet_path


def main() -> None:
    ensure_api_ready()
    WORKFLOW_OUT.mkdir(parents=True, exist_ok=True)
    DRIVE_ROOT.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    rng = Random(run_id)
    manifest: dict[str, Any] = {
        "run_id": run_id,
        "created_at_kst": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "purpose": "YouTube AI music background image batch, 10 concepts x 6 images.",
        "settings": {
            "api": API,
            "model": MODEL,
            "text_encoder": TEXT_ENCODER,
            "text_encoder_type": "lumina2",
            "vae": VAE,
            "width": WIDTH,
            "height": HEIGHT,
            "aspect_ratio": "16:9",
            "steps": STEPS,
            "cfg": CFG,
            "sampler_name": SAMPLER,
            "scheduler": SCHEDULER,
            "model_sampling": "ModelSamplingAuraFlow",
            "shift": SHIFT,
            "flux_used": False,
        },
        "outputs": [],
        "contact_sheets": [],
    }

    for theme_index, theme in enumerate(THEMES, start=1):
        folder = DRIVE_ROOT / theme.folder
        folder.mkdir(parents=True, exist_ok=True)
        theme_paths: list[Path] = []
        print(f"[{theme_index:02d}/{len(THEMES):02d}] {theme.slug}")
        for variant_index, variant in enumerate(theme.variants, start=1):
            seed = rng.randint(1, 2_147_483_647)
            prompt = f"{theme.base}, {variant}, {COMMON_POSITIVE}"
            filename_stem = f"{run_id}_{theme.slug}_{variant_index:02d}_16x9_{seed}"
            graph = workflow(prompt, seed, f"codex_youtube_{filename_stem}")
            request = {"client_id": str(uuid.uuid4()), "prompt": graph}
            response = http_json("/prompt", request, timeout=30)
            prompt_id = response["prompt_id"]
            print(f"  - {variant_index:02d}/06 queued {prompt_id} seed={seed}", flush=True)
            entry = wait_for_prompt(prompt_id)
            source = extract_first_image(entry)
            if not source.exists():
                raise FileNotFoundError(source)
            destination = folder / f"{filename_stem}.png"
            shutil.copy2(source, destination)
            theme_paths.append(destination)
            manifest["outputs"].append(
                {
                    "theme": theme.slug,
                    "folder": theme.folder,
                    "variant_index": variant_index,
                    "variant": variant,
                    "seed": seed,
                    "prompt_id": prompt_id,
                    "prompt": prompt,
                    "source_path": str(source).replace("\\", "/"),
                    "drive_path": str(destination).replace("\\", "/"),
                }
            )
        sheet = make_contact_sheet(theme, theme_paths, run_id)
        manifest["contact_sheets"].append(
            {"theme": theme.slug, "path": str(sheet).replace("\\", "/")}
        )

    manifest_path = WORKFLOW_OUT / f"{run_id}_youtube_ai_music_10themes_60images.meta.json"
    template_path = WORKFLOW_OUT / f"{run_id}_youtube_ai_music_zimage_template.api.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    template_path.write_text(
        json.dumps(
            {
                "client_id": "youtube-ai-music-zimage-template",
                "prompt": workflow("{PROMPT}", 123456789, "youtube_ai_music_template"),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"manifest": str(manifest_path), "template": str(template_path)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

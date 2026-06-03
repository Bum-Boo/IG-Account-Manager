from __future__ import annotations

import json
import shutil
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw

import generate_youtube_ai_music_images as gen


COMMON_STRICT = (
    "wide 16:9 long-form YouTube AI music background, stable composition for 1 to 6 hour playback, "
    "calm visual rhythm, detailed material texture, coherent light direction, no text, no captions, "
    "no logos, no watermark, no signature, no readable letters, no numbers, no brand marks, "
    "no posters, no signage, no UI, no malformed geometry"
)


@dataclass(frozen=True)
class VariationSet:
    name: str
    direction: str
    variants: tuple[str, str]


@dataclass(frozen=True)
class VariationTheme:
    folder: str
    slug: str
    base: str
    sets: tuple[VariationSet, VariationSet]


THEMES: tuple[VariationTheme, ...] = (
    VariationTheme(
        "01_animal_plush",
        "animal_plush",
        "original handmade plush animal scene, no existing toy brand or mascot, visible fabric fibers, seams, stuffing volume, tactile soft material",
        (
            VariationSet(
                "set_a_arctic_lullaby",
                "cold moonlit arctic lullaby mood with pale blue light and soft snow texture",
                (
                    "plush polar bear tucked inside a tiny blanket cave near frosted window, moonlight and warm lantern contrast",
                    "plush seal on a quilted cushion beside a miniature music box, snowy window glow, soft blue shadows",
                ),
            ),
            VariationSet(
                "set_b_tropical_rain",
                "warm tropical rain nap mood with handmade fabric and humid window reflections",
                (
                    "plush sloth in a hammock corner with rain on glass, rattan basket, linen pillow, warm dim lamp",
                    "plush frog on a low wooden shelf beside small potted leaves, rainy tropical night, soft amber lamp",
                ),
            ),
        ),
    ),
    VariationTheme(
        "02_animal_2d_character",
        "animal_2d_character",
        "original 2D animal character illustration, not an existing cartoon or mascot, clean silhouette, consistent line weight, simple stable pose",
        (
            VariationSet(
                "set_a_noir_room",
                "muted noir room palette with soft blue-gray shadows",
                (
                    "small raccoon-like original character sitting by a rainy window with a tiny unmarked radio shape, no musical notes",
                    "round hedgehog-like original character under a desk lamp with a blank notebook and headphones, no symbols",
                ),
            ),
            VariationSet(
                "set_b_sunrise_field",
                "pastel sunrise outdoor mood with open space and gentle sky gradient",
                (
                    "little bird-like original character on a wooden fence at sunrise, tiny portable speaker without marks, open meadow",
                    "small sheep-like original character lying on a picnic blanket under dawn clouds, soft horizon, no decorative text",
                ),
            ),
        ),
    ),
    VariationTheme(
        "03_campfire",
        "campfire",
        "cozy campfire ambience, believable flame shape, embers, wood grain, ash, smoke, ground texture, calm long-viewing composition",
        (
            VariationSet(
                "set_a_forest_rain",
                "wet forest shelter mood with rain haze and orange fire contrast",
                (
                    "campfire under a simple tarp in dark pine forest, wet stones, steam, rain streaks in background",
                    "small fire inside a rocky forest overhang, damp moss, smoke drifting outward, deep green shadows",
                ),
            ),
            VariationSet(
                "set_b_desert_dawn",
                "open desert dawn with quiet wind and low pastel sky",
                (
                    "low campfire embers in desert sand at dawn, distant mesas, pale pink sky, scattered stones",
                    "small fire ring beside a canvas bedroll in dry canyon clearing, first sunlight on rock texture",
                ),
            ),
        ),
    ),
    VariationTheme(
        "04_kodoromo",
        "kodoromo",
        "original kodoromo theme, dreamy handmade childlike folklore room, soft textiles, small wooden toys, paper charms, nostalgic but not copied",
        (
            VariationSet(
                "set_a_paper_moon",
                "quiet paper moon room with blank walls, handcrafted hanging shapes, warm lantern",
                (
                    "low futon room with large paper moon lamp, handmade star mobile, tiny wooden toys, soft beige textiles",
                    "minimal attic nook with paper cloud mobile, folded quilts, small toy shelf, warm floor lantern",
                ),
            ),
            VariationSet(
                "set_b_rainy_workshop",
                "rainy handmade workshop mood with wood, cloth, and soft gray daylight",
                (
                    "small wooden craft table with fabric dolls, thread spools without labels, rainy window, gentle muted colors",
                    "cozy toy repair corner with blank cloth patches, low stool, tiny house shelf, diffused rainy light",
                ),
            ),
        ),
    ),
    VariationTheme(
        "05_cafe",
        "cafe",
        "original cafe scene, no real chain branding, no recognizable venue, warm believable lighting, readable wood, ceramic, glass, paper, fabric texture",
        (
            VariationSet(
                "set_a_rainy_city",
                "rainy city evening cafe with reflections and quiet empty tables",
                (
                    "corner window table with coffee cup, rain-streaked glass, blurred city lights outside, warm pendant lamp",
                    "narrow late-night cafe bar with empty stools, wet street reflections through window, ceramic cups, no signs",
                ),
            ),
            VariationSet(
                "set_b_coastal_morning",
                "bright coastal morning cafe with sea air and pale sunlight",
                (
                    "white seaside cafe terrace interior with open window, linen curtain, cup on wooden table, ocean horizon",
                    "sunlit cafe breakfast table with ceramic cup, croissant, woven chair, blue sea light, no menu text",
                ),
            ),
        ),
    ),
    VariationTheme(
        "06_university_library",
        "university_library",
        "prestigious academic library inspired scene, broad architecture only, no real university identity, no crest, no seals, no readable text",
        (
            VariationSet(
                "set_a_modern_brutalist",
                "modern brutalist university library, concrete, glass, geometric quiet study space",
                (
                    "large concrete reading hall with skylight, long desks, warm table lamps, tall abstract book stacks, no signage",
                    "minimal academic library atrium with exposed concrete balconies, glass roof, empty study tables, soft daylight",
                ),
            ),
            VariationSet(
                "set_b_underground_archive",
                "underground rare-books archive with stone, brass, leather, and controlled warm light",
                (
                    "subterranean academic archive room with stone arches, brass desk lamps, leather chairs, blank old books",
                    "quiet rare manuscript vault with wooden catalog drawers, long table, warm low lamps, no labels",
                ),
            ),
        ),
    ),
    VariationTheme(
        "07_magic_library",
        "magic_library",
        "original fantasy magic library, coherent bookshelves, candles, floating dust, magical light, no readable book titles",
        (
            VariationSet(
                "set_a_crystal_archive",
                "crystal-lit underground fantasy archive with cool cyan light and carved stone",
                (
                    "underground circular magic library with glowing crystals between shelves, stone floor, floating dust",
                    "ancient archive desk with blank open book, crystal lanterns, blue light, tall shadowed shelves",
                ),
            ),
            VariationSet(
                "set_b_solar_observatory",
                "sunlit observatory library with brass instruments and warm sky glow",
                (
                    "fantasy observatory library at golden sunset, brass telescope, arched window, bookshelves, glowing dust",
                    "round celestial reading room with star map shapes as abstract patterns, blank books, warm solar beam",
                ),
            ),
        ),
    ),
    VariationTheme(
        "08_racing",
        "racing",
        "original racing ambience, no real car brand, no sponsor decals, no race numbers, no team livery, no license plates, no signage",
        (
            VariationSet(
                "set_a_track_without_markings",
                "empty track mood with plain unmarked vehicle or no vehicle, avoid billboards and decals",
                (
                    "plain matte dark unbranded prototype car on empty wet test track, blank barriers, no billboards, no numbers",
                    "empty night track curve with wet asphalt, tire marks, colored light streaks, no car, no signs",
                ),
            ),
            VariationSet(
                "set_b_studio_stilllife",
                "racing material still life in a plain studio to avoid lettering risk",
                (
                    "stacked slick racing tires and plain black helmet in dark studio, no stickers, no labels, soft strip light",
                    "close-up of tire tread, carbon fiber texture, plain gloves on matte table, gray studio background, no text",
                ),
            ),
        ),
    ),
    VariationTheme(
        "09_teto_nam",
        "teto_nam",
        "original teto nam channel identity, moody masculine music background, fictional adult male silhouette only, not a celebrity or real person",
        (
            VariationSet(
                "set_a_empty_lounge",
                "dark lounge silhouette, warm side light, minimal props, no posters or text",
                (
                    "fictional adult male silhouette seated in low lounge chair, hands on armrests, guitar case shadow, plain wall",
                    "single fictional man seen from behind near turntable and plain speakers, amber rim light, blank wall",
                ),
            ),
            VariationSet(
                "set_b_rooftop_dawn",
                "open rooftop dawn silhouette with minimal city horizon and no signage",
                (
                    "fictional adult male silhouette on quiet rooftop at dawn, hands resting on railing, pale sky, no visible signs",
                    "wide minimal rooftop scene with jacket on chair, distant city bokeh, male figure in shadow, no text",
                ),
            ),
        ),
    ),
    VariationTheme(
        "10_classical_orchestra_stage",
        "classical_orchestra_stage",
        "original classical orchestra stage, no famous orchestra, no conductor likeness, no venue logo, coherent instruments and stage layout",
        (
            VariationSet(
                "set_a_empty_after_rehearsal",
                "empty stage after rehearsal, instruments resting, warm quiet hall",
                (
                    "empty symphony stage after rehearsal with chairs, stands, cello cases, amber stage light, no people",
                    "quiet concert hall stage with grand piano, scattered stands, folded chairs, warm wood reflections",
                ),
            ),
            VariationSet(
                "set_b_blue_concert_light",
                "dramatic blue and gold concert lighting with full stage ambience",
                (
                    "wide orchestra stage under deep blue evening light, strings and brass arranged coherently, no readable sheet music",
                    "large concert hall viewed from balcony, golden spotlights over orchestra setup, blue back curtain, no logos",
                ),
            ),
        ),
    ),
)


def make_variation_sheet(run_id: str, manifest_outputs: list[dict[str, object]]) -> Path:
    gen.SHEET_OUT.mkdir(parents=True, exist_ok=True)
    sheet_path = gen.SHEET_OUT / f"{run_id}_variation_10themes_40images_sheet.png"
    thumb_w, thumb_h = 224, 126
    label_w = 190
    margin = 8
    header_h = 24
    rows = len(THEMES)
    cols = 4
    canvas = Image.new(
        "RGB",
        (label_w + cols * thumb_w + (cols + 2) * margin, rows * (thumb_h + header_h) + (rows + 1) * margin),
        "white",
    )
    draw = ImageDraw.Draw(canvas)
    for row, theme in enumerate(THEMES):
        y = margin + row * (thumb_h + header_h + margin)
        draw.text((margin, y + header_h + 48), theme.folder, fill=(20, 20, 20))
        theme_outputs = [o for o in manifest_outputs if o["theme"] == theme.slug]
        for col, item in enumerate(theme_outputs[:4]):
            x = label_w + margin + col * (thumb_w + margin)
            draw.text((x, y), f"{item['set']} {item['variant_index']}", fill=(20, 20, 20))
            image = Image.open(item["drive_path"]).convert("RGB")
            image.thumbnail((thumb_w, thumb_h), Image.LANCZOS)
            bg = Image.new("RGB", (thumb_w, thumb_h), "white")
            bg.paste(image, ((thumb_w - image.width) // 2, (thumb_h - image.height) // 2))
            canvas.paste(bg, (x, y + header_h))
    canvas.save(sheet_path)
    return sheet_path


def main() -> None:
    gen.ensure_api_ready()
    gen.WORKFLOW_OUT.mkdir(parents=True, exist_ok=True)
    gen.DRIVE_ROOT.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    rng = Random(run_id + "_variation")
    outputs: list[dict[str, object]] = []
    settings = {
        "api": gen.API,
        "model": gen.MODEL,
        "text_encoder": gen.TEXT_ENCODER,
        "text_encoder_type": "lumina2",
        "vae": gen.VAE,
        "width": gen.WIDTH,
        "height": gen.HEIGHT,
        "aspect_ratio": "16:9",
        "steps": gen.STEPS,
        "cfg": gen.CFG,
        "sampler_name": gen.SAMPLER,
        "scheduler": gen.SCHEDULER,
        "model_sampling": "ModelSamplingAuraFlow",
        "shift": gen.SHIFT,
        "flux_used": False,
    }

    for theme_index, theme in enumerate(THEMES, start=1):
        folder = gen.DRIVE_ROOT / theme.folder
        folder.mkdir(parents=True, exist_ok=True)
        print(f"[{theme_index:02d}/{len(THEMES):02d}] {theme.slug}", flush=True)
        for set_info in theme.sets:
            for variant_index, variant in enumerate(set_info.variants, start=1):
                seed = rng.randint(1, 2_147_483_647)
                prompt = f"{theme.base}, {set_info.direction}, {variant}, {COMMON_STRICT}"
                stem = f"{run_id}_{theme.slug}_{set_info.name}_{variant_index:02d}_16x9_{seed}"
                graph = gen.workflow(prompt, seed, f"codex_youtube_variation_{stem}")
                response = gen.http_json(
                    "/prompt",
                    {"client_id": str(uuid.uuid4()), "prompt": graph},
                    timeout=30,
                )
                prompt_id = response["prompt_id"]
                print(f"  - {set_info.name} {variant_index}/2 queued {prompt_id} seed={seed}", flush=True)
                entry = gen.wait_for_prompt(prompt_id)
                source = gen.extract_first_image(entry)
                destination = folder / f"{stem}.png"
                shutil.copy2(source, destination)
                outputs.append(
                    {
                        "theme": theme.slug,
                        "folder": theme.folder,
                        "set": set_info.name,
                        "variant_index": variant_index,
                        "variant": variant,
                        "seed": seed,
                        "prompt_id": prompt_id,
                        "prompt": prompt,
                        "source_path": str(source).replace("\\", "/"),
                        "drive_path": str(destination).replace("\\", "/"),
                    }
                )

    sheet = make_variation_sheet(run_id, outputs)
    manifest = {
        "run_id": run_id,
        "created_at_kst": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "purpose": "YouTube AI music image variation batch, 10 concepts x 2 sets x 2 images.",
        "settings": settings,
        "outputs": outputs,
        "contact_sheet": str(sheet).replace("\\", "/"),
    }
    manifest_path = gen.WORKFLOW_OUT / f"{run_id}_youtube_ai_music_variation_10themes_40images.meta.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"manifest": str(manifest_path), "contact_sheet": str(sheet)}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()

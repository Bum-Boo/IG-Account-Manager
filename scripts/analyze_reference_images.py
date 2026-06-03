from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Sequence


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
CATEGORY_MAP = {
    "backgrounds": ("background", "bg"),
    "background": ("background", "bg"),
    "outfits": ("outfit", "outfit"),
    "outfit": ("outfit", "outfit"),
    "props": ("prop", "prop"),
    "prop": ("prop", "prop"),
    "poses": ("pose", "pose"),
    "pose": ("pose", "pose"),
    "lighting": ("lighting", "light"),
    "makeup_hair": ("makeup_hair", "mh"),
    "mood": ("mood", "mood")
}


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create editable JSON drafts from local reference image files.")
    parser.add_argument("--category", required=True, choices=sorted(CATEGORY_MAP), help="Reference category to draft.")
    parser.add_argument("--input", required=True, help="Folder containing local image files.")
    parser.add_argument("--output", required=True, help="Draft JSON output path.")
    args = parser.parse_args(argv)

    input_dir = Path(args.input)
    if not input_dir.exists() or not input_dir.is_dir():
        parser.error(f"input folder does not exist: {input_dir}")

    category, prefix = CATEGORY_MAP[args.category]
    folder_slug = _slug(input_dir.name)
    source_folder = _source_folder(input_dir)
    files = sorted(path for path in input_dir.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)
    items = [
        _draft_item(category=category, prefix=prefix, folder_slug=folder_slug, index=index, source_folder=source_folder, source_file=path.name)
        for index, path in enumerate(files, start=1)
    ]
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(items, file, indent=2, ensure_ascii=False)
        file.write("\n")

    print(f"Wrote {len(items)} draft items to {output_path}")
    return 0


def _draft_item(category: str, prefix: str, folder_slug: str, index: int, source_folder: str, source_file: str) -> dict[str, Any]:
    base = {
        "id": f"{prefix}_{folder_slug}_{index:03d}",
        "category": category,
        "source_folder": source_folder,
        "source_file": source_file,
        "visual_summary": "TODO: describe the abstract visual elements",
        "usable_prompt": "TODO: write a reusable prompt fragment",
        "style_tags": [],
        "avoid": [],
        "source_note": "Use as abstract visual reference only, not for direct reproduction."
    }

    if category == "background":
        base.update(
            {
                "elements": {
                    "space_type": "TODO",
                    "main_surface": "TODO",
                    "floor": "TODO",
                    "objects": [],
                    "clutter_level": "TODO"
                },
                "lighting_hint": "TODO",
                "composition_hint": "TODO"
            }
        )
    elif category == "prop":
        base.update(
            {
                "name": "TODO",
                "interaction_prompt": "TODO",
                "hand_complexity": "low",
                "requires_hand_interaction": True,
                "best_poses": []
            }
        )
    elif category == "outfit":
        base.update(
            {
                "gender_fit": "TODO",
                "style_family": "TODO",
                "fabric_details": [],
                "silhouette": "TODO",
                "silhouette_complexity": "low",
                "color_palette": [],
                "best_backgrounds": []
            }
        )
    elif category == "pose":
        base.update(
            {
                "pose_type": "TODO",
                "body_logic": {
                    "weight_distribution": "TODO",
                    "leg_position": "TODO",
                    "arm_position": "TODO",
                    "head_direction": "TODO"
                },
                "difficulty": "low",
                "hands_visible": True,
                "best_for": []
            }
        )
    elif category == "lighting":
        base.update(
            {
                "light_type": "TODO",
                "main_light": "TODO",
                "fill_light": "TODO",
                "rim_light": "TODO",
                "shadow_style": "TODO",
                "best_backgrounds": []
            }
        )
    elif category == "makeup_hair":
        base.update({"finish": "TODO", "hair_style": "TODO", "makeup_style": "TODO"})
    elif category == "mood":
        base.update({"emotion": "TODO", "expression_prompt": "TODO"})

    return base


def _source_folder(path: Path) -> str:
    parts = path.parts

    if "reference_library" in parts:
        index = parts.index("reference_library")
        return "/".join(parts[index + 1 :])

    return path.as_posix()


def _slug(value: str) -> str:
    lowered = value.strip().lower()
    slug = "".join(char if char.isalnum() else "_" for char in lowered)
    return "_".join(part for part in slug.split("_") if part) or "reference"


if __name__ == "__main__":
    raise SystemExit(main())

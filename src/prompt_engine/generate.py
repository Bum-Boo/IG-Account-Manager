from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Sequence

from .engine import PromptEngineError, compose_prompt


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate a Gurrimming_ref Z-Image Turbo prompt package.")
    parser.add_argument("--recipe", required=True, help="Path to a prompt recipe JSON file.")
    parser.add_argument("--data-dir", default="reference_data", help="Directory containing reference JSON data.")
    parser.add_argument("--output", help="Output JSON path. Defaults to timestamped outputs/prompts file.")
    parser.add_argument("--caption-output", help="Output TXT path. Defaults to matching outputs/captions file.")
    parser.add_argument("--seed", help="Optional random seed for recipes using random selections.")
    args = parser.parse_args(argv)

    recipe_path = Path(args.recipe)
    with recipe_path.open("r", encoding="utf-8") as file:
        recipe = json.load(file)

    if args.seed is not None:
        recipe["seed"] = args.seed

    try:
        result = compose_prompt(recipe, data_dir=args.data_dir)
    except PromptEngineError as error:
        parser.exit(2, f"prompt generation failed: {error}\n")

    json_path = Path(args.output) if args.output else _default_json_path(recipe)
    txt_path = Path(args.caption_output) if args.caption_output else Path("outputs/captions") / f"{json_path.stem}.txt"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    txt_path.parent.mkdir(parents=True, exist_ok=True)

    with json_path.open("w", encoding="utf-8") as file:
        json.dump(result, file, indent=2, ensure_ascii=False)
        file.write("\n")

    with txt_path.open("w", encoding="utf-8") as file:
        file.write(_caption_text(result))

    print(f"Wrote prompt package: {json_path}")
    print(f"Wrote caption package: {txt_path}")
    return 0


def _default_json_path(recipe: dict[str, object]) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_style = str(recipe.get("base_style") or "prompt").replace("white_studio_fashion_pose_reference", "white_studio")
    concept = str(recipe.get("account_concept") or "gurrimming").lower()
    stem = f"{timestamp}_{concept}_{base_style}".replace("__", "_")
    return Path("outputs/prompts") / f"{stem}.json"


def _caption_text(result: dict[str, object]) -> str:
    hashtags = result.get("hashtags", [])
    tag_line = " ".join(str(tag) for tag in hashtags) if isinstance(hashtags, list) else str(hashtags)

    return (
        "Instagram Caption:\n"
        f"{result.get('instagram_caption', '')}\n\n"
        "Pinned Comment Prompt:\n"
        f"{result.get('pinned_comment_prompt', '')}\n\n"
        "Hashtags:\n"
        f"{tag_line}\n\n"
        "Alt Text:\n"
        f"{result.get('alt_text', '')}\n"
    )


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Sequence


ROOT = Path(__file__).resolve().parents[1]
REFERENCE_DATA = ROOT / "reference_data"
SCHEMAS = ROOT / "schemas"

ASSET_FILES = {
    "backgrounds": ("background", REFERENCE_DATA / "backgrounds.json"),
    "outfits": ("outfit", REFERENCE_DATA / "outfits.json"),
    "props": ("prop", REFERENCE_DATA / "props.json"),
    "poses": ("pose", REFERENCE_DATA / "poses.json"),
    "lighting": ("lighting", REFERENCE_DATA / "lighting.json"),
    "makeup_hair": ("makeup_hair", REFERENCE_DATA / "makeup_hair.json"),
    "mood": ("mood", REFERENCE_DATA / "mood.json")
}

SCHEMA_FILES = [
    "background.schema.json",
    "outfit.schema.json",
    "prop.schema.json",
    "pose.schema.json",
    "lighting.schema.json",
    "makeup_hair.schema.json",
    "mood.schema.json",
    "prompt_recipe.schema.json",
    "generation_rules.schema.json"
]

COMMON_REQUIRED = ["id", "category", "source_folder", "visual_summary", "usable_prompt", "style_tags", "avoid", "source_note"]
CATEGORY_REQUIRED = {
    "background": ["elements"],
    "outfit": ["gender_fit", "style_family", "fabric_details", "silhouette", "color_palette", "best_backgrounds"],
    "prop": ["name", "interaction_prompt", "hand_complexity", "best_poses"],
    "pose": ["pose_type", "body_logic", "difficulty", "best_for"],
    "lighting": ["light_type", "main_light", "fill_light", "rim_light", "shadow_style", "best_backgrounds"],
    "makeup_hair": [],
    "mood": []
}


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate Gurrimming_ref reference JSON files.")
    parser.add_argument("--draft", action="store_true", help="Validate only draft files and allow TODO values.")
    args = parser.parse_args(argv)

    errors: list[str] = []

    if args.draft:
        errors.extend(_validate_drafts())
    else:
        errors.extend(_validate_schemas())
        errors.extend(_validate_final_assets())
        errors.extend(_validate_generation_rules())
        errors.extend(_validate_prompt_recipes())
        errors.extend(_validate_drafts())

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("JSON validation passed.")
    return 0


def _validate_schemas() -> list[str]:
    errors: list[str] = []

    for filename in SCHEMA_FILES:
        path = SCHEMAS / filename
        if not path.exists():
            errors.append(f"Missing schema file: {path}")
            continue
        _load_json(path, errors)

    return errors


def _validate_final_assets() -> list[str]:
    errors: list[str] = []

    for label, (category, path) in ASSET_FILES.items():
        value = _load_json(path, errors)
        if value is None:
            continue
        if not isinstance(value, list):
            errors.append(f"{path} must contain a JSON array.")
            continue
        errors.extend(_validate_asset_list(path, value, expected_category=category, draft=False))

    return errors


def _validate_asset_list(path: Path, items: list[Any], expected_category: str | None, draft: bool) -> list[str]:
    errors: list[str] = []
    seen_ids: set[str] = set()

    for index, item in enumerate(items):
        location = f"{path}[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{location} must be an object.")
            continue

        category = str(item.get("category", expected_category or "")).strip()
        required = COMMON_REQUIRED + CATEGORY_REQUIRED.get(category, [])

        for key in required:
            if key not in item:
                errors.append(f"{location} is missing required field '{key}'.")

        item_id = item.get("id")
        if not isinstance(item_id, str) or not item_id.strip():
            errors.append(f"{location} must have a non-empty id.")
        elif item_id in seen_ids:
            errors.append(f"{path} contains duplicate id '{item_id}'.")
        else:
            seen_ids.add(item_id)

        if expected_category and category != expected_category:
            errors.append(f"{location} category must be '{expected_category}', got '{category}'.")

        usable_prompt = item.get("usable_prompt")
        if not draft and (not isinstance(usable_prompt, str) or not usable_prompt.strip()):
            errors.append(f"{location} usable_prompt must not be empty in final data.")

        if not draft and _contains_todo(item):
            errors.append(f"{location} contains TODO text; final data must be reviewed.")

    return errors


def _validate_generation_rules() -> list[str]:
    errors: list[str] = []
    path = REFERENCE_DATA / "generation_rules.json"
    rules = _load_json(path, errors)
    if not isinstance(rules, dict):
        errors.append(f"{path} must contain a JSON object.")
        return errors

    for key in [
        "max_props",
        "allow_multiple_complex_items",
        "if_pose_difficulty_high_then_prop_complexity",
        "if_background_is_white_studio_then_clutter_level",
        "if_full_body_then_require_visible_shoes",
        "if_prop_requires_hand_interaction_then_hands_visible",
        "default_output_format"
    ]:
        if key not in rules:
            errors.append(f"{path} is missing '{key}'.")

    output_format = rules.get("default_output_format")
    if isinstance(output_format, dict) and output_format.get("hashtags_count") != 5:
        errors.append("generation_rules.default_output_format.hashtags_count must be 5.")

    return errors


def _validate_prompt_recipes() -> list[str]:
    errors: list[str] = []
    aggregate = REFERENCE_DATA / "prompt_recipes.json"
    aggregate_value = _load_json(aggregate, errors)

    if aggregate_value is not None and not isinstance(aggregate_value, list):
        errors.append(f"{aggregate} must contain a JSON array.")

    recipe_dir = REFERENCE_DATA / "prompt_recipes"
    if not recipe_dir.exists():
        errors.append(f"Missing prompt recipe directory: {recipe_dir}")
        return errors

    for path in sorted(recipe_dir.glob("*.json")):
        recipe = _load_json(path, errors)
        if isinstance(recipe, dict):
            errors.extend(_validate_recipe(path, recipe))

    return errors


def _validate_recipe(path: Path, recipe: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    for key in ["account_concept", "base_style", "model_type", "background_id", "pose_id", "outfit_id", "lighting_id", "output_targets"]:
        if key not in recipe:
            errors.append(f"{path} is missing recipe field '{key}'.")

    if recipe.get("model_type") not in {"female", "male", "neutral"}:
        errors.append(f"{path} model_type must be female, male, or neutral.")

    if not isinstance(recipe.get("output_targets"), list):
        errors.append(f"{path} output_targets must be an array.")

    if _contains_todo(recipe):
        errors.append(f"{path} contains TODO text.")

    return errors


def _validate_drafts() -> list[str]:
    errors: list[str] = []
    draft_dir = REFERENCE_DATA / "drafts"

    if not draft_dir.exists():
        return errors

    for path in sorted(draft_dir.glob("*.json")):
        value = _load_json(path, errors)
        if value is None:
            continue
        if not isinstance(value, list):
            errors.append(f"{path} must contain a JSON array.")
            continue
        errors.extend(_validate_asset_list(path, value, expected_category=None, draft=True))

    return errors


def _load_json(path: Path, errors: list[str]) -> Any:
    if not path.exists():
        errors.append(f"Missing JSON file: {path}")
        return None

    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except json.JSONDecodeError as error:
        errors.append(f"{path} is invalid JSON: {error}")
        return None


def _contains_todo(value: Any) -> bool:
    if isinstance(value, str):
        return "TODO" in value
    if isinstance(value, list):
        return any(_contains_todo(item) for item in value)
    if isinstance(value, dict):
        return any(_contains_todo(item) for item in value.values())
    return False


if __name__ == "__main__":
    raise SystemExit(main())

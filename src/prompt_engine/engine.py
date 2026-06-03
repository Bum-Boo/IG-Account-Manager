from __future__ import annotations

import json
import random
from copy import deepcopy
from pathlib import Path
from typing import Any


ASSET_FILES = {
    "backgrounds": "backgrounds.json",
    "outfits": "outfits.json",
    "props": "props.json",
    "poses": "poses.json",
    "lighting": "lighting.json",
    "makeup_hair": "makeup_hair.json",
    "mood": "mood.json"
}

CATEGORY_ALIASES = {
    "background": "backgrounds",
    "backgrounds": "backgrounds",
    "outfit": "outfits",
    "outfits": "outfits",
    "prop": "props",
    "props": "props",
    "pose": "poses",
    "poses": "poses",
    "lighting": "lighting",
    "makeup_hair": "makeup_hair",
    "mood": "mood"
}

BASE_STYLES = {
    "white_studio_fashion_pose_reference": (
        "realistic full-body fashion pose reference photo, clean pure white photography studio, "
        "vertical centered composition, high-key soft studio lighting, seamless white cyc wall, "
        "professional Instagram visual reference post"
    )
}

MODEL_PRESETS = {
    "female": (
        "one clear adult Korean female fashion model with fair light skin, good proportions, long legs, "
        "and a slim elegant editorial fashion body"
    ),
    "male": (
        "one clear adult Korean male fashion model with fair light skin, good proportions, long legs, "
        "and a natural street-fashion editorial appearance"
    ),
    "neutral": (
        "one clear adult Korean fashion model with fair light skin, good proportions, long legs, "
        "and a clean fashion editorial appearance"
    )
}

QUALITY_CLAUSE = (
    "realistic skin texture, natural pores, subtle makeup, detailed hair strands, believable fabric texture, "
    "clean fingers, natural joints, balanced body proportions, sharp focus, neutral white balance, "
    "professional fashion catalog photography"
)

STABILITY_CLAUSE = (
    "plain white background, no furniture, no extra objects, no text, no logos, no duplicated limbs, "
    "no distorted hands, no extra fingers, no plastic skin, no cartoon look, no CGI appearance, "
    "no overly yellow skin tone"
)

DEFAULT_HASHTAGS = [
    "#posereference",
    "#fashionreference",
    "#studiophotography",
    "#characterdesign",
    "#artistreference"
]


class PromptEngineError(ValueError):
    """Raised when a recipe or asset combination cannot produce a stable prompt."""


def load_assets(data_dir: str | Path = "reference_data") -> dict[str, list[dict[str, Any]]]:
    root = Path(data_dir)
    assets: dict[str, list[dict[str, Any]]] = {}

    for category, filename in ASSET_FILES.items():
        path = root / filename
        if not path.exists():
            assets[category] = []
            continue

        with path.open("r", encoding="utf-8") as file:
            value = json.load(file)

        if not isinstance(value, list):
            raise PromptEngineError(f"{path} must contain a JSON array.")

        assets[category] = value

    return assets


def get_asset_by_id(
    category: str,
    asset_id: str,
    assets: dict[str, list[dict[str, Any]]] | None = None,
    data_dir: str | Path = "reference_data"
) -> dict[str, Any]:
    store = assets if assets is not None else load_assets(data_dir)
    normalized = _category_key(category)

    for asset in store.get(normalized, []):
        if asset.get("id") == asset_id:
            return asset

    raise PromptEngineError(f"{category} asset '{asset_id}' was not found.")


def validate_recipe(
    recipe: dict[str, Any],
    assets: dict[str, list[dict[str, Any]]] | None = None,
    rules: dict[str, Any] | None = None,
    data_dir: str | Path = "reference_data"
) -> list[str]:
    store = assets if assets is not None else load_assets(data_dir)
    generation_rules = rules if rules is not None else _load_rules(data_dir)
    errors: list[str] = []

    for key in ["account_concept", "base_style", "model_type", "background_id", "pose_id", "outfit_id", "lighting_id"]:
        if not _nonempty_string(recipe.get(key)):
            errors.append(f"Recipe field '{key}' is required.")

    model_type = recipe.get("model_type")
    if model_type and model_type not in MODEL_PRESETS:
        errors.append("Recipe field 'model_type' must be female, male, or neutral.")

    if errors:
        return errors

    try:
        resolved = _resolve_assets(recipe, store, generation_rules)
    except PromptEngineError as error:
        return [str(error)]

    errors.extend(_missing_prompt_errors(resolved))
    errors.extend(_compatibility_errors(recipe, resolved, generation_rules))
    return errors


def compose_prompt(
    recipe: dict[str, Any],
    assets: dict[str, list[dict[str, Any]]] | None = None,
    rules: dict[str, Any] | None = None,
    data_dir: str | Path = "reference_data"
) -> dict[str, Any]:
    store = assets if assets is not None else load_assets(data_dir)
    generation_rules = rules if rules is not None else _load_rules(data_dir)
    errors = validate_recipe(recipe, assets=store, rules=generation_rules, data_dir=data_dir)

    if errors:
        raise PromptEngineError("; ".join(errors))

    resolved = _resolve_assets(recipe, store, generation_rules)
    base_style = BASE_STYLES.get(recipe["base_style"], recipe["base_style"])
    model = MODEL_PRESETS[recipe["model_type"]]
    prompt_parts = [
        base_style,
        model,
        resolved["background"]["usable_prompt"],
        resolved["pose"]["usable_prompt"],
        resolved["outfit"]["usable_prompt"],
        _optional_prompt(resolved.get("prop")),
        resolved["lighting"]["usable_prompt"],
        _optional_prompt(resolved.get("makeup_hair")),
        _optional_prompt(resolved.get("mood")),
        _visibility_clause(recipe, resolved),
        QUALITY_CLAUSE,
        STABILITY_CLAUSE
    ]
    main_prompt = _join_prompt_parts(prompt_parts)
    compact_prompt = make_compact_prompt(main_prompt, max_chars=800)

    prompt_result = {
        "main_prompt": main_prompt,
        "compact_prompt": compact_prompt,
        "selected_assets": {key: value for key, value in resolved.items() if value is not None},
        "recipe": recipe,
        "compatibility_notes": ["Recipe passed Gurrimming_ref compatibility rules."],
        "z_image_turbo_prompt": main_prompt,
        "z_image_turbo_compact_prompt": compact_prompt,
        "recommended_aspect_ratio": "vertical",
        "recommended_use": "full-body white studio fashion pose reference"
    }

    prompt_result.update(generate_instagram_package(prompt_result))
    return prompt_result


def make_compact_prompt(main_prompt: str, max_chars: int = 800) -> str:
    clean = " ".join(main_prompt.split())

    if len(clean) <= max_chars:
        return clean

    clauses = [part.strip() for part in clean.replace("; ", ", ").split(",") if part.strip()]
    compact = ""

    for clause in clauses:
        candidate = clause if not compact else f"{compact}, {clause}"
        if len(candidate) > max_chars:
            break
        compact = candidate

    if compact:
        return compact

    return clean[: max_chars - 1].rsplit(" ", 1)[0].rstrip(", ") + "."


def generate_instagram_package(prompt_result: dict[str, Any]) -> dict[str, Any]:
    selected = prompt_result.get("selected_assets", {})
    background = selected.get("background", {})
    pose = selected.get("pose", {})
    outfit = selected.get("outfit", {})
    prop = selected.get("prop")
    mood = selected.get("mood", {})

    prop_phrase = f" with {prop.get('name')}" if isinstance(prop, dict) and prop.get("name") else ""
    caption = (
        "White studio fashion pose reference: "
        f"{_asset_summary(outfit)} / {_asset_summary(pose)}{prop_phrase}."
    )
    pinned_comment = f"Prompt reference: {prompt_result['compact_prompt']}"
    alt_text = (
        "Full-body realistic Korean fashion model in a clean white studio, "
        f"wearing {_asset_summary(outfit)}, {_asset_summary(pose)}, "
        f"with {_asset_summary(background)} and {_asset_summary(mood)} mood."
    )

    return {
        "instagram_caption": caption,
        "pinned_comment_prompt": pinned_comment,
        "hashtags": DEFAULT_HASHTAGS.copy(),
        "alt_text": alt_text
    }


def _resolve_assets(
    recipe: dict[str, Any],
    assets: dict[str, list[dict[str, Any]]],
    rules: dict[str, Any]
) -> dict[str, dict[str, Any] | None]:
    rng = random.Random(str(recipe.get("seed", "gurrimming_ref")))
    resolved: dict[str, dict[str, Any] | None] = {
        "background": _resolve_one(recipe, "background_id", "backgrounds", assets, rng, True),
        "pose": _resolve_one(recipe, "pose_id", "poses", assets, rng, True),
        "outfit": _resolve_one(recipe, "outfit_id", "outfits", assets, rng, True),
        "lighting": _resolve_one(recipe, "lighting_id", "lighting", assets, rng, True),
        "makeup_hair": _resolve_one(recipe, "makeup_hair_id", "makeup_hair", assets, rng, False),
        "mood": _resolve_one(recipe, "mood_id", "mood", assets, rng, False),
        "prop": None
    }

    prop_id = recipe.get("prop_id")
    if _is_none_selection(prop_id):
        return resolved

    if prop_id == "random":
        candidates = deepcopy(assets.get("props", []))
        rng.shuffle(candidates)

        for candidate in candidates:
            test = {**resolved, "prop": candidate}
            if not _compatibility_errors(recipe, test, rules) and not _missing_prompt_errors(test):
                resolved["prop"] = candidate
                return resolved

        raise PromptEngineError("No compatible random prop was found for the selected recipe.")

    resolved["prop"] = _resolve_one(recipe, "prop_id", "props", assets, rng, False)
    return resolved


def _resolve_one(
    recipe: dict[str, Any],
    key: str,
    category: str,
    assets: dict[str, list[dict[str, Any]]],
    rng: random.Random,
    required: bool
) -> dict[str, Any] | None:
    value = recipe.get(key)

    if _is_none_selection(value):
        if required:
            raise PromptEngineError(f"Recipe field '{key}' is required.")
        return None

    candidates = assets.get(category, [])

    if value == "random":
        if not candidates:
            raise PromptEngineError(f"No assets are available for random selection in '{category}'.")
        return deepcopy(rng.choice(candidates))

    for asset in candidates:
        if asset.get("id") == value:
            return deepcopy(asset)

    raise PromptEngineError(f"{category} asset '{value}' was not found.")


def _missing_prompt_errors(resolved: dict[str, dict[str, Any] | None]) -> list[str]:
    errors: list[str] = []

    for role, asset in resolved.items():
        if asset is None:
            continue
        if not _nonempty_string(asset.get("usable_prompt")):
            errors.append(f"Selected {role} asset '{asset.get('id', 'unknown')}' is missing usable_prompt.")

    return errors


def _compatibility_errors(
    recipe: dict[str, Any],
    resolved: dict[str, dict[str, Any] | None],
    rules: dict[str, Any]
) -> list[str]:
    errors: list[str] = []
    background = resolved.get("background")
    pose = resolved.get("pose")
    outfit = resolved.get("outfit")
    prop = resolved.get("prop")
    lighting = resolved.get("lighting")

    if prop and int(rules.get("max_props", 1)) < 1:
        errors.append("Generation rules do not allow props.")

    if background and _is_white_studio(background):
        clutter_level = str(background.get("elements", {}).get("clutter_level", "")).lower()
        required_clutter = str(rules.get("if_background_is_white_studio_then_clutter_level", "none")).lower()
        if clutter_level != required_clutter:
            errors.append("White studio backgrounds must have clutter_level 'none'.")

    if pose and prop:
        pose_difficulty = str(pose.get("difficulty", "")).lower()
        hand_complexity = str(prop.get("hand_complexity", "")).lower()
        if pose_difficulty == "high" and hand_complexity != rules.get("if_pose_difficulty_high_then_prop_complexity", "low"):
            errors.append("High-difficulty poses can only use low-complexity hand props.")

        if prop.get("requires_hand_interaction") is True and pose.get("hands_visible") is not True:
            errors.append("Props requiring hand interaction need a pose with visible hands.")

        best_poses = set(str(value).lower() for value in prop.get("best_poses", []))
        if best_poses and str(pose.get("pose_type", "")).lower() not in best_poses:
            errors.append(f"Prop '{prop.get('id')}' is not recommended for pose type '{pose.get('pose_type')}'.")

    if outfit and prop:
        outfit_complexity = str(outfit.get("silhouette_complexity", "low")).lower()
        prop_complexity = str(prop.get("hand_complexity", "low")).lower()
        if outfit_complexity == "high" and prop_complexity != "low":
            errors.append("Complex outfit silhouettes should only use low-complexity props.")

        if rules.get("allow_multiple_complex_items") is False:
            complex_items = [value for value in [outfit_complexity, prop_complexity] if value == "high"]
            if pose and str(pose.get("difficulty", "")).lower() == "high":
                complex_items.append("high")
            if len(complex_items) > 1:
                errors.append("Multiple high-complexity items are not allowed in one recipe.")

    if lighting and background:
        best_backgrounds = set(str(value).lower() for value in lighting.get("best_backgrounds", []))
        background_keys = _background_keys(background)
        if best_backgrounds and not best_backgrounds.intersection(background_keys):
            errors.append(f"Lighting '{lighting.get('id')}' is not compatible with background '{background.get('id')}'.")

    if rules.get("if_full_body_then_require_visible_shoes") and _is_full_body(recipe, pose):
        if outfit and outfit.get("visible_shoes") is False:
            errors.append("Full-body recipes require visible shoes.")

    if rules.get("if_prop_requires_hand_interaction_then_hands_visible") and prop and prop.get("requires_hand_interaction"):
        if pose and pose.get("hands_visible") is not True:
            errors.append("Hand-interaction props require visible hands.")

    return errors


def _visibility_clause(recipe: dict[str, Any], resolved: dict[str, dict[str, Any] | None]) -> str:
    pose = resolved.get("pose")

    if _is_full_body(recipe, pose):
        return "full body visible from head to shoes, shoes visible, both hands visible, clean readable silhouette"

    if pose and pose.get("hands_visible"):
        return "both hands visible, clean readable silhouette"

    return "clean readable silhouette"


def _load_rules(data_dir: str | Path) -> dict[str, Any]:
    path = Path(data_dir) / "generation_rules.json"

    if not path.exists():
        return {"max_props": 1, "allow_multiple_complex_items": False}

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _category_key(category: str) -> str:
    normalized = CATEGORY_ALIASES.get(category)

    if not normalized:
        raise PromptEngineError(f"Unknown asset category '{category}'.")

    return normalized


def _optional_prompt(asset: dict[str, Any] | None) -> str | None:
    if asset is None:
        return None
    return str(asset.get("usable_prompt", "")).strip() or None


def _join_prompt_parts(parts: list[str | None]) -> str:
    cleaned: list[str] = []
    seen = set()

    for part in parts:
        if not part:
            continue
        compact = " ".join(part.split())
        key = compact.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(compact.rstrip("."))

    return ", ".join(cleaned).strip()


def _is_none_selection(value: Any) -> bool:
    return value is None or value == "" or value == "none"


def _nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _is_white_studio(background: dict[str, Any] | None) -> bool:
    if not background:
        return False
    tokens = _background_keys(background)
    return "white_studio" in tokens


def _background_keys(background: dict[str, Any]) -> set[str]:
    source = str(background.get("source_folder", "")).lower().replace("\\", "/")
    tags = {str(value).lower() for value in background.get("style_tags", [])}
    keys = set(source.split("/")) | tags
    keys.add(str(background.get("id", "")).lower())
    return keys


def _is_full_body(recipe: dict[str, Any], pose: dict[str, Any] | None) -> bool:
    if "full-body" in str(recipe.get("base_style", "")).lower() or "full_body" in str(recipe.get("base_style", "")).lower():
        return True

    if pose and any(str(value).lower() == "full_body" for value in pose.get("best_for", [])):
        return True

    return False


def _asset_summary(asset: Any) -> str:
    if not isinstance(asset, dict):
        return "clean studio styling"
    return str(asset.get("visual_summary") or asset.get("usable_prompt") or asset.get("id") or "clean studio styling")

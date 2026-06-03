from __future__ import annotations

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from src.prompt_engine import PromptEngineError, compose_prompt, load_assets, make_compact_prompt


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "reference_data"
RECIPE_PATH = DATA_DIR / "prompt_recipes" / "gurrimming_white_studio_example.json"


class PromptEngineTests(unittest.TestCase):
    def load_recipe(self) -> dict[str, object]:
        with RECIPE_PATH.open("r", encoding="utf-8") as file:
            return json.load(file)

    def test_valid_white_studio_recipe(self) -> None:
        result = compose_prompt(self.load_recipe(), data_dir=DATA_DIR)

        self.assertIn("clean pure white photography studio", result["main_prompt"])
        self.assertIn("z_image_turbo_prompt", result)
        self.assertEqual(result["recommended_aspect_ratio"], "vertical")
        self.assertEqual(len(result["hashtags"]), 5)

    def test_invalid_high_complexity_prop_with_high_difficulty_pose(self) -> None:
        assets = load_assets(DATA_DIR)
        recipe = self.load_recipe()
        modified = copy.deepcopy(assets)
        modified["poses"][0]["difficulty"] = "high"
        modified["props"][0]["hand_complexity"] = "high"

        with self.assertRaises(PromptEngineError) as context:
            compose_prompt(recipe, assets=modified, data_dir=DATA_DIR)

        self.assertIn("High-difficulty poses", str(context.exception))

    def test_missing_usable_prompt_is_rejected(self) -> None:
        assets = load_assets(DATA_DIR)
        recipe = self.load_recipe()
        modified = copy.deepcopy(assets)
        modified["outfits"][0]["usable_prompt"] = ""

        with self.assertRaises(PromptEngineError) as context:
            compose_prompt(recipe, assets=modified, data_dir=DATA_DIR)

        self.assertIn("missing usable_prompt", str(context.exception))

    def test_compact_prompt_length_under_800(self) -> None:
        result = compose_prompt(self.load_recipe(), data_dir=DATA_DIR)

        self.assertLessEqual(len(result["compact_prompt"]), 800)
        self.assertLessEqual(len(make_compact_prompt(result["main_prompt"], max_chars=800)), 800)

    def test_hashtag_count_exactly_five(self) -> None:
        result = compose_prompt(self.load_recipe(), data_dir=DATA_DIR)

        self.assertEqual(result["hashtags"], [
            "#posereference",
            "#fashionreference",
            "#studiophotography",
            "#characterdesign",
            "#artistreference"
        ])

    def test_random_recipe_respects_compatibility_rules(self) -> None:
        recipe = self.load_recipe()
        recipe.update(
            {
                "background_id": "random",
                "pose_id": "random",
                "outfit_id": "random",
                "prop_id": "random",
                "lighting_id": "random",
                "makeup_hair_id": "random",
                "mood_id": "random",
                "seed": "random-smoke"
            }
        )
        result = compose_prompt(recipe, data_dir=DATA_DIR)

        self.assertEqual(result["compatibility_notes"], ["Recipe passed Gurrimming_ref compatibility rules."])

    def test_cli_smoke_writes_json_and_caption(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output_json = Path(tmp) / "prompt.json"
            output_txt = Path(tmp) / "caption.txt"
            completed = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "src.prompt_engine.generate",
                    "--recipe",
                    str(RECIPE_PATH),
                    "--data-dir",
                    str(DATA_DIR),
                    "--output",
                    str(output_json),
                    "--caption-output",
                    str(output_txt)
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)
            self.assertTrue(output_json.exists())
            self.assertTrue(output_txt.exists())

            with output_json.open("r", encoding="utf-8") as file:
                payload = json.load(file)

            self.assertIn("z_image_turbo_compact_prompt", payload)
            self.assertIn("Instagram Caption:", output_txt.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()

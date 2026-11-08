#!/usr/bin/env python3
"""Convert the supplied wger fixture catalogue into RED Fit's attributed JSON import.

Run after tools/import-source-archives.py:
    python tools/convert-wger-fixtures.py \
        sources/reference/wger-master --out wger-red-fit-import.json

Every exported record retains its source ID, author and explicit CC license.
No images, descriptions containing HTML, or media links are exported.
Records without source attribution/licence are skipped (reported in stdout).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_fixture(root: Path, relative_path: str) -> list[dict]:
    filename = root / relative_path
    value = json.loads(filename.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError(f"Unexpected wger fixture type: {filename}")
    return value


def convert(root: Path) -> tuple[list[dict], dict]:
    bases = load_fixture(root, "wger/exercises/fixtures/exercise-base-data.json")
    translations = load_fixture(root, "wger/exercises/fixtures/translations.json")
    licences = load_fixture(root, "wger/core/fixtures/licenses.json")
    by_license = {row["pk"]: row["fields"]["short_name"].strip() + " (" + row["fields"]["url"] + ")" for row in licences}

    by_exercise: dict[int, dict[int, dict]] = {}
    for row in translations:
        if row.get("model") != "exercises.translation":
            continue
        fields = row.get("fields", {})
        exercise_id = fields.get("exercise")
        language = fields.get("language")
        if isinstance(exercise_id, int) and language in (1, 2):
            by_exercise.setdefault(exercise_id, {})[language] = fields

    result: list[dict] = []
    skipped = {"missing_name": 0, "missing_credit": 0}
    for row in bases:
        if row.get("model") != "exercises.exercise":
            continue
        exercise_id = row["pk"]
        fields = row["fields"]
        candidate = by_exercise.get(exercise_id, {})
        chosen = candidate.get(1) or candidate.get(2)
        if chosen is None or not str(chosen.get("name") or "").strip():
            skipped["missing_name"] += 1
            continue

        author = str(fields.get("license_author") or "").strip()
        exercise_licence = by_license.get(fields.get("license"))
        translation_author = str(chosen.get("license_author") or "").strip()
        translation_licence = by_license.get(chosen.get("license"))
        if not author or not exercise_licence or not translation_licence:
            skipped["missing_credit"] += 1
            continue

        attribution = author
        if translation_author and translation_author != author:
            attribution += "; translation: " + translation_author
        licence = exercise_licence
        if translation_licence != exercise_licence:
            licence += "; translation: " + translation_licence

        entry = {
            "sourceId": exercise_id,
            "name": str(chosen["name"]).strip()[:160],
            "categoryId": fields.get("category") or 0,
            "muscleIds": fields.get("muscles") or [],
            "secondaryMuscleIds": fields.get("muscles_secondary") or [],
            "equipmentIds": fields.get("equipment") or [],
            "sourceLicense": licence[:300],
            "sourceAuthor": attribution[:300],
        }
        result.append(entry)

    result.sort(key=lambda row: row["sourceId"])
    return result, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("wger_root", type=Path, help="Root containing the wger/ directory")
    parser.add_argument("--out", type=Path, default=Path("wger-red-fit-import.json"))
    args = parser.parse_args()
    rows, skipped = convert(args.wger_root)
    args.out.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"exported": len(rows), "skipped": skipped,
                      "output": str(args.out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

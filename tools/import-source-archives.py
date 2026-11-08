#!/usr/bin/env python3
"""Stage supplied project archives as isolated RED Fit reference sources.

Usage:
python tools/import-source-archives.py openGym-main.zip wger-master.zip dietry-main.zip

The restricted Gym visual media must NOT be reused by RED Fit. A private
repository does not override third-party asset licensing conditions.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import stat
import zipfile
from pathlib import Path, PurePosixPath

EXPECTED = {
    "openGym-main.zip": (
        "openGym-main",
        "7e05a9d05b7401f5b3f1b5a08d1ca63d6f0d55870eccdc2ae3a4c4c79c94ab09",
    ),
    "wger-master.zip": (
        "wger-master",
        "774806d37af477646fc2205c8e687337281c32e279a02ee3b654ebdd1b6717ac",
    ),
    "dietry-main.zip": (
        "dietry-main",
        "047b1c3ce2de972f5e24ed91be8fd340a54ac63e01cf8d986989da32fcba516b",
    ),
}

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as reader:
        while block := reader.read(1024 * 1024):
            digest.update(block)
    return digest.hexdigest()

def import_archive(path: Path, output: Path) -> dict:
    expected = EXPECTED.get(path.name)
    if expected is None:
        raise ValueError(f"Unsupported archive: {path.name}")
    root, expected_sha = expected
    digest = sha256_file(path)
    if digest != expected_sha:
        raise ValueError(f"SHA-256 mismatch for {path.name}; source archive differs from the reviewed version")
    result = {
        "archive": path.name,
        "sha256": digest,
        "files": 0, "excluded": 0,
    }
    with zipfile.ZipFile(path) as archive:
        for item in archive.infolist():
            if item.is_dir():
                continue
            posix = PurePosixPath(item.filename)
            if (
                posix.is_absolute()
                or ".." in posix.parts
                or chr(92) in item.filename
                or not posix.parts
                or posix.parts[0] != root
            ):
                raise ValueError(f"Unsafe ZIP path: {item.filename}")
            if stat.S_ISLNK(item.external_attr >> 16):
                raise ValueError(f"ZIP symlinks are unsupported: {item.filename}")
            relative = PurePosixPath(*posix.parts[1:])
            if root == "openGym-main" and str(relative).startswith("catalogue/media/"):
                result["excluded"] += 1
                continue
            # Do not stage accidentally packaged credentials or local Git data.
            if (
                ".git" in relative.parts
                or (
                    relative.name.startswith(".env")
                    and relative.name not in (".env.example", ".env.sample", ".env.template")
                )
                or relative.name.lower().endswith((".pem", ".key", ".p12", ".pfx", ".sqlite", ".sqlite3"))
            ):
                result["excluded"] += 1
                continue
            if item.file_size > 250 * 1024 * 1024:
                raise ValueError(f"Unexpectedly large ZIP entry: {item.filename}")
            target = output / root / str(relative)
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(item) as reader, target.open("wb") as writer:
                while block := reader.read(1024 * 1024):
                    writer.write(block)
            result["files"] += 1
    return result

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archives", nargs=3, type=Path)
    parser.add_argument("--out", type=Path, default=Path("sources/reference"))
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    report = [import_archive(path, args.out) for path in args.archives]
    (args.out / "IMPORT-MANIFEST.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf8"
    )
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()

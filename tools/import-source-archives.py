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

EXPECTED = {"openGym-main.zip": "openGym-main",
            "wger-master.zip": "wger-master",
            "dietry-main.zip": "dietry-main"}

def import_archive(path: Path, output: Path) -> dict:
    root = EXPECTED.get(path.name)
    if not root:
        raise ValueError(f"Unsupported archive: {path.name}")
    result = {
        "archive": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "files": 0, "excluded": 0,
    }
    with zipfile.ZipFile(path) as archive:
        for item in archive.infolist():
            if item.is_dir():
                continue
            posix = PurePosixPath(item.filename)
            if posix.is_absolute() or ".." in posix.parts or posix.parts[0] != root:
                raise ValueError(f"Unsafe ZIP path: {item.filename}")
            if stat.S_ISLNK(item.external_attr >> 16):
                raise ValueError(f"ZIP symlinks are unsupported: {item.filename}")
            relative = PurePosixPath(*posix.parts[1:])
            if root == "openGym-main" and str(relative).startswith("catalogue/media/"):
                result["excluded"] += 1
                continue
            if relative.name == ".env" or relative.name.endswith((".pem", ".key", ".p12", ".pfx")):
                result["excluded"] += 1
                continue
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

#!/usr/bin/env python3
"""Stage the owner's exact openGym ZIP under vendor/opengym-upstream.

Usage: python3 tools/import-opengym.py openGym-main.zip [--apply]
Default is dry run. Excludes separately licensed Gym visual catalogue/media/
(except NOTICE.md). Does not replace the existing RED Fit runtime.
"""
import argparse
import hashlib
import json
import stat
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "vendor" / "opengym-upstream"
EXPECTED = "7e05a9d05b7401f5b3f1b5a08d1ca63d6f0d55870eccdc2ae3a4c4c79c94ab09"

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("archive", type=Path)
    p.add_argument("--apply", action="store_true")
    args = p.parse_args()
    archive = args.archive
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != EXPECTED:
        p.error("Archive SHA-256 does not match the audited openGym snapshot")
    copied, skipped, total = 0, 0, 0
    seen = set()
    with ZipFile(archive) as z:
        for entry in z.infolist():
            if entry.is_dir():
                continue
            name = entry.filename
            path = PurePosixPath(name)
            if (not name.startswith("openGym-main/") or path.is_absolute()
                    or ".." in path.parts or name in seen
                    or stat.S_IFMT(entry.external_attr >> 16) == stat.S_IFLNK):
                p.error("Unsafe or duplicated archive member: " + name)
            seen.add(name)
            rel = name[len("openGym-main/"):]
            if rel.startswith("catalogue/media/") and rel != "catalogue/media/NOTICE.md":
                skipped += 1
                continue
            data = z.read(entry)
            copied += 1
            total += len(data)
            if args.apply:
                dest = DEST.joinpath(*PurePosixPath(rel).parts)
                if dest.exists():
                    if not dest.is_file() or dest.read_bytes() != data:
                        p.error("Existing source differs; refusing overwrite: " + str(dest))
                    continue  # Already imported byte-for-byte, safe to resume.
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
                if (entry.external_attr >> 16) & 0o111:
                    dest.chmod(dest.stat().st_mode | 0o111)
    print(json.dumps({
        "mode": "applied" if args.apply else "dry-run",
        "source_sha256": digest, "files": copied,
        "bytes": total, "excluded_media_files": skipped,
        "destination": str(DEST)
    }, indent=2))
    if not args.apply:
        print("Re-run with --apply to copy the complete audited non-media source snapshot.")

if __name__ == "__main__":
    main()

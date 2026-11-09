#!/usr/bin/env python3
"""Stage the owner's exact openGym ZIP under vendor/opengym-upstream.

Usage: python3 tools/import-opengym.py openGym-main.zip [--apply] [--include-media]
Default is dry run; separately licensed Gym visual catalogue/media/ assets are
excluded unless --include-media is explicitly selected by a rights holder.
Does not replace the existing RED Fit runtime.
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
    p.add_argument("--include-media", action="store_true",
                   help="Include third-party exercise media ONLY if you have separate reuse rights")
    args = p.parse_args()
    archive = args.archive
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != EXPECTED:
        p.error("Archive SHA-256 does not match the audited openGym snapshot")
    copied, skipped, total = 0, 0, 0
    already_present, crlf_equivalent = 0, 0
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
            if (rel.startswith("catalogue/media/") and rel != "catalogue/media/NOTICE.md"
                    and not args.include_media):
                skipped += 1
                continue
            data = z.read(entry)
            copied += 1
            total += len(data)
            if args.apply:
                dest = DEST.joinpath(*PurePosixPath(rel).parts)
                if dest.exists():
                    if not dest.is_file():
                        p.error("Existing source is not a file: " + str(dest))
                    existing = dest.read_bytes()
                    if existing != data:
                        # Git for Windows may check out tracked text with CRLF.
                        # Accept ONLY a byte-for-byte match after CRLF -> LF.
                        # Keep the existing file unchanged; git add normalizes it.
                        if existing.replace(b"\r\n", b"\n") != data:
                            p.error("Existing source differs; refusing overwrite: " + str(dest))
                        crlf_equivalent += 1
                    already_present += 1
                    continue  # Existing exact match or checkout-only line endings.
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
                if (entry.external_attr >> 16) & 0o111:
                    dest.chmod(dest.stat().st_mode | 0o111)
    print(json.dumps({
        "mode": "applied" if args.apply else "dry-run",
        "source_sha256": digest, "files": copied,
        "bytes": total, "excluded_media_files": skipped,
        "included_media": args.include_media,
        "already_present": already_present,
        "existing_crlf_equivalent": crlf_equivalent,
        "destination": str(DEST)
    }, indent=2))
    if not args.apply:
        print("Re-run with --apply to copy this selection. --include-media requires separate reuse rights.")

if __name__ == "__main__":
    main()

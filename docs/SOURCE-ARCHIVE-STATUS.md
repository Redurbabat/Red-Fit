# Source archive status — 2026-11-08

## Repository versus local snapshot

The RED Fit repository now contains the integration code and reproducible
`tools/import-source-archives.py`. The original ZIP archives were provided
in the project conversation and cannot be pushed in bulk over the available
GitHub text-file connector. The three full **permitted source trees** were
prepared in a separate local ZIP snapshot, not committed to GitHub.

| Source | Included files | Excluded files | Why |
|---|---:|---:|---|
| openGym | 8,868 | 13,109 | Gym visual `catalogue/media/` images and animations carry a separate restricted licence |
| wger | 1,289 | 0 | AGPL source retained with upstream licence |
| Dietry | 390 | 0 | MIT source retained with upstream licence |
| **Total** | **10,547** | **13,109** | plus one generated import manifest |

The bundle filename is
`red-fit-source-snapshot-no-restricted-media.zip`,
SHA-256:
`59fbed93ac9f13a4951a39b399d3143f57faaaa0e968a54c025608d1daab07b2`.

These files are unmodified reference snapshots, **not compiled into RED Fit**.
The GitHub project owner's claim that openGym is a second account is recorded;
the upstream `NOTICE.md` nevertheless explicitly reserves Gym visual's media
rights. Keeping the GitHub repo private does not relax third-party licensing.

## To recreate the snapshot in a local clone

Place the three original archives alongside the clone, then from the
`feat/unified-iphone-windows-integration` branch:

```bash
python tools/import-source-archives.py \
  ../openGym-main.zip ../wger-master.zip ../dietry-main.zip \
  --out sources/reference
```

Review the resulting `sources/reference/IMPORT-MANIFEST.json`, then
`git add sources/reference && git commit` and push after licence and secrets
review. **Do not** copy the excluded Gym visual assets.

## Functional integration status
- openGym-based automatic warm-up suggestion: in WorkoutPage; code and tests committed
- Dietry-inspired energy needs calculator: Settings UI and tests committed
- wger exercise taxonomy: Zod import parser, ExerciseList UI, atomic attributed import and tests committed
- wger fixture converter: `tools/convert-wger-fixtures.py`; 789 records with licence URLs, 83 uncredited skipped
- Verified wger catalogue now bundled at `public/data/wger-verified-789.json`;
  SHA-256 `5e9b9736afce37d62aaf15a1f3de8cf54ce0b725f5a404ba446192fd03966599`.
  PWA precaches it for offline opt-in import; existing exercises are never auto-changed
- wger taxonomy check: 120/789 have no primary muscle assignment;
  16 ambiguous Arms-class records no longer claim "biceps";
  14 mat-equipped exercises no longer claim "no equipment"
- openGym superset round-robin: plan editor, workout navigation and tests committed
- Dietry-inspired estimated meal amount uncertainty: logging UI, daily display and tests committed
- Desktop sidebar: visible from 1024px, mobile nav preserved
- Cross-device handoff: optional separate sensitive-photo JSON export/import, never
  part of the normal backup; user action required, 25 MiB raw-size limit
- Capacitor and Tauri configurations: scaffolds only; no native build proof
- GitHub CI: red, but runner_id=0 and steps=[]; no test step ever started. Root cause not yet established.

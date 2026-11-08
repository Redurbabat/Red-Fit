# Attribution and reuse of RED Fit's bundled wger exercise dataset

**Scope:** `public/data/wger-verified-789.json` only. This notice does not
automatically apply a Creative Commons licence to RED Fit's own application
code, graphics or user data.

## Source and provenance

- Source project: [wger – Workout Manager](https://github.com/wger-project/wger)
  ([wger website](https://wger.de/)).
- Source data: `wger/exercises/fixtures/exercise-base-data.json`,
  `wger/exercises/fixtures/translations.json` and
  `wger/core/fixtures/licenses.json`.
- Source blobs verified against the original supplied wger-master.zip:
  - base exercises: `cb5f9289be3b7708c88806d2a1d99d800eaf6345`
  - translations: `7cba655a849a4af1116d41ad5ff624d364e8507f`
  - licenses: `0cdbfb29c8fdba6b3eaee35082435539c3256ce2`
- Conversion: `tools/convert-wger-fixtures.py`; converted file
  SHA-256: `5e9b9736afce37d62aaf15a1f3de8cf54ce0b725f5a404ba446192fd03966599`.
- Converted on 2026-11-08 from user-supplied original fixtures. **No
  original media, screenshots, pictures, instructional HTML or remote URLs**.

## Individual authors and licences

**Every record contains its own `sourceAuthor` and `sourceLicense`.**
Do not strip those fields in a redistributable export.

The 789 records break down as follows:

| Individual source licence value | Records |
| --- | ---: |
| CC BY-SA 4.0 | 636 |
| CC BY-SA 3.0 | 131 |
| CC0 1.0 public-domain dedication | 20 |
| CC BY-SA 3.0 base, CC BY-SA 4.0 translation | 2 |

Licence links are included in the corresponding record. There are 235
distinct combined attribution strings; individual exercise and translation
authors are preserved instead of replaced by a single RED Fit author.

This is an **attributed, transformed collection**, not a verbatim original
wger export: the converter selects the German name where available (otherwise
English), extracts category/muscle/equipment IDs, keeps the source exercise ID
and credits, and omits the source's other fields. The RED Fit UI may infer a
muscle group from source categories. In 120 cases it explicitly displays
"Muskelzuordnung prüfen" to avoid suggesting a medically verified annotation.

Creative Commons BY-SA licences include obligations such as credit, licence
reference, marking changes and share-alike treatment of adaptations.
Before distributing the dataset or publishing a production app, confirm the
per-record conditions and any additional obligations that apply in the target
jurisdiction. The wger dataset is kept as a distinct file to facilitate this.

No claim is made that RED Fit or its icon is affiliated with or endorsed by
wger or the individual exercise authors.

## Import and offline availability

RED Fit bundles this attributed dataset in `public/data/`. Its offline PWA
configuration precaches `.json` assets; Capacitor and Tauri package the static
files in their native app assets.

Importing into an existing exercise library is **not automatic**. The user
opens **Training → Übungen → wger-Katalog**, loads the built-in preview,
reviews authors/licences and explicitly selects **Übungen importieren**.
Existing source IDs remain untouched; Dexie imports new records atomically.

The exercise library displays the source ID, author and licence on each
imported record's details. If users re-export or redistribute individual
records they must preserve those credits and the licence metadata.

The data-only audit can be rerun with:

```bash
node --test tools/bundled-wger.selftest.mjs
```

This verifies the exact included file digest, attribution completeness,
record counts and absence of images/media references. It does not, by
itself, prove a successful browser/native build or IndexedDB import.

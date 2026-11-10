# RED Fit identity and navigation integration

Target: original React/Capacitor app in `vendor/opengym-upstream/frontend`, PR #17.
Reference revisions: RED-Morph and RED-Bit main, checked out 2026-11-10.
Owner direction: RED Fit, an original abstract three-part motion symbol in **burgundy and ivory**, with no R, letters or dumbbell. Supersedes the initial red fitness sketch.

## Component inventory before changes

| Component | Decision | Reason |
| --- | --- | --- |
| Original frontend/router/workout/nutrition | KEEP | One product and existing persistent data |
| UIKit UITabBar + WebKit bridge | KEEP / REWORK | Real Apple control; retain routing, fix branding and handshake reliability |
| Web TabBar + RED Morph selection/direction tracking | REWORK | Floating fallback; all five real actions remain accessible |
| Old icon/splash/logo/share/print surfaces | REWORK | One new fitness identity across installed and exported surfaces |
| Locale packs | REWORK | Rename visible copy in all supported languages without dropping translations |
| Storage keys, sync IDs, backup formats, URL handlers | KEEP | Compatibility with existing data, widgets and imports |
| Root PWA | ARCHIVE (status only) | Existing legacy/reference, no second app or deletion |
| Original licenses, media credits and source history | KEEP | Attribution is not product branding |

## Interaction choice

Calm: fixed web navigation. Premium (chosen): actual iOS 26 UIKit navigation and a floating web fallback, deliberate selection/press feedback, existing touch-direction compaction. Expressive: pointer magnification; not selected for the iPhone task.

Native controller owns the Apple surface; React Router and the original store own navigation and workout state. No music/player subsystem is imported. System Reduce Motion/Transparency remain authoritative. Browser fallback uses project tokens, >=44 px targets and keyboard focus. Native device verification is separate from browser verification.


## Asset source and reproducibility

- Original master: `frontend/resources/red-fit-master.png` (1024px, opaque RGB). Chosen direction: three flowing forms, warm ivory on oxblood burgundy; no borrowed ChatGPT/Claude mark.
- `npm run brand:assets` in the original frontend regenerates previews, all existing alternate-icon identities/palettes, iPhone/Watch primary icons, Android launcher/splash and root reference icons. Alternate IDs are retained for installed shortcuts.
- `ios/ci/brand-red-fit.swift` now uses the same native 1024px master, rather than upscaling the root PWA icon. Watch monochrome shape/share-card stencil derive from the same master.
- No rounded outer mask is burned into installed icons. OS masking remains native.
- Old storage filenames, sync IDs, plan schema keys and legacy URL handlers are intentionally retained; newly exported backups use RED Fit names and old ZIP backups remain readable. Existing `Documents/openGym` backups are not deleted; new automatic copies go to `Documents/RED Fit`.
- Release-update and source links point to Redurbabat/Red-Fit. The former project's review/donation links are no longer presented as RED Fit actions.

## Integration fixes found during this work

- Health origins recognize `ch.redurbabat.redfit` and companions as self-written, while recognizing old origins, preventing reimport feedback.
- Nutrition keeps Home selected in web and native navigation.
- First-run tour dialogs outside `modal-root` now hide the actual native bar.
- Native onboarding QA uses the real accessible Today button and dismisses the optional tour before tapping tabs. Failure snapshots are attached for further iOS diagnosis.
- The source ZIP provenance lock stays unchanged. A separate explicit derivative hash manifest covers the nine intentionally adapted original modules; no silent removal of provenance checks. Offline runner explicitly selects TAP for Node 22/24 consistency.

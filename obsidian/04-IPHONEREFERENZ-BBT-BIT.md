---
tags: [red-fit, ios, reference, bbt-bit]
updated: 2026-11-08
---
# BBT Bit — iPhone-App-Referenz, nicht Produktmodul

Quelle: [Redurbabat/BBT-Bit](https://github.com/Redurbabat/BBT-Bit) — `AI_START_HERE.md`, `docs/DESIGN_SYSTEM.md`, Projekt-Skills `bbt-*` und `swiftui-*`. Dort basiert die Musik-App auf SwiftUI, Kotlin Multiplatform und Rust-Audio-Engine; **RED Fit übernimmt NICHT deren Audio-/Streaming-Architektur**.

## Wiederverwendbare Prinzipien
- Navigation mit einer identischen, klaren Zustandsquelle. Keine gestapelten Bottom Bars oder unkoordinierten Floating-Controls.
- Flüssige, unterbrechbare Gesten mit sichtbarer Alternative; stabile Fokus- und Zustandsrückkehr.
- Safe Areas, Dynamic Type, VoiceOver, Touch-Ziele >=44pt, Tastatur-/Pointer-Parität, Reduced Motion/Transparency.
- Native UI gegen echte iOS-Versionen prüfen; WebViews, Simulator und echte Hardware explizit unterscheiden.
- Dokumentierte Tests mit Startzustand, Aktion, beobachtetem Ergebnis; nie 'bestanden' für nicht ausgeführte Geräteprüfungen.
- Verfügbarkeit und Berechtigungen nativer APIs vor Nutzung prüfen.

## Umsetzung für RED Fit
Die gemeinsame React UI kann Motion- und Accessibility-Muster adaptieren. **Kein** Umschreiben von RED Fit auf SwiftUI; für iPhone ist Capacitor der geplante Host. Bei Bedarf gezielte native Brücken, mit klaren Feature-Flags und Browser-Fallback. RED-Morph SwiftUI-Quellcode ist nur sinnvoll, wenn später tatsächlich eine native SwiftUI-Komponente benötigt wird.

Die elf hochgeladenen `bbt-*` und `swiftui-*` Markdown-Skills sind Referenzdokumente und keine installierten originalen Apple/Xcode-Skills. Auch die originalen Apple-Xcode-Skills sind nicht belegt.

Querverweis: [[03-DESIGN-RED-MORPH]], [[05-ARCHITEKTUR-PLATTFORMEN]].

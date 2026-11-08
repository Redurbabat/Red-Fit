# RED Fit – iPhone-App-Icon für Capacitor und Xcode

**Stand:** 8. November 2026 · Integrations-Branch
`feat/unified-iphone-windows-integration`

## Ziel

Der iOS-Scaffold (`capacitor.config.json`) muss nach der Generierung
über `npx cap add ios` dasselbe RED-Fit-Branding wie die bestehende PWA
und Windows-App verwenden. Bislang gab es dafür keinen eigenen
Xcode-Asset-Schritt.

`tools/prepare-ios-icons.mjs` generiert mit dem vorhandenen
`public/icons/icon-512.png` das App-Icon in einem **bereits generierten
Capacitor-Xcode-Projekt**. Dabei wird der originale Bildinhalt
wiederverwendet, kein externes Bild oder fremdes Logo eingefügt.

Apple/Xcode unterstützt ein einzelnes **1024×1024-Pixel-Icon** für die
automatische Generierung kleinerer iOS-Größen. Das Script erzeugt
`ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`
und dazu eine `Contents.json` mit `idiom: "universal"`,
`platform: "ios"` und `size: "1024x1024"`.

## Ausführung auf macOS

Nach der in [PLATFORM-BUILDS.md](PLATFORM-BUILDS.md) dokumentierten
Installation der nativen npm-Pakete:

```bash
npm ci
npm run build
npx cap add ios
npm run ios:icons
npx cap sync ios
npx cap open ios
```

`ios:icons` ist absichtlich **nach** `cap add ios` einzusetzen.
Der Generator legt kein falsches oder unvollständiges Xcode-Projekt an.
Bei fehlendem `AppIcon.appiconset` erklärt er den fehlenden Schritt.
`cap sync ios` synchronisiert danach die aktuellen Web-Assets; die
generierten App-Icon-Dateien bleiben Teil des nativen iOS-Projekts.
Die resultierenden nativen Projektdateien sollen erst nach einer
tatsächlichen Xcode-Prüfung versioniert werden.

Das Tool erkennt die üblichen Capacitor-Template-Namen
`AppIcon-512@2x.png` sowie seinen eigenen Namen
`AppIcon-1024.png`. Bei **anderen bereits konfigurierten Bilddateien**
bricht es ab. Nur mit bewusster Freigabe kann ein eigener Icon-Katalog
überschrieben werden:

```bash
node tools/prepare-ios-icons.mjs --force
```

Das bestehende Icon wird nicht vor dem erfolgreichen Lesen und
Konvertieren des PWA-Bilds verändert.

## Bildformat und Grenzen

Das Tool nutzt den bereits für Windows vorhandenen PNG-Decoder/Resizer.
Für iOS wurde `encodeRgbPng()` ergänzt. Es erzeugt ein 8-Bit-RGB-PNG
(PNG-Farbtyp **2**) ohne Alphakanal, mit überprüfbaren IHDR-Dimensionen
und PNG-CRC. Eine eventuelle Transparenz des PWA-Bilds wird über
**RGB (17, 24, 39)**, ein dunkles RED-Fit-Feld, gerendert.

Die vorhandene 512-px-Bildquelle wird für iOS auf 1024 px hochskaliert.
Das funktioniert technisch, kann aber keine fehlenden Originaldetails
rekonstruieren. Für ein endgültiges App-Store-Release sollte ein
**natives 1024-px-Brand-Asset** begutachtet und ggf. die Quelle
durch ein entsprechend hochauflösendes eigenes Logo ersetzt werden.
Das hier erstellte Icon ist die reproduzierbare technische Vorstufe,
**keine visuelle App-Store-Freigabe**.

Moderne iOS-Versionen unterstützen zusätzlich dunkle oder getönte
App-Icons. Der Generator liefert zunächst das **Standard-Icon**;
spezielle Dark-/Tinted-Varianten und Liquid-Glass-Designs sind separat
zu gestalten und in Xcode auf realen Simulatoren/Geräten zu prüfen.

Apple-Dokumentation:
- https://developer.apple.com/documentation/xcode/configuring-your-app-icon
- https://developer.apple.com/design/human-interface-guidelines/app-icons
- https://capacitorjs.com/docs/ios

## Reproduzierbare Tests

```bash
# Funktioniert auch ohne npm ci oder Xcode (Node.js 22):
npm run test:ios-icons
```

**Tatsächlich am 8. November 2026 ausgeführt: 10/10 Node-Tests
bestanden.** Überprüft werden die RGB-Transkodierung ohne Alphakanal,
1024-px-Abmessungen, Farb-/Transparenzbehandlung, falsche Bilddimensionen,
Xcode-`Contents.json`, vollständige Dateigenerierung in einem
simulierten Capacitor-Projekt, fehlendes Xcode-Projekt, Schutz
individueller Icons, bewusstes `--force` sowie ein ungültiges Quell-PNG,
bei dem der vorhandene Katalog unverändert bleibt.

Die vier lokal getesteten Dateien stimmen **bytegenau mit den GitHub-
Blobs** des Feature-Branches überein:

- `tools/nativeIconCodec.mjs`: `0409a7afe922a24436b9462215b2ce31a36bedd3`
- `tools/iosIconAssets.mjs`: `ebe38f70098b481822fdfe3c58f6c8c1eda216ba`
- `tools/prepare-ios-icons.mjs`: `f3d19b199d92cb3b1c2868ec1cfcc3702d86543f`
- `tools/ios-icons.selftest.mjs`: `2d1188991f2d834e3eb59eb06d765ee71fb1a18a`

**Noch nicht geprüft:** Das echte `public/icons/icon-512.png` konnte
hier nicht als Binärdatei aus GitHub abgerufen werden; Tests erzeugen
synthetische, vollständig kontrollierbare 512-px-PNGs. Ein echtes
`ios/App/App.xcworkspace`, Xcode-Asset-Kompilierung, Simulator-Build,
Signierung und App-Store-Validierung konnten in der Linux-Umgebung
nicht durchgeführt werden. Die nativen Capacitor-Abhängigkeiten sind
weiterhin nicht im `package-lock.json`, da die npm-Registry hier nicht
erreichbar ist. Alle diese Schritte bleiben Release-Blocker.

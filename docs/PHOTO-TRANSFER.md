# RED Fit – privater Fortschrittsfoto-Transfer (iPhone ↔ Windows)

## Datenschutz: bewusst getrennt vom Standard-Backup

Fortschrittsfotos sind als `sensitiveMedia` markiert und werden nur lokal in
IndexedDB (`progressPhotos` + `mediaAssets` mit `Blob`) gespeichert.

Der bisherige Standard-Export
`red-fit-backup-YYYY-MM-DD.json` enthält **keine Fotos/Bilddaten**.
Er bleibt unverändert und weiterhin rückwärtskompatibel. Es wird nichts in
einen Cloud-Dienst hochgeladen.

Im neuen, **ausdrücklich ausgelösten** Ablauf kann ein Nutzer seine eigenen
Fotos separat als `red-fit-photos-YYYY-MM-DD.json` exportieren und in einer
anderen RED-Fit-Installation importieren. Die Datei ist **nicht verschlüsselt**.
Daher nur sicher aufbewahren, nicht ungeschützt versenden oder online stellen.

## Bedienung

1. Auf dem Quellgerät zu **Mehr → Backup & Import** gehen.
2. Zunächst das **normale Backup** exportieren (Workouts, Ernährung, Profil).
3. Unter **Fortschrittsfotos – separates Backup** auf
   **Fotos separat exportieren** tippen.
4. Beide Dateien auf dem Zielgerät sicher bereitstellen.
5. Auf dem Zielgerät zuerst das normale JSON-Backup importieren.
6. **Foto-Backup auswählen** klicken, Zahl der Fotos prüfen und den
   **Foto-Import bestätigen**.

Das normale Backup wird nicht automatisch durch das Foto-Backup ersetzt oder
ergänzt. Beide Dateien müssen bei einem Gerätewechsel separat übertragen
werden. Ohne bewusste Nutzeraktion werden keine Fotos exportiert.

## Technischer Vertrag

`src/services/backup/photoBackupService.ts`:

- Eigenständiges Format `red-fit-photo-backup`, Version `2`. Das vorherige, noch nicht veröffentlichte Entwurfsformat Version 1 enthielt keine Prüfsummen und wird von diesem Importer abgelehnt. Frühere Testdateien müssen auf dem Quellgerät neu exportiert werden.
- Pro Element: vollständige `ProgressPhoto`-Metadaten,
  `MediaAsset`-Metadaten und Bildbytes als Base64.
- Zulässige Bild-MIME-Typen: JPEG, PNG, WebP, HEIC, HEIF, AVIF, GIF.
  `image/svg+xml` ist nicht zulässig.
- Je Foto höchstens **10 MiB**, je Export höchstens **25 MiB** Rohdaten,
  Dateigröße höchstens **36 MiB**, maximal **250 Fotos**.
- Der Export enthält pro Foto eine SHA-256-Prüfsumme über die exakten Bildbytes. Der Import prüft sie **vor der Vorschau** und **vor dem Speichern**. Auch gleich lange beschädigte Bilder werden zurückgewiesen. SHA-256 ist keine Signatur oder Verschlüsselung und schützt nicht gegen absichtliche Änderungen der Datei samt Prüfsumme.
- Parser prüft Schema, Referenzen, eindeutige IDs, MIME-Typ, `sensitiveMedia`, Datenlänge, gültiges Base64 und SHA-256 vor dem Import.
- **Kein stiller Datenverlust beim Export:** Ein Foto ohne gespeicherten
  Blob oder mit abweichender Dateigröße führt zum Abbruch.
- **Datenintegrität vorhandener Einträge**: Bei einer bereits vorhandenen
  Foto-ID kontrolliert der Import, ob die referenzierte lokale Bilddatei
  existiert und zu den sensitiven Medienmetadaten passt. Fehlende,
  falsch klassifizierte oder inkonsistente Bilder führen zum Abbruch,
  statt stillschweigend als erfolgreich übersprungen zu werden.
- **Kollisionssichere Medien-ID**: Auch neu generierte IDs werden bis zu
  achtmal gegen die bestehende Datenbank überprüft; dauerhaft belegte IDs
  führen zu einem kontrollierten Fehler innerhalb derselben Transaktion.
- **Transaktionaler Import**: Bestehende Foto-IDs bleiben unangetastet;
  überschneidende Asset-IDs bekommen neue IDs, damit kein fremdes lokales
  Bild überschrieben wird. Alle Bilder werden vor der Datenbanktransaktion
  dekodiert (Dexie-Transaction-Lifetime).
- **Keine automatische Synchronisierung**. Der Transfer ist ein manueller,
  lokaler Datei-Workflow.

## Grenzen und Tests

**Zusätzliche Prüfungen (2026-11-08):**

```bash
node --experimental-strip-types --test tools/photo-import-policy.selftest.mjs
```

Die isolierte Foto-Import-Policy wurde lokal mit **6/6 bestandenen
Node-Tests** und einem eigenständigen TypeScript-Check überprüft.
Der Test prüft Duplikate, fehlende lokale Bilddateien, ursprüngliche
und neu generierte ID-Kollisionen sowie den kontrollierten Abbruch.

Die Datenbank-Tests in `photoBackupService.test.ts` wurden um Fälle
für einen partiellen Import vor einer späteren beschädigten Fotoreferenz
und für fehlerhafte SHA-256-Prüfsummen ergänzt. **Diese Dexie-Tests
konnten in der aktuellen Umgebung nicht ausgeführt werden**, da
`dexie`, `fake-indexeddb` und `vitest` hier nicht installiert sind
und der npm-Paketdownload an der Netzwerkauflösung scheitert.
Das ist kein Nachweis eines erfolgreichen IndexedDB-Roundtrips.

Der Transfer ist für kleinere, lokale Foto-Sammlungen vorgesehen.
Sammlungen über 25 MiB Rohdaten können derzeit **nicht in einer einzigen
Datei** exportiert werden. Dafür folgt ein separates, partitioniertes oder
verschlüsseltes Archivformat; keine Behauptung einer vollständigen
Massendatenmigration ohne dieses Feature.

`src/services/backup/photoBackupService.test.ts` enthält Tests für
Base64-Roundtrip über Chunk-Grenzen, Erhalt von Metadaten, Import,
Idempotenz, ID-Kollisionen, beschädigte Dateien und fehlende Blobs.

**Tatsächlich lokal geprüft (Node 22.16, 2026-11-08):**

```bash
node --experimental-strip-types --test tools/photo-codec.selftest.mjs
```

Ergebnis nach SHA-256-Erweiterung: **5/5 bestanden**. Der Test deckt Dateilängen, Chunk-Grenzen, beschädigtes Base64, eine gleich lange Byteänderung und den SHA-256-NIST-Testvektor ab. Zusätzlich wurde der exakte Codec-Quelltext
alleinstehend mit `tsc --noEmit --strict` überprüft (bestanden).
Der getestete lokale Codec-Code wurde per Länge und FNV-Prüfsumme mit dem
GitHub-Quelltext abgeglichen. Dieser Isolationsnachweis ist **kein**
vollständiger React-/IndexedDB-Test.

Solange die GitHub-Actions-Runner nicht gestartet werden können, sind
die Anwendungstests und echte iPhone-/Windows-Importe **noch nicht
durchgehend verifiziert**; kein voreiliger Merge nach `main`.

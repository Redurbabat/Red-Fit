# Agent 02 — RED Morph UI / Responsive Navigation
Datum: 2026-11-09  
Branch: `agent/redfit-02-red-morph-ui`  
Basis: `043b7552ef604636262e85dacb3f613f609080e8`  
Ziel: ein PR gegen `main`, kein Merge.

## Ausgangslage und Designentscheidung

RED Fit verwendet weiterhin **eine** React/TypeScript-App-Shell mit fünf gerouteten Hauptbereichen. Die Referenz ist das separate Repository `Redurbabat/RED-Morph`, insbesondere `app/src/touch/internal/usePress.ts`, `app/src/touch/glass/Glass.tsx`, `app/src/touch/glass/Glass.css`, `app/src/touch/navigation/TabBar.tsx` und `TabBar.css`, sowie das RED Morph Skill- und Motion-System. Nicht kopiert wurden deren vollständige TabBar-Gestenmaschine, der SVG-Refractions-Filter und das globale Touch-Kit-Theme: RED Fit braucht weiter echte React-Router-Links, seine bestehenden Nocturne-Tokens und WebKit-Fallbacks. Keine externen Laufzeitpakete.

### KEEP / REWORK / ARCHIVE / DELETE-CANDIDATE

| Datei/Fläche | Entscheidung | Begründung |
| --- | --- | --- |
| `src/components/layout/BottomNav.tsx` + `dockBehavior.ts` | REWORK, behalten | Fünf Ziele und Scroll-Policy funktionieren bereits. Gezielter bewegter Auswahlkörper und Press-Feedback, keine zweite TabBar. |
| `src/components/layout/DesktopNav.tsx` | KEEP | Desktop-Navigation ab 1024 px und reale Deep Links bleiben unverändert. |
| `src/components/layout/QuickLogButton.tsx` | REWORK, behalten | Reale Wasser-/Gewichtsaktionen und Fehlerpfade bleiben bestehen. Nur kurzes Kontext-Sheet erhält Glass-Material. |
| `src/components/feedback/Modal.tsx` | REWORK | Dismiss-Funktion auch sichtbar, Fokus/Scroll-Lock/inert; lange Formulare bleiben deckend. |
| `src/components/ui/Button.tsx` | REWORK | RED Morph Press-Feedback für Tastatur, Maus und Touch; bestehende Varianten/Events behalten. |
| `src/components/ui/inputs.tsx` | KEEP | Vorhandene 16-px-Inputs und Bindings bleiben; Fokus in CSS verbessert. |
| `src/components/ui/Card.tsx` / `Stepper.tsx` / `ToastProvider.tsx` | KEEP | Keine neue Funktion rechtfertigt eine Duplizierung oder einen unsicheren Austausch. |
| RED-Morph-Experimentgalerien, SwiftUI-Player/Dock | Nicht übernehmen | Keine Produktfunktion von RED Fit; SwiftUI ist keine React-Implementierung. |
| Löschungen | Keine | Keine nachgewiesen sicheren DELETE-CANDIDATE-Dateien. |

## Eingebaute Komponenten und Verträge

**`src/design/red-morph/usePress.ts`**: adaptierter React-Hook aus RED Morph Touch Kit. `usePress<E>(handlers?, disabled?)` gibt `pressed` und `pressProps` zurück. Pointerdown (Primärtaste), Keydown (Space/Enter) aktivieren nur visuelles Feedback; Pointerup/-cancel/-leave, Keyup und Blur beenden es. Native Click-/Link-Semantik bleibt erhalten, bestehende Handler laufen zuerst, disabled unterdrückt Press-Feedback. Eingebaut in die bestehenden `Button`, `IconButton` und Dock-`Link`-Komponenten.

**`src/design/red-morph/GlassSurface.tsx`**: gezielt adaptierter Touch-Kit-`GlassSurface`-Container; `tone?: 'regular' | 'tinted'`, normale `div`-HTML-Attribute und `ref`. `src/design/red-morph/glass.css` nutzt RED-Fit-Semantikfarben, einen statischen hellen Rand, Blur auf schwebendem Chrome sowie komplett opake Alternativen bei `prefers-reduced-transparency`, `prefers-contrast: more` und `forced-colors`. Kein Apple-Asset, keine geschützte Schrift, kein permanent bewegter Lichtschein. SVG-Fresnel-/Chromium-Refraction wurde bewusst NICHT portiert; Safari/iOS bleibt funktionsfähig.

**`BottomSheet`**: neues optionales `material?: 'solid' | 'glass'` mit **Standard `solid`**; nur das kurze Quick-Log-Auswahl-Sheet ist `glass`. `open`, `title`, `onClose` und Inhalt bleiben kontrolliert durch die App. Sichtbarer 44-px-Schliessen-Knopf, Escape, Fokusfalle, initialer Autofokus auf ein reales Feld oder Schliessen und Fokuswiederherstellung; Scroll-Lock, `inert` für sichere Shell-Geschwister. Bei Dialogen innerhalb der Hauptansicht darf der eigene Vorfahr nicht inert werden; die bestehende Fokusfalle bleibt aktiv. Keine neuen Persistenz-/Geschäftslogikpfade.

**`BottomNav`**: Auswahlmaterial mit fünf dedizierten, per `transform` anfahrbaren Lagen; untergeordnete Routen und `/progress` bleiben korrekt zugeordnet. Keine Selektion auf `/settings`; Pfeil-/Tab-Navigation ist native Link-/Browser-Bedienung, kein irreführendes ARIA-Tab-Widget. Das Dock bleibt bei Routenwechsel gemountet (Animation ist unterbrechbar); nur die Scroll-Kompaktheit wird zurückgesetzt. Höhenwechsel bleibt eine kurze bestehende CSS-Transition, kein neuer Gestenmotor.

**`AppShell`**: `visualViewport` und Focus-Events erkennen eine geöffnete Bildschirmtastatur, falls sie mehr als 140 px verdeckt (bei Bildschirmbreiten <1024 px); dann verschwinden das Dock und der FAB temporär, ohne dass sie als echte Navigationsfunktionen verloren gehen. Desktop-Sidebar und Fullscreen-Workout bleiben bestehen. Kein Gerätemodell oder native Software-Keyboard-API wird vorgetäuscht.

## Änderungen / Dateibereich

- `src/design/red-morph/{usePress.ts,GlassSurface.tsx,glass.css}` (neu)
- `src/components/layout/{BottomNav.tsx,BottomNav.test.tsx,QuickLogButton.tsx}`
- `src/components/feedback/{Modal.tsx,Modal.test.tsx}` (Test neu)
- `src/components/ui/{Button.tsx,Button.test.tsx}` (Test neu)
- `src/app/AppShell.tsx`
- `src/styles/{tokens.css,mobile.css,components.css}`
- `docs/agent-runs/02-red-morph-ui.md` (dieses Protokoll)

Nicht verändert: `src/features/**`, `src/services/**`, Datenbank, Medien, `package*.json`, Plattform-Shells und andere Agentenbereiche.

## Prüfung und Nachweis (streng unterscheiden)

- GitHub-Quellabgleich der Ausgangsdateien und RED Morph Runtime/Styles: **durchgeführt** (nur gelesene Repositories).
- GitHub-Schreib-Commits auf dem zugewiesenen Agentenbranch: **durchgeführt**; PR folgt separat.
- Neue Vitest-Tests hinzugefügt: Dock-Routen/Selektion, semantisches und fokussierbares Sheet, Escape/Fokusrückgabe, Button-Keyboard-Press und disabled IconButton. **Noch nicht ausgeführt.**
- `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:offline`: **NICHT ausgeführt**, da hier kein vollständiger GitHub-Checkout und keine npm-Pakete verfügbar sind. Code-Sichtung/Schreib-Erfolg ist kein Build-/Testnachweis.
- Screenshot-, Simulator-, VoiceOver-, Android- und Windows-Prüfungen: **NICHT durchgeführt**.
- RED Morph Referenz ist kein nativer SwiftUI-Test; Plattformparität ist Verhalten, nicht Pixelidentität.

### Reproduzierbare manuelle QA nach erfolgreichem Build

1. iPhone Safari/Capacitor: 360/390/430 px in Hoch-/Querformat, dunkles und helles Systemtheme; dockierte fünf Bereiche per Touch öffnen, Unterrouten und `/progress` prüfen. Langsam und schnell abwärts/aufwärts scrollen; Icons bleiben auch kompakt erreichbar. Wiederholte Routenwechsel unterbrechen die Auswahlbewegung.
2. Auf iPhone/Android ein Gewicht über das Quick Log erfassen; prüfen, dass das erste Feld beim Öffnen fokussierbar ist, das Keyboard keine Dock-Überlagerung erzeugt, Speichern/Fehler sichtbar sind und das Deckblatt danach korrekt schliesst. Eingaben müssen tatsächlich gespeichert werden — kein simuliertes Speichern. Das kurze Quick-Log-Menü nutzt Glas; Gewichtssheet bleibt deckend.
3. Windows/Desktop mit Tastatur: Tab, Shift+Tab, Enter, Space, Escape; Fokusring und -rückgabe nach Schliessen eines Sheets; Desktop-Sidebar statt Bottom-Dock ab 1024 px. Maus-/Trackpad-Scroll und Browserzoom testen.
4. System **Bewegung reduzieren**, **Transparenz reduzieren**, hoher Kontrast/Windows Forced Colors: Auswahl bleibt eindeutig, kein unkontrollierter Effekt, Buttons bleiben kontrastreich. VoiceOver/NVDA: eindeutige Navigationsnamen, `aria-current`, Dialogtitel und Schliessen, keine Hintergrundinteraktion während Quick Log.
5. Offline nach App-Neustart: echte Navigation und bereits vorhandene Workouts/Meals/Body-Daten kontrollieren; kein Datenverlust. Im Browser prüfen, dass beide Themes und die freie Tastaturzone auch bei grossen Schriftgrössen funktionieren.

## Offen / Blocker

- Alle npm-/Vitest-/Vite-/Offline-Tests auf einem vollständigen Checkout durchführen; tatsächliche Logs an die PR hängen, Fehler gezielt korrigieren.
- Reale iPhone/Android/Windows-Tests und Screenshots nachweisen; insbesondere Bildschirmtastatur und gesperrte Hintergrundfokusse.
- Cross-Agent-Integrationsreview: kein Paketmanifest-, Feature- oder Plattformcode in dieser Branchänderung. Das openGym-Cutover gehört nicht zu Agent 02.
- **Kein Merge nach main durch diesen Agenten.**

## Integrationsstand zum Abschluss (parallel geändertes main)

Während der Arbeit wurde **PR #10 vom selben Branch bei Commit `2ae57635` bereits am 2026-11-09 um 21:09 UTC von anderer Seite nach main gemergt**. Agent 02 hat diesen Merge nicht ausgeführt. Darin liegen die grundlegenden UI-Codeänderungen. Der **nachfolgende Draft-PR #11** desselben Branches enthält nur die noch ausstehenden Korrekturen, Tests und dieses QA-Protokoll; er ist **offen und ungemergt**. Es darf kein zweiter neuer PR für diesen Rest angelegt werden. Vor Merge von #11 die komplette App-QA durchführen, nicht nur die Änderungsliste von #11 lesen.

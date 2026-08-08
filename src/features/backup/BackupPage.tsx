import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SegmentedControl } from "../../components/ui/inputs";
import type { RedFitBackup } from "../../models/backup";
import {
  buildPreview,
  exportBackupFile,
  importBackup,
  MAX_IMPORT_BYTES,
  parseBackupJson,
  type BackupPreview,
  type ImportResult,
  type ImportStrategy,
} from "../../services/backup/backupService";

type ImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "preview"; backup: RedFitBackup; preview: BackupPreview }
  | { status: "done"; result: ImportResult };

const PREVIEW_LABELS: [keyof BackupPreview, string, string][] = [
  ["exercises", "Übung", "Übungen"],
  ["workoutPlans", "Trainingsplan", "Trainingspläne"],
  ["workoutLogs", "Workout", "Workouts"],
  ["foodItems", "Lebensmittel", "Lebensmittel"],
  ["mealLogs", "Mahlzeit", "Mahlzeiten"],
  ["nutritionGoals", "Ernährungsziel", "Ernährungsziele"],
  ["waterLogs", "Wasser-Eintrag", "Wasser-Einträge"],
  ["bodyMeasurements", "Körperwert", "Körperwerte"],
  ["shoppingLists", "Einkaufsliste", "Einkaufslisten"],
  ["mealPlans", "Essensplan", "Essenspläne"],
  ["recipes", "Rezept", "Rezepte"],
  ["recoveryLogs", "Recovery-Check-in", "Recovery-Check-ins"],
];

export default function BackupPage() {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });
  const [strategy, setStrategy] = useState<ImportStrategy>("keepExisting");
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    try {
      await exportBackupFile();
      showToast("Backup wurde erstellt.");
    } catch {
      showToast("Backup konnte nicht erstellt werden. Bitte versuche es erneut.");
    }
  }

  async function handleFile(file: File) {
    if (file.size > MAX_IMPORT_BYTES) {
      setImportState({
        status: "error",
        message: "Die Datei ist zu groß für einen Import.",
      });
      return;
    }
    const text = await file.text();
    const parsed = parseBackupJson(text);
    if (!parsed.ok) {
      setImportState({ status: "error", message: parsed.error });
      return;
    }
    setImportState({
      status: "preview",
      backup: parsed.backup,
      preview: buildPreview(parsed.backup),
    });
  }

  async function handleImport(backup: RedFitBackup) {
    setBusy(true);
    try {
      const result = await importBackup(backup, strategy);
      setImportState({ status: "done", result });
      showToast("Import abgeschlossen.");
    } catch {
      setImportState({
        status: "error",
        message: "Beim Import ist ein Fehler aufgetreten. Deine Daten wurden nicht verändert.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Backup & Import" back backFallback="/more" />

      <Card flat>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          RED Fit speichert deine Daten lokal auf diesem Gerät. Erstelle regelmäßig
          ein Backup, wenn dir deine Daten wichtig sind.
        </p>
      </Card>

      <SectionHeader title="Backup exportieren" />
      <Button onClick={() => void handleExport()}>
        <Download size={18} aria-hidden="true" style={{ marginRight: 6 }} />
        Backup exportieren
      </Button>

      <SectionHeader title="Backup importieren" />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = ""; // same file can be picked again
        }}
      />
      <Button variant="secondary" onClick={() => fileRef.current?.click()}>
        <Upload size={18} aria-hidden="true" style={{ marginRight: 6 }} />
        Backup-Datei auswählen
      </Button>

      {importState.status === "error" ? (
        <Card style={{ marginTop: 14 }}>
          <p style={{ fontWeight: 600 }}>Backup konnte nicht importiert werden.</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            Die Datei passt nicht zu RED Fit oder ist beschädigt.
          </p>
          <details style={{ marginTop: 10, fontSize: 13, color: "var(--text-soft)" }}>
            <summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center" }}>
              Details anzeigen
            </summary>
            <p style={{ marginTop: 6 }}>{importState.message}</p>
          </details>
        </Card>
      ) : null}

      {importState.status === "preview" ? (
        <Card style={{ marginTop: 14 }}>
          <p style={{ fontWeight: 600, marginBottom: 10 }}>Inhalt des Backups</p>
          <ul style={{ fontSize: 14, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
            {PREVIEW_LABELS.filter(([key]) => importState.preview[key] > 0).map(
              ([key, singular, plural]) => (
                <li key={key}>
                  {importState.preview[key]}{" "}
                  {importState.preview[key] === 1 ? singular : plural}
                </li>
              ),
            )}
          </ul>
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Bei vorhandenen Einträgen:
            </p>
            <SegmentedControl
              ariaLabel="Import-Strategie"
              options={[
                { value: "keepExisting", label: "Bestehende behalten" },
                { value: "replaceWithBackup", label: "Backup bevorzugen" },
              ]}
              value={strategy}
              onChange={setStrategy}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            <Button disabled={busy} onClick={() => void handleImport(importState.backup)}>
              {busy ? "Importiere …" : "Importieren"}
            </Button>
            <Button variant="ghost" onClick={() => setImportState({ status: "idle" })}>
              Abbrechen
            </Button>
          </div>
        </Card>
      ) : null}

      {importState.status === "done" ? (
        <Card style={{ marginTop: 14 }}>
          <p style={{ fontWeight: 600 }}>Import abgeschlossen</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            {importState.result.added} hinzugefügt · {importState.result.skipped}{" "}
            übersprungen · {importState.result.replaced} ersetzt
          </p>
        </Card>
      ) : null}
    </>
  );
}

import { useEffect, useState } from "react";
import { LoadingState } from "../../components/feedback/states";
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { APP_VERSION } from "../../services/appVersion";
import { db, DB_VERSION } from "../../services/storage";
import { settingsRepository } from "../../services/storage/settingsRepository";
import { formatDateShortGerman } from "../../utils/dates";

interface Diagnostics {
  usageBytes?: number;
  quotaBytes?: number;
  counts: { label: string; count: number }[];
  lastBackupAt?: string;
  serviceWorkerActive: boolean;
}

function formatBytes(bytes?: number): string {
  if (bytes == null) return "unbekannt";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

async function collectDiagnostics(): Promise<Diagnostics> {
  const estimate =
    typeof navigator !== "undefined" && navigator.storage?.estimate
      ? await navigator.storage.estimate().catch(() => undefined)
      : undefined;

  const stores: { label: string; table: { count(): Promise<number> } }[] = [
    { label: "Übungen", table: db.exercises },
    { label: "Trainingspläne", table: db.workoutPlans },
    { label: "Workouts", table: db.workoutLogs },
    { label: "Lebensmittel", table: db.foodItems },
    { label: "Mahlzeiten", table: db.mealLogs },
    { label: "Ernährungsziele", table: db.nutritionGoals },
    { label: "Wasser-Einträge", table: db.waterLogs },
    { label: "Körperwerte", table: db.bodyMeasurements },
    { label: "Einkaufslisten", table: db.shoppingLists },
    { label: "Essenspläne", table: db.mealPlans },
    { label: "Rezepte", table: db.recipes },
    { label: "Recovery-Check-ins", table: db.recoveryLogs },
  ];
  const counts = await Promise.all(
    stores.map(async (s) => ({ label: s.label, count: await s.table.count() })),
  );

  const metadata = await settingsRepository.getMetadata();
  const serviceWorkerActive =
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    Boolean(await navigator.serviceWorker.getRegistration().catch(() => undefined));

  return {
    usageBytes: estimate?.usage,
    quotaBytes: estimate?.quota,
    counts,
    lastBackupAt: metadata.lastBackupAt,
    serviceWorkerActive,
  };
}

/** Speicher & Diagnose (§105) — read-only, no user data is ever cleared here. */
export default function DiagnosticsPage() {
  const [diag, setDiag] = useState<Diagnostics | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void collectDiagnostics().then((d) => {
      if (!cancelled) setDiag(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!diag) {
    return (
      <>
        <PageHeader title="Speicher & Diagnose" back backFallback="/more" />
        <LoadingState rows={5} />
      </>
    );
  }

  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 0",
    fontSize: 15,
  } as const;

  return (
    <>
      <PageHeader title="Speicher & Diagnose" back backFallback="/more" />

      <SectionHeader title="App" />
      <Card>
        <div style={rowStyle}>
          <span>App-Version</span>
          <strong>{APP_VERSION}</strong>
        </div>
        <div style={rowStyle}>
          <span>Datenbank-Version</span>
          <strong>{DB_VERSION}</strong>
        </div>
        <div style={rowStyle}>
          <span>Service Worker</span>
          <strong>{diag.serviceWorkerActive ? "aktiv" : "nicht aktiv"}</strong>
        </div>
        <div style={rowStyle}>
          <span>Letztes Backup</span>
          <strong>
            {diag.lastBackupAt ? formatDateShortGerman(diag.lastBackupAt.slice(0, 10)) : "noch keins"}
          </strong>
        </div>
      </Card>

      <SectionHeader title="Speicher" />
      <Card>
        <div style={rowStyle}>
          <span>Belegt</span>
          <strong>{formatBytes(diag.usageBytes)}</strong>
        </div>
        <div style={rowStyle}>
          <span>Verfügbar (Browser-Kontingent)</span>
          <strong>{formatBytes(diag.quotaBytes)}</strong>
        </div>
      </Card>

      <SectionHeader title="Datenbestand" />
      <Card>
        {diag.counts.map((c) => (
          <div key={c.label} style={rowStyle}>
            <span>{c.label}</span>
            <strong>{c.count}</strong>
          </div>
        ))}
      </Card>

      <p style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 14 }}>
        Diese Seite ist rein informativ — hier werden nie Nutzerdaten gelöscht.
        Backups erstellst du unter „Backup & Import“.
      </p>
    </>
  );
}

import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { APP_VERSION } from "../../services/appVersion";

export default function AboutPage() {
  return (
    <>
      <PageHeader title="Über RED Fit" back backFallback="/more" />

      <div style={{ textAlign: "center", padding: "24px 0 10px" }}>
        <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>
          <span style={{ color: "var(--accent)" }}>RED</span> Fit
        </h2>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Training und Ernährung in einer App.
        </p>
        <p style={{ color: "var(--text-soft)", fontSize: 13, marginTop: 8 }}>
          Version {APP_VERSION}
        </p>
      </div>

      <Card>
        <ul
          style={{
            fontSize: 15,
            color: "var(--text-muted)",
            lineHeight: 1.9,
            paddingLeft: 4,
          }}
        >
          <li>• Offline-first: Nach dem ersten Laden funktioniert die App ohne Internet.</li>
          <li>• Lokale Daten: Alles bleibt auf deinem Gerät — kein Konto nötig.</li>
          <li>• Workout-Tracking mit Sätzen, Gewichten, Timer und Rekorden.</li>
          <li>• Ernährung mit Nährwerten pro 100 g und automatischer Berechnung.</li>
          <li>• Fortschritt, Essensplan, Einkaufsliste und Backup inklusive.</li>
        </ul>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: 16, marginBottom: 10 }}>Auf dem iPhone installieren</h3>
        <ol
          style={{
            fontSize: 15,
            color: "var(--text-muted)",
            lineHeight: 1.9,
            paddingLeft: 20,
            listStyle: "decimal",
          }}
        >
          <li>RED Fit in Safari öffnen.</li>
          <li>Das Teilen-Symbol antippen.</li>
          <li>„Zum Home-Bildschirm“ wählen.</li>
          <li>„Hinzufügen“ antippen.</li>
        </ol>
      </Card>
    </>
  );
}

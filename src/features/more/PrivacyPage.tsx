import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";

const paragraph: React.CSSProperties = {
  fontSize: 15,
  color: "var(--text-muted)",
  lineHeight: 1.6,
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Datenschutz" back backFallback="/more" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <h2 style={{ fontSize: 17, marginBottom: 8 }}>Deine Daten bleiben bei dir</h2>
          <p style={paragraph}>
            RED Fit speichert alle Daten lokal auf diesem Gerät. Es ist kein Konto
            erforderlich, es gibt kein Werbetracking, und deine Daten werden nicht
            weitergegeben oder verkauft.
          </p>
        </Card>
        <Card>
          <h2 style={{ fontSize: 17, marginBottom: 8 }}>Kamera</h2>
          <p style={paragraph}>
            Die Kamera wird ausschließlich für den Barcode-Scanner verwendet — und
            nur, wenn du der Nutzung zustimmst. Ohne Kamera funktioniert die App
            vollständig über die manuelle Eingabe.
          </p>
        </Card>
        <Card>
          <h2 style={{ fontSize: 17, marginBottom: 8 }}>Backup</h2>
          <p style={paragraph}>
            Du kannst deine Daten jederzeit als Datei exportieren. Beachte: Wenn du
            die Browser- oder App-Daten löschst, können auch die lokalen RED-Fit-Daten
            entfernt werden. Erstelle deshalb regelmäßig ein Backup.
          </p>
        </Card>
        <Card flat>
          <p style={{ ...paragraph, fontSize: 14 }}>
            RED Fit ersetzt keine medizinische Beratung. Trainings- und
            Ernährungshinweise dienen nur zur Orientierung.
          </p>
        </Card>
      </div>
    </>
  );
}

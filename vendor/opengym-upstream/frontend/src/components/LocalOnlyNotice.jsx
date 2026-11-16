import { isLocalOnly } from '../lib/local-only.js'

export default function LocalOnlyNotice() {
  if (!isLocalOnly()) return null
  return <section className="card" aria-label="Datenschutz">
    <h2 className="ttl">Deine Daten bleiben bei dir</h2>
    <p className="muted small">RED Fit speichert Training und Ernährung auf diesem Gerät. Cloud-Sync, externe KI, Online-Karten und Tracking sind deaktiviert. Apple Health kannst du in den Einstellungen selbst einschalten; die Daten bleiben auf deinem iPhone.</p>
    <p className="dim small">Sichere deine Daten unter „Data &amp; backup“. Beim Export wählst du selbst, wohin die Datei geht.</p>
  </section>
}

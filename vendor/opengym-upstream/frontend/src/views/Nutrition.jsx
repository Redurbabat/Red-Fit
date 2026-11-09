import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { MOBILE, shareExport } from '../lib/mobile.js'
import { EMPTY, localDateKey, makeMealEntry, MEAL_TYPES, scaleFood, totalsOf } from '../nutrition/model.js'
import { exportNutrition, importNutrition, loadNutrition, removeMealEntry, saveFood, saveMealEntry } from '../nutrition/repository.js'
import { nutritionScope } from '../nutrition/scope.js'
import { readLatestNutritionDocumentBackup, writeNutritionDocumentBackup } from '../nutrition/native-backup.js'
import '../nutrition/nutrition.css'

const numberText = (value, digits = 1) => Number(value || 0).toLocaleString('de-CH', { maximumFractionDigits: digits })
const freshFood = { name: '', kcal100: '', protein100: '', carbs100: '', fat100: '', barcode: '' }
const newID = () => globalThis.crypto?.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('')

// Unmount this page immediately when openGym changes account. A guest stays local-only.
export default function Nutrition() {
  const userId = useStore(s => s.user?.id)
  const server = useStore(s => s.sync?.server)
  const scope = nutritionScope({ userId, server, origin: MOBILE ? null : globalThis.location?.origin })
  return <NutritionForScope key={scope} scope={scope} />
}

function NutritionForScope({ scope }) {
  const nav = useNavigate()
  const [date, setDate] = useState(localDateKey)
  const [foods, setFoods] = useState([])
  const [entries, setEntries] = useState([])
  const [foodInput, setFoodInput] = useState(freshFood)
  const [selected, setSelected] = useState('')
  const [grams, setGrams] = useState('100')
  const [mealType, setMealType] = useState(MEAL_TYPES[0])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const restoringRef = useRef(false)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const saved = await loadNutrition(scope)
    setFoods(saved.foods.sort((a, b) => a.name.localeCompare(b.name, 'de')))
    setEntries(saved.entries)
    return saved
  }
  useEffect(() => {
    let alive = true
    loadNutrition(scope).then(data => {
      if (!alive) return
      setFoods(data.foods.sort((a, b) => a.name.localeCompare(b.name, 'de')))
      setEntries(data.entries)
      setLoading(false)
    }).catch(e => { if (alive) { setError(e.message); setLoading(false) } })
    return () => { alive = false }
  }, [scope])
  const today = useMemo(() => entries.filter(e => e.date === date), [entries, date])
  const totals = useMemo(() => totalsOf(today), [today])
  const chosen = foods.find(f => f.id === selected)
  const preview = useMemo(() => {
    if (!chosen || !Number(grams)) return EMPTY
    try { return scaleFood(chosen, Number(grams)) } catch { return EMPTY }
  }, [chosen, grams])

  async function run(action, success) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      // A database transaction must finish before the UI announces success.
      const result = await action()
      const warnings = []
      try { await refresh() } catch { warnings.push('Anzeige konnte nicht neu geladen werden.') }
      if (MOBILE) {
        try {
          await writeNutritionDocumentBackup(scope, await exportNutrition(scope))
        } catch (e) {
          warnings.push('Automatische Dateisicherung fehlgeschlagen (' + (e?.message || 'Dateifehler') + '). Bitte JSON separat exportieren.')
        }
      }
      setMessage(typeof success === 'function' ? success(result) : success || 'Ernährungsdaten gespeichert.')
      if (warnings.length) setError(warnings.join(' '))
    } catch (e) { setError(e?.message || 'Die Änderung konnte nicht gespeichert werden.') }
    finally { busyRef.current = false; setBusy(false) }
  }
  async function onAddFood(event) {
    event.preventDefault()
    const food = { ...foodInput, id: newID(),
      kcal100: Number(foodInput.kcal100), protein100: Number(foodInput.protein100),
      carbs100: Number(foodInput.carbs100), fat100: Number(foodInput.fat100) }
    await run(async () => { await saveFood(scope, food); setSelected(food.id); setFoodInput(freshFood) }, 'Lebensmittel lokal gespeichert.')
  }
  async function onAddEntry(event) {
    event.preventDefault()
    if (!chosen) { setError('Bitte ein Lebensmittel wählen.'); return }
    await run(() => saveMealEntry(scope, makeMealEntry(chosen, Number(grams), mealType, date, newID())), 'Mahlzeit gespeichert.')
  }
  async function onExport() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true); setMessage(''); setError('')
    try {
      const json = await exportNutrition(scope)
      const filename = 'redfit-ernaehrung-' + localDateKey() + '.json'
      if (MOBILE) await shareExport(json, filename)
      else {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
        try {
          const link = document.createElement('a')
          link.href = url; link.download = filename
          document.body.appendChild(link); link.click(); link.remove()
        } finally { setTimeout(() => URL.revokeObjectURL(url), 1000) }
      }
      setMessage('Ernährungsbackup zum Speichern bereitgestellt.')
    } catch (e) { setError(e.message || 'Export fehlgeschlagen.') }
    finally { busyRef.current = false; setBusy(false) }
  }
  async function onImport(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Backup ist zu gross (max. 5 MB).'); return }
    let backup
    try { backup = JSON.parse(await file.text()) } catch { setError('Keine gültige JSON-Datei.'); return }
    if (!window.confirm('Ernährungseinträge aus dieser Datei hinzufügen? Bestehende Daten bleiben erhalten.')) return
    await run(() => importNutrition(scope, backup), added =>
      'Importiert: ' + added.foods + ' Lebensmittel und ' + added.entries + ' Einträge.')

  }
  async function onRestoreNative() {
    if (busyRef.current || restoringRef.current) return
    restoringRef.current = true
    setBusy(true)
    setError(''); setMessage('')
    let latest
    try {
      latest = await readLatestNutritionDocumentBackup(scope)
    } catch (e) {
      setError(e?.message || 'Gerätesicherung konnte nicht gelesen werden.')
      return
    } finally {
      restoringRef.current = false
      setBusy(false)
    }
    if (!window.confirm('Gerätesicherung vom ' + latest.day + ' für dieses Konto importieren? Bestehende Mahlzeiten bleiben erhalten.')) return
    await run(() => importNutrition(scope, latest.backup), added =>
      'Gerätesicherung vom ' + latest.day + ' importiert: ' + added.foods + ' Lebensmittel und ' + added.entries + ' Einträge ergänzt.')
  }
  if (loading) return <main className="narrow nutrition-page"><p role="status">Ernährung wird geladen …</p></main>

  return <main className="narrow nutrition-page">
    <div className="nutrition-head">
      <button type="button" onClick={() => nav('/home')} aria-label="Zur Startseite">‹ Zurück</button>
      <div><h1>Ernährung</h1><p>RED Fit · Offline auf diesem Gerät</p></div>
    </div>
    {error && <div className="nutrition-error" role="alert">{error}</div>}
    {message && <div className="nutrition-success" role="status">{message}</div>}

    <section className="card nutrition-section" aria-labelledby="nutrition-day">
      <h2 id="nutrition-day">Tagesübersicht</h2>
      <label>Datum <input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
      <div className="nutrition-totals" aria-live="polite">
        <strong>{numberText(totals.kcal, 0)} <small>kcal</small></strong>
        <span>Protein <b>{numberText(totals.protein)} g</b></span>
        <span>Kohlenhydrate <b>{numberText(totals.carbs)} g</b></span>
        <span>Fett <b>{numberText(totals.fat)} g</b></span>
      </div>
    </section>

    <section className="card nutrition-section" aria-labelledby="nutrition-log">
      <h2 id="nutrition-log">Mahlzeit eintragen</h2>
      <form onSubmit={onAddEntry}>
        <label>Lebensmittel
          <select value={selected} onChange={e => setSelected(e.target.value)} required>
            <option value="">Lebensmittel auswählen</option>
            {foods.map(f => <option key={f.id} value={f.id}>{f.name}{f.barcode ? ' · ' + f.barcode : ''}</option>)}
          </select>
        </label>
        <div className="nutrition-grid">
          <label>Menge (g)<input type="number" min="0.1" max="100000" step="any" required value={grams} onChange={e => setGrams(e.target.value)} /></label>
          <label>Mahlzeit<select value={mealType} onChange={e => setMealType(e.target.value)}>{MEAL_TYPES.map(m => <option key={m}>{m}</option>)}</select></label>
        </div>
        {chosen && <p className="nutrition-preview">Vorschau: {numberText(preview.kcal, 0)} kcal · {numberText(preview.protein)} g Protein · {numberText(preview.carbs)} g KH · {numberText(preview.fat)} g Fett</p>}
        <button type="submit" className="nutrition-primary" disabled={busy || !chosen || !date}>Mahlzeit speichern</button>
      </form>
    </section>

    <section className="card nutrition-section" aria-labelledby="nutrition-food">
      <h2 id="nutrition-food">Lebensmittel hinzufügen</h2>
      <p className="nutrition-hint">Werte immer pro 100 g. Barcode kann manuell eingegeben werden; Internet oder Scanner sind nicht nötig.</p>
      <form onSubmit={onAddFood}>
        <label>Name<input required maxLength="120" value={foodInput.name} onChange={e => setFoodInput(f => ({ ...f, name: e.target.value }))} placeholder="z. B. Haferflocken" /></label>
        <div className="nutrition-grid">
          {[['kcal100', 'kcal / 100 g'], ['protein100', 'Protein / 100 g'], ['carbs100', 'Kohlenhydrate / 100 g'], ['fat100', 'Fett / 100 g']].map(([key, label]) =>
            <label key={key}>{label}<input type="number" min="0" step="any" required value={foodInput[key]} onChange={e => setFoodInput(f => ({ ...f, [key]: e.target.value }))} /></label>)}
        </div>
        <label>Barcode (optional)<input inputMode="numeric" value={foodInput.barcode} maxLength="80" onChange={e => setFoodInput(f => ({ ...f, barcode: e.target.value }))} placeholder="z. B. 0012345678" /></label>
        <button type="submit" disabled={busy} className="nutrition-secondary">Lebensmittel speichern</button>
      </form>
    </section>

    <section className="card nutrition-section" aria-labelledby="nutrition-meals">
      <h2 id="nutrition-meals">Einträge vom {date}</h2>
      {!today.length && <p className="nutrition-hint">Noch keine Mahlzeiten für diesen Tag.</p>}
      {MEAL_TYPES.map(type => {
        const list = today.filter(e => e.mealType === type)
        if (!list.length) return null
        return <div key={type} className="nutrition-mealgroup"><h3>{type}</h3>{list.map(e =>
          <div className="nutrition-entry" key={e.id}>
            <div><strong>{e.foodName}</strong><div className="nutrition-hint">{numberText(e.grams)} g · {numberText(e.kcal, 0)} kcal · P {numberText(e.protein)} · KH {numberText(e.carbs)} · F {numberText(e.fat)}</div></div>
            <button type="button" disabled={busy} aria-label={e.foodName + ' löschen'} onClick={() => {
              if (window.confirm('Diesen Eintrag wirklich löschen?')) run(() => removeMealEntry(scope, e.id), 'Eintrag gelöscht.')
            }}>Löschen</button>
          </div>)}</div>
      })}
    </section>

    <section className="card nutrition-section" aria-labelledby="nutrition-backup">
      <h2 id="nutrition-backup">Ernährung sichern</h2>
      <p className="nutrition-hint">Ernährung liegt in einer eigenen lokalen IndexedDB und wird NICHT vom originalen openGym-Workout-Backup oder Server-Sync erfasst. Der Speicher ist pro openGym-Server und Benutzerkonto getrennt. Vor Gerätewechsel oder App-Löschung immer eine JSON-Datei extern sichern.</p>
      {MOBILE && <p className="nutrition-hint">Nach jeder Änderung versucht RED Fit zusätzlich eine datierte Kopie im App-Dokumentenordner anzulegen. Der Ordner ist je nach iOS-Konfiguration nicht direkt in der Dateien-App sichtbar. Die lokale Sicherung schützt NICHT vor App-Löschung; vor Gerätewechsel oder Deinstallation immer JSON extern exportieren.</p>}
      <div className="nutrition-actions">
        <button type="button" disabled={busy} onClick={onExport}>JSON exportieren</button>
        {MOBILE && <button type="button" disabled={busy} onClick={onRestoreNative}>Letzte Gerätesicherung wiederherstellen</button>}
        <label className="nutrition-file">JSON importieren<input type="file" accept=".json,application/json" disabled={busy} onChange={onImport} /></label>
      </div>
      <p className="nutrition-hint">Import ergänzt vorhandene Einträge und bewahrt unterschiedliche Datensätze mit gleicher ID.</p>
    </section>
  </main>
}

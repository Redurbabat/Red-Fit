import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { MOBILE, shareExport } from '../lib/mobile.js'
import { EMPTY, localDateKey, makeMealEntry, makePlannedMeal, makeRecipeFood, MEAL_TYPES, planDates, scaleFood, shoppingListOf, totalsOf } from '../nutrition/model.js'
import { completePlannedMeal, exportNutrition, importNutrition, loadNutrition, removeMealEntry, removePlannedMeal, saveFood, saveMealEntry, savePlannedMeal } from '../nutrition/repository.js'
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
  const [recipeName, setRecipeName] = useState('')
  const [recipeServings, setRecipeServings] = useState('2')
  const [recipeYield, setRecipeYield] = useState('')
  const [recipeIngredients, setRecipeIngredients] = useState([])
  const [recipeSelected, setRecipeSelected] = useState('')
  const [recipeGrams, setRecipeGrams] = useState('100')
  const [plans, setPlans] = useState([])
  const [planStart, setPlanStart] = useState(localDateKey)
  const [planDate, setPlanDate] = useState(localDateKey)
  const [planFoodId, setPlanFoodId] = useState('')
  const [planGrams, setPlanGrams] = useState('100')
  const [planType, setPlanType] = useState(MEAL_TYPES[0])

  async function refresh() {
    const saved = await loadNutrition(scope)
    setFoods(saved.foods.sort((a, b) => a.name.localeCompare(b.name, 'de')))
    setEntries(saved.entries)
    setPlans(saved.plans)
    return saved
  }
  useEffect(() => {
    let alive = true
    loadNutrition(scope).then(data => {
      if (!alive) return
      setFoods(data.foods.sort((a, b) => a.name.localeCompare(b.name, 'de')))
      setEntries(data.entries)
      setPlans(data.plans)
      setLoading(false)
    }).catch(e => { if (alive) { setError(e.message); setLoading(false) } })
    return () => { alive = false }
  }, [scope])
  const today = useMemo(() => entries.filter(e => e.date === date), [entries, date])
  const totals = useMemo(() => totalsOf(today), [today])
  const chosen = foods.find(f => f.id === selected)
  const weekDates = useMemo(() => planDates(planStart), [planStart])
  const weekPlans = useMemo(() => plans
    .filter(p => weekDates.includes(p.date))
    .sort((a, b) => a.date.localeCompare(b.date) || MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType)),
    [plans, weekDates])
  const pendingPlans = useMemo(() => weekPlans.filter(p => p.status !== 'done'), [weekPlans])
  const plannedTotals = useMemo(() => totalsOf(pendingPlans), [pendingPlans])
  const shopping = useMemo(() => shoppingListOf(pendingPlans), [pendingPlans])
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
  function onAddRecipeIngredient(event) {
    event.preventDefault()
    if (busyRef.current) return
    const food = foods.find(f => f.id === recipeSelected)
    if (!food) { setError('Bitte eine Zutat auswählen.'); return }
    try {
      const grams = Number(recipeGrams)
      scaleFood(food, grams) // validates the weight and prevents invalid snapshots
      setRecipeIngredients(list => [...list, { key: newID(), food, grams }])
      setRecipeSelected('')
      setRecipeGrams('100')
      setError('')
    } catch (e) { setError(e?.message || 'Ungültige Zutatenmenge.') }
  }
  async function onSaveRecipe(event) {
    event.preventDefault()
    if (!recipeIngredients.length) { setError('Bitte mindestens eine Zutat hinzufügen.'); return }
    const rawYield = recipeIngredients.reduce((total, item) => total + item.grams, 0)
    let recipe
    try {
      recipe = makeRecipeFood({
        id: newID(), name: recipeName, ingredients: recipeIngredients,
        yieldGrams: recipeYield.trim() ? Number(recipeYield) : rawYield,
        servings: Number(recipeServings),
      })
    } catch (e) { setError(e?.message || 'Rezept konnte nicht berechnet werden.'); return }
    await run(async () => {
      await saveFood(scope, recipe)
      setSelected(recipe.id)
      setRecipeName('')
      setRecipeYield('')
      setRecipeServings('2')
      setRecipeIngredients([])
    }, 'Rezept offline gespeichert. Als Lebensmittel auswählbar.')
  }
  async function onAddPlan(event) {
    event.preventDefault()
    const food = foods.find(f => f.id === planFoodId)
    if (!food) { setError('Bitte ein Lebensmittel für den Plan auswählen.'); return }
    let plan
    try { plan = makePlannedMeal(food, Number(planGrams), planType, planDate, newID()) }
    catch (e) { setError(e?.message || 'Ungültige Planung.'); return }
    await run(async () => {
      await savePlannedMeal(scope, plan)
      setPlanStart(plan.date)
    }, 'Mahlzeit für ' + plan.date + ' geplant.')
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
      'Importiert: ' + added.foods + ' Lebensmittel, ' + added.entries + ' Einträge und ' + added.plans + ' Pläne.')

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
      'Gerätesicherung vom ' + latest.day + ' importiert: ' + added.foods + ' Lebensmittel, ' + added.entries + ' Einträge und ' + added.plans + ' Pläne ergänzt.')
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

    <section className="card nutrition-section nutrition-recipes" aria-label="Rezepte erstellen">
      <details>
        <summary>Rezepte erstellen und speichern</summary>
        <p className="nutrition-hint">Mehrere Lebensmittel kombinieren. Die Werte werden aus den Zutaten berechnet und als Rezept gespeichert. Das zubereitete Gewicht kann vom Rohgewicht abweichen.</p>
        <form onSubmit={onAddRecipeIngredient}>
          <div className="nutrition-grid">
            <label>Zutat
              <select value={recipeSelected} onChange={e => setRecipeSelected(e.target.value)} required>
                <option value="">Lebensmittel wählen</option>
                {foods.map(food => <option key={food.id} value={food.id}>{food.name}</option>)}
              </select>
            </label>
            <label>Zutatenmenge (g)
              <input type="number" min="0.1" max="100000" step="any" value={recipeGrams} required onChange={e => setRecipeGrams(e.target.value)} />
            </label>
          </div>
          <button type="submit" className="nutrition-secondary" disabled={busy || !foods.length}>Zutat hinzufügen</button>
        </form>
        {recipeIngredients.length > 0 && <ul className="nutrition-ingredient-list">
          {recipeIngredients.map(item => <li key={item.key}>
            <span>{item.food.name} · {numberText(item.grams)} g</span>
            <button type="button" disabled={busy} onClick={() => setRecipeIngredients(list => list.filter(row => row.key !== item.key))} aria-label={item.food.name + ' aus Rezept entfernen'}>Entfernen</button>
          </li>)}
        </ul>}
        <form onSubmit={onSaveRecipe}>
          <label>Rezeptname
            <input required maxLength="120" value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="z. B. Haferbrei" />
          </label>
          <div className="nutrition-grid">
            <label>Portionen
              <input type="number" min="1" max="1000" step="1" required value={recipeServings} onChange={e => setRecipeServings(e.target.value)} />
            </label>
            <label>Zubereitetes Gesamtgewicht (g)
              <input type="number" min="0.1" max="100000" step="any" value={recipeYield} onChange={e => setRecipeYield(e.target.value)} placeholder="Leer = Summe der Zutaten" />
            </label>
          </div>
          <p className="nutrition-hint">Ohne Angabe des zubereiteten Gewichts wird die Summe der Zutatenmengen verwendet. Makros bleiben unverändert; der Wert pro 100 g passt sich dem fertigen Gewicht an.</p>
          <button type="submit" className="nutrition-primary" disabled={busy || recipeIngredients.length === 0}>Rezept speichern</button>
        </form>
      </details>
      {foods.some(food => food.recipe) && <div className="nutrition-saved-recipes">
        <h3>Gespeicherte Rezepte</h3>
        {foods.filter(food => food.recipe).map(food => <details key={food.id}>
          <summary>{food.name} · {food.recipe.servings} Portionen</summary>
          <p className="nutrition-hint">{numberText(food.recipe.yieldGrams)} g zubereitet · {numberText(food.kcal100, 0)} kcal / 100 g</p>
          <ul>{food.recipe.ingredients.map((item, i) => <li key={i}>{item.foodName}: {numberText(item.grams)} g</li>)}</ul>
          <div className="nutrition-actions">
            <button type="button" disabled={busy || !date} onClick={() =>
              run(() => saveMealEntry(scope, makeMealEntry(
                food, food.recipe.yieldGrams / food.recipe.servings, mealType, date, newID()
              )), 'Eine Portion ' + food.name + ' erfasst.')
            }>1 Portion erfassen</button>
            <button type="button" disabled={busy} onClick={() => {
              setSelected(food.id)
              setGrams(String(food.recipe.yieldGrams / food.recipe.servings))
              window.scrollTo?.({ top: 0, behavior: 'smooth' })
            }}>Für Mahlzeit auswählen</button>
          </div>
        </details>)}
      </div>}
    </section>

    <section className="card nutrition-section nutrition-planning" aria-labelledby="nutrition-planning">
      <h2 id="nutrition-planning">Mahlzeitenplanung</h2>
      <p className="nutrition-hint">Geplante Mahlzeiten zählen nicht zu den gegessenen Kalorien. Erst „Als gegessen erfassen“ überträgt sie in das Ernährungstagebuch. Lebensmittel und Rezepte können geplant werden.</p>
      <form onSubmit={onAddPlan}>
        <label>Lebensmittel oder Rezept
          <select required value={planFoodId} onChange={e => {
            const food = foods.find(f => f.id === e.target.value)
            setPlanFoodId(e.target.value)
            if (food?.recipe) setPlanGrams(String(food.recipe.yieldGrams / food.recipe.servings))
          }}>
            <option value="">Bitte wählen</option>
            {foods.map(food => <option key={food.id} value={food.id}>{food.name}{food.recipe ? ' · Rezept' : ''}</option>)}
          </select>
        </label>
        <div className="nutrition-grid">
          <label>Tag
            <input type="date" required value={planDate} onChange={e => setPlanDate(e.target.value)} />
          </label>
          <label>Mahlzeit
            <select value={planType} onChange={e => setPlanType(e.target.value)}>
              {MEAL_TYPES.map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>Menge (g)
            <input type="number" min="0.1" max="100000" step="any" required value={planGrams} onChange={e => setPlanGrams(e.target.value)} />
          </label>
        </div>
        <button type="submit" className="nutrition-primary" disabled={busy || !planFoodId}>Mahlzeit planen</button>
      </form>
      <div className="nutrition-weekhead">
        <h3>7-Tage-Plan</h3>
        <label>Startdatum
          <input type="date" value={planStart} required onChange={e => setPlanStart(e.target.value)} />
        </label>
      </div>
      <p className="nutrition-hint">{pendingPlans.length} offene Mahlzeiten · {numberText(plannedTotals.kcal, 0)} kcal für diese 7 Tage geplant</p>
      <div className="nutrition-week">
        {weekDates.map(day => {
          const dayPlans = weekPlans.filter(p => p.date === day)
          return <div key={day} className="nutrition-plan-day">
            <h4>{day}</h4>
            {!dayPlans.length && <p className="nutrition-hint">Keine Mahlzeiten geplant.</p>}
            {dayPlans.map(plan => <div className="nutrition-plan-entry" key={plan.id}>
              <div>
                <strong>{plan.mealType} · {plan.foodName}</strong>
                <p className="nutrition-hint">{numberText(plan.grams)} g · {numberText(plan.kcal, 0)} kcal{plan.status === 'done' ? ' · Erfasst' : ' · Geplant'}</p>
              </div>
              {plan.status !== 'done' && <div className="nutrition-plan-actions">
                <button type="button" disabled={busy} onClick={() =>
                  run(() => completePlannedMeal(scope, plan.id, newID()), 'Mahlzeit als gegessen erfasst.')
                }>Als gegessen erfassen</button>
                <button type="button" disabled={busy} onClick={() => {
                  if (window.confirm('Diese geplante Mahlzeit entfernen?'))
                    run(() => removePlannedMeal(scope, plan.id), 'Plan entfernt.')
                }}>Entfernen</button>
              </div>}
            </div>)}
          </div>
        })}
      </div>
      <details className="nutrition-shopping">
        <summary>Einkaufsliste für diese 7 Tage ({shopping.length})</summary>
        {shopping.length
          ? <ul>{shopping.map(item => <li key={item.foodName.toLocaleLowerCase('de-CH')}>
              <span>{item.foodName}</span><strong>{numberText(item.grams)} g</strong>
            </li>)}</ul>
          : <p className="nutrition-hint">Keine offenen geplanten Zutaten für diesen Zeitraum.</p>}
        <p className="nutrition-hint">Die Liste wird aus den geplanten Zutaten berechnet; bereits erfasste Mahlzeiten sind nicht mehr enthalten.</p>
      </details>
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
      <p className="nutrition-hint">Import ergänzt vorhandene Lebensmittel, Tagebucheinträge und Mahlzeitenpläne. Alte Ernährungssicherungen (v1) bleiben importierbar.</p>
    </section>
  </main>
}

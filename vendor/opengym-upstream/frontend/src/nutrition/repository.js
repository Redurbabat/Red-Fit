// Separate, additive IndexedDB database: never writes gym_state_v1, sync stamps, native mirrors,
// or the existing RED Fit workout JSON. Native WebView and offline browser both use this store.
import { mergeRecords, validateBackup, validateEntry, validateFood, validatePlannedMeal } from './model.js'

const DB_NAME = 'redfit-nutrition-v1'
function openDB(scope) {
  if (typeof scope !== 'string' || !scope || scope.length > 300) throw new Error('Ungültiger Ernährungsspeicher.');
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB ist auf diesem Gerät nicht verfügbar.')); return }
    const req = indexedDB.open(DB_NAME + ':' + scope, 2)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('foods')) db.createObjectStore('foods', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('entries')) {
        const entries = db.createObjectStore('entries', { keyPath: 'id' })
        entries.createIndex('date', 'date', { unique: false })
      }
      // v1 -> v2 is additive: never delete or rewrite existing meals/foods.
      if (!db.objectStoreNames.contains('plans')) {
        const plans = db.createObjectStore('plans', { keyPath: 'id' })
        plans.createIndex('date', 'date', { unique: false })
      }
    }
    req.onerror = () => reject(req.error || new Error('Ernährungsspeicher konnte nicht geöffnet werden.'))
    req.onblocked = () => reject(new Error('Bitte die andere geöffnete RED-Fit-Version schliessen.'))
    req.onsuccess = () => resolve(req.result)
  })
}
async function withTransaction(scope, mode, stores, enqueue) {
  const db = await openDB(scope)
  try {
    return await new Promise((resolve, reject) => {
      let tx
      try { tx = db.transaction(stores, mode) } catch (e) { reject(e); return }
      let result
      const setResult = value => { result = value }
      tx.oncomplete = () => resolve(result)
      tx.onabort = () => reject(tx.error || new Error('Speichern abgebrochen; bestehende Daten bleiben erhalten.'))
      tx.onerror = () => reject(tx.error || new Error('Speichern fehlgeschlagen.'))
      try { enqueue(tx, setResult) } catch (e) { tx.abort(); reject(e) }
    })
  } finally { db.close() }
}
export async function loadNutrition(scope) {
  return withTransaction(scope, 'readonly', ['foods', 'entries', 'plans'], (tx, done) => {
    const foods = tx.objectStore('foods').getAll()
    const entries = tx.objectStore('entries').getAll()
    const plans = tx.objectStore('plans').getAll()
    const ready = () => {
      if ([foods, entries, plans].every(req => req.readyState === 'done'))
        done({ foods: foods.result, entries: entries.result, plans: plans.result })
    }
    foods.onsuccess = ready
    entries.onsuccess = ready
    plans.onsuccess = ready
  })
}
export async function saveFood(scope, raw) {
  const food = validateFood(raw)
  await withTransaction(scope, 'readwrite', ['foods'], tx => { tx.objectStore('foods').add(food) })
  return food
}
export async function saveMealEntry(scope, raw) {
  const entry = validateEntry(raw)
  await withTransaction(scope, 'readwrite', ['entries'], tx => { tx.objectStore('entries').add(entry) })
  return entry
}
export async function removeMealEntry(scope, id) {
  if (typeof id !== 'string' || !id) throw new Error('Ungültige Eintrags-ID.')
  await withTransaction(scope, 'readwrite', ['entries'], tx => { tx.objectStore('entries').delete(id) })
}
export async function savePlannedMeal(scope, raw) {
  const plan = validatePlannedMeal(raw)
  await withTransaction(scope, 'readwrite', ['plans'], tx => { tx.objectStore('plans').add(plan) })
  return plan
}
export async function removePlannedMeal(scope, id) {
  if (typeof id !== 'string' || !id) throw new Error('Ungültige Plan-ID.')
  await withTransaction(scope, 'readwrite', ['plans'], tx => { tx.objectStore('plans').delete(id) })
}
// Completing a plan is one atomic transaction. It creates exactly one logged meal
// and marks the plan as done, preventing a second tap from double-counting calories.
export async function completePlannedMeal(scope, planId, entryId) {
  if (typeof planId !== 'string' || !planId || typeof entryId !== 'string' || !entryId)
    throw new Error('Ungültige Mahlzeiten-ID.')
  return withTransaction(scope, 'readwrite', ['plans', 'entries'], (tx, done) => {
    const store = tx.objectStore('plans')
    const request = store.get(planId)
    request.onsuccess = () => {
      try {
        if (!request.result) throw new Error('Plan nicht mehr vorhanden.')
        const plan = validatePlannedMeal(request.result)
        if (plan.status === 'done') throw new Error('Dieser Plan wurde schon als gegessen markiert.')
        const logged = validateEntry({ ...plan, id: entryId })
        const completed = validatePlannedMeal({ ...plan, status: 'done', loggedEntryId: entryId })
        tx.objectStore('entries').add(logged)
        store.put(completed)
        done(logged)
      } catch { tx.abort() }
    }
  })
}
export async function exportNutrition(scope) {
  const { foods, entries, plans } = await loadNutrition(scope)
  return JSON.stringify(validateBackup({ format: 'redfit-nutrition', version: 2, foods, entries, plans }), null, 2)
}
export async function importNutrition(scope, raw) {
  const backup = validateBackup(raw) // validate all rows before any write transaction
  return withTransaction(scope, 'readwrite', ['foods', 'entries', 'plans'], (tx, done) => {
    const f = tx.objectStore('foods'), e = tx.objectStore('entries'), p = tx.objectStore('plans')
    const fr = f.getAll(), er = e.getAll(), pr = p.getAll()
    let consumed = false
    const onRead = () => {
      if (consumed || [fr, er, pr].some(req => req.readyState !== 'done')) return
      consumed = true
      try {
        const foods = mergeRecords(fr.result, backup.foods, validateFood)
        const entries = mergeRecords(er.result, backup.entries, validateEntry)
        // A v1 import never removes the v2 planning data already on the device.
        const plans = mergeRecords(pr.result, backup.plans || [], validatePlannedMeal)
        for (const row of foods) f.put(row)
        for (const row of entries) e.put(row)
        for (const row of plans) p.put(row)
        done({
          foods: foods.length - fr.result.length,
          entries: entries.length - er.result.length,
          plans: plans.length - pr.result.length,
        })
      } catch { tx.abort() }
    }
    fr.onsuccess = onRead
    er.onsuccess = onRead
    pr.onsuccess = onRead
  })
}

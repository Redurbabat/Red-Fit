// Separate, additive IndexedDB database: never writes gym_state_v1, sync stamps, native mirrors,
// or the existing openGym workout JSON. Native WebView and offline browser both use this store.
import { mergeRecords, validateBackup, validateEntry, validateFood } from './model.js'

const DB_NAME = 'redfit-nutrition-v1'
function openDB(scope) {
  if (typeof scope !== 'string' || !scope || scope.length > 300) throw new Error('Ungültiger Ernährungsspeicher.');
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB ist auf diesem Gerät nicht verfügbar.')); return }
    const req = indexedDB.open(DB_NAME + ':' + scope, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('foods')) db.createObjectStore('foods', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('entries')) {
        const entries = db.createObjectStore('entries', { keyPath: 'id' })
        entries.createIndex('date', 'date', { unique: false })
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
  return withTransaction(scope, 'readonly', ['foods', 'entries'], (tx, done) => {
    const foods = tx.objectStore('foods').getAll()
    const entries = tx.objectStore('entries').getAll()
    entries.onsuccess = () => { if (foods.readyState === 'done') done({ foods: foods.result, entries: entries.result }) }
    foods.onsuccess = () => { if (entries.readyState === 'done') done({ foods: foods.result, entries: entries.result }) }
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
export async function exportNutrition(scope) {
  const { foods, entries } = await loadNutrition(scope)
  return JSON.stringify(validateBackup({ format: 'redfit-nutrition', version: 1, foods, entries }), null, 2)
}
export async function importNutrition(scope, raw) {
  const backup = validateBackup(raw) // validate fully BEFORE opening the write transaction
  return withTransaction(scope, 'readwrite', ['foods', 'entries'], (tx, done) => {
    const f = tx.objectStore('foods'), e = tx.objectStore('entries')
    const fr = f.getAll(), er = e.getAll()
    let consumed = false
    const onRead = () => {
      if (consumed || fr.readyState !== 'done' || er.readyState !== 'done') return
      consumed = true
      try {
        const foods = mergeRecords(fr.result, backup.foods, validateFood)
        const entries = mergeRecords(er.result, backup.entries, validateEntry)
        for (const row of foods) f.put(row)
        for (const row of entries) e.put(row)
        done({ foods: foods.length - fr.result.length, entries: entries.length - er.result.length })
      } catch { tx.abort() }
    }
    fr.onsuccess = onRead
    er.onsuccess = onRead
  })
}

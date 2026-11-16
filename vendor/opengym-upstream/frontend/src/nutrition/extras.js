// Additive native nutrition features. The existing foods/entries/plans stores stay intact.
import { MOBILE, readJsonFile } from '../lib/mobile.js'
import { finiteNumber } from '../native/protocol.js'
import { localDateKey, mergeRecords } from './model.js'

const empty = () => ({ version: 1, revision: 0, water: [], goals: [], shopping: [] })
const date = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      localDateKey(new Date(value + 'T12:00:00')) !== value) throw new Error('Ungültiges Datum.')
  return value
}
const id = value => {
  if (typeof value !== 'string' || !value || value.length > 200) throw new Error('Ungültige ID.')
  return value
}
export const validateWater = row => ({ id: id(row?.id), date: date(row.date), ml: finiteNumber(row.ml, 1, 10000) })
export const validateGoal = row => ({ id: id(row?.id), date: date(row.date),
  kcal: finiteNumber(row.kcal, 0, 20000), protein: finiteNumber(row.protein, 0, 2000),
  carbs: finiteNumber(row.carbs, 0, 3000), fat: finiteNumber(row.fat, 0, 2000), water: finiteNumber(row.water, 0, 20000) })
const validateCheck = row => ({ id: id(row?.id), date: date(row.date), checked: row.checked === true })
export function validateExtras(raw) {
  if (!raw || raw.version !== 1 || !['water', 'goals', 'shopping'].every(k => Array.isArray(raw[k]) && raw[k].length <= 100000))
    throw new Error('Ungültige Ergänzungssicherung.')
  return { version: 1, revision: finiteNumber(raw.revision || 0, 0, Number.MAX_SAFE_INTEGER),
    water: raw.water.map(validateWater), goals: raw.goals.map(validateGoal), shopping: raw.shopping.map(validateCheck) }
}
async function open(scope) {
  if (typeof scope !== 'string' || !scope || scope.length > 300) throw new Error('Ungültiger Ernährungsspeicher.')
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('redfit-nutrition-extra-v1:' + scope, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('state')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function transact(scope, transform) {
  const db = await open(scope)
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('state', transform ? 'readwrite' : 'readonly')
      const store = tx.objectStore('state'), request = store.get('current')
      let result
      request.onsuccess = () => {
        try {
          result = validateExtras(request.result || empty())
          if (transform) { result = validateExtras(transform(result)); store.put(result, 'current') }
        } catch (e) { reject(e); tx.abort() }
      }
      tx.oncomplete = () => resolve(result)
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('Ergänzungen konnten nicht gespeichert werden.'))
    })
  } finally { db.close() }
}
export async function extrasPath(scope) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope))
  return 'redfit-nutrition-extra-' + Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('') + '.json'
}
export async function loadExtras(scope) {
  let current = await transact(scope)
  if (MOBILE) {
    const path = await extrasPath(scope)
    const files = await Promise.all([readJsonFile(path), readJsonFile(path + '.next')])
    for (const file of files) {
      let saved
      try { saved = validateExtras(file) } catch { continue }
      if (saved.revision > current.revision) current = await transact(scope, () => saved)
    }
  }
  return current
}
export async function changeExtras(scope, action, payload) {
  return transact(scope, state => {
    if (action === 'water') {
      const row = validateWater(payload)
      if (!state.water.some(x => x.id === row.id)) state.water.push(row)
    } else if (action === 'removeWater') {
      // Undo of a water entry (native Home). Only that entry by its ID; others stay.
      const target = id(payload?.id)
      state.water = state.water.filter(x => x.id !== target)
    } else if (action === 'goals') {
      const row = validateGoal(payload)
      state.goals = [...state.goals.filter(x => x.date !== row.date), row]
    } else if (action === 'shopping') {
      const row = validateCheck(payload)
      state.shopping = [...state.shopping.filter(x => x.id !== row.id), row]
    } else if (action === 'import') {
      const incoming = validateExtras(payload)
      state.water = mergeRecords(state.water, incoming.water, validateWater)
      state.goals = mergeRecords(state.goals, incoming.goals, validateGoal)
      state.shopping = mergeRecords(state.shopping, incoming.shopping, validateCheck)
    } else throw new Error('Unbekannte Ernährungsaktion.')
    state.revision = Math.max(Date.now(), state.revision + 1)
    return state
  })
}

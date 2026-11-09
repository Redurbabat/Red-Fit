// Nutrition domain for the ORIGINAL openGym frontend. No workout-state mutations.
export const MEAL_TYPES = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']
export const EMPTY = Object.freeze({ kcal: 0, protein: 0, carbs: 0, fat: 0 })

export function localDateKey(now = new Date()) {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}
const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const dt = new Date(value + 'T12:00:00Z')
  return !Number.isNaN(dt.valueOf()) && dt.toISOString().slice(0, 10) === value
}
const positiveId = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && value.trim() === value
const number = (value, label, max) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error(label + ' muss eine gültige Zahl sein.')
  return value
}
export function validateFood(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !positiveId(raw.id)) throw new Error('Ungültige Lebensmittel-ID.')
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name || name.length > 120) throw new Error('Lebensmittelname fehlt oder ist zu lang.')
  if (raw.barcode != null && (typeof raw.barcode !== 'string' || raw.barcode.length > 80)) throw new Error('Ungültiger Barcode.')
  return {
    id: raw.id, name,
    kcal100: number(raw.kcal100, 'Kalorien', 10000),
    protein100: number(raw.protein100, 'Protein', 1000),
    carbs100: number(raw.carbs100, 'Kohlenhydrate', 1000),
    fat100: number(raw.fat100, 'Fett', 1000),
    ...(raw.barcode ? { barcode: raw.barcode } : {}),
  }
}
export function scaleFood(food, grams) {
  const f = validateFood(food), g = number(grams, 'Menge', 100000)
  if (g === 0) throw new Error('Menge muss grösser als 0 sein.')
  return { kcal: f.kcal100 * g / 100, protein: f.protein100 * g / 100,
    carbs: f.carbs100 * g / 100, fat: f.fat100 * g / 100 }
}
export function validateEntry(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !positiveId(raw.id)) throw new Error('Ungültige Mahlzeiten-ID.')
  if (!validDate(raw.date) || !MEAL_TYPES.includes(raw.mealType)) throw new Error('Ungültiger Tag oder Mahlzeitentyp.')
  const foodName = typeof raw.foodName === 'string' ? raw.foodName.trim() : ''
  if (!foodName || foodName.length > 120) throw new Error('Lebensmittelname fehlt.')
  const grams = number(raw.grams, 'Menge', 100000)
  if (grams === 0) throw new Error('Menge muss grösser als 0 sein.')
  return { id: raw.id, date: raw.date, mealType: raw.mealType, foodName, grams,
    kcal: number(raw.kcal, 'Kalorien', 1000000),
    protein: number(raw.protein, 'Protein', 100000),
    carbs: number(raw.carbs, 'Kohlenhydrate', 100000),
    fat: number(raw.fat, 'Fett', 100000) }
}
export function makeMealEntry(food, grams, mealType, date, id) {
  const f = validateFood(food)
  const values = scaleFood(f, grams)
  return validateEntry({ id, date, mealType, foodName: f.name, grams, ...values })
}
export function totalsOf(entries) {
  return entries.reduce((sum, e) => ({
    kcal: sum.kcal + e.kcal, protein: sum.protein + e.protein,
    carbs: sum.carbs + e.carbs, fat: sum.fat + e.fat,
  }), { ...EMPTY })
}

// Stable recovery IDs retain both records if two backups reuse one ID for different content.
// The same import twice is idempotent. All returned records are validated/whitelisted first.
function hashOf(value) {
  let h = 2166136261
  for (const c of JSON.stringify(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return (h >>> 0).toString(16).padStart(8, '0')
}
export function mergeRecords(existing, incoming, validate) {
  const result = new Map()
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  for (const value of existing.map(validate)) result.set(value.id, value)
  for (const value of incoming.map(validate)) {
    const current = result.get(value.id)
    if (!current) { result.set(value.id, value); continue }
    if (equal(current, value)) continue
    const stem = 'restored:' + hashOf(value) + ':' + value.id.slice(0, 140)
    let key = stem, step = 2
    while (result.has(key) && !equal(result.get(key), { ...value, id: key })) key = stem + ':' + step++
    if (!result.has(key)) result.set(key, { ...value, id: key })
  }
  return [...result.values()]
}
export function validateBackup(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.format !== 'redfit-nutrition' || raw.version !== 1 ||
    !Array.isArray(raw.foods) || !Array.isArray(raw.entries) || raw.foods.length > 10000 || raw.entries.length > 100000)
    throw new Error('Keine gültige RED-Fit-Ernährungssicherung (v1).')
  return { format: 'redfit-nutrition', version: 1, foods: raw.foods.map(validateFood), entries: raw.entries.map(validateEntry) }
}

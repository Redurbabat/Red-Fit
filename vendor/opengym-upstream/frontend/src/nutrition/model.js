// Nutrition domain for the ORIGINAL RED Fit frontend. No workout-state mutations.
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
// Recipes are stored as normal foods with an optional immutable ingredient snapshot.
// This reuses the v1 IndexedDB 'foods' store and v1 nutrition backup without migration.
export function validateRecipe(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      !Array.isArray(raw.ingredients) || raw.ingredients.length < 1 || raw.ingredients.length > 50)
    throw new Error('Rezept muss 1 bis 50 Zutaten enthalten.')
  const yieldGrams = number(raw.yieldGrams, 'Zubereitetes Gesamtgewicht', 100000)
  if (yieldGrams === 0) throw new Error('Zubereitetes Gesamtgewicht muss grösser als 0 sein.')
  const servings = number(raw.servings, 'Portionen', 1000)
  if (!Number.isInteger(servings) || servings === 0) throw new Error('Portionen müssen eine positive ganze Zahl sein.')
  const ingredients = raw.ingredients.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Ungültige Zutat.')
    const foodName = typeof item.foodName === 'string' ? item.foodName.trim() : ''
    if (!foodName || foodName.length > 120) throw new Error('Zutatenname fehlt.')
    const grams = number(item.grams, 'Zutatenmenge', 100000)
    if (grams === 0) throw new Error('Zutatenmenge muss grösser als 0 sein.')
    return {
      foodName, grams,
      kcal: number(item.kcal, 'Zutatenkalorien', 1000000),
      protein: number(item.protein, 'Zutatenprotein', 100000),
      carbs: number(item.carbs, 'Zutatenkohlenhydrate', 100000),
      fat: number(item.fat, 'Zutatenfett', 100000),
    }
  })
  return { yieldGrams, servings, ingredients }
}

export function validateFood(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !positiveId(raw.id)) throw new Error('Ungültige Lebensmittel-ID.')
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name || name.length > 120) throw new Error('Lebensmittelname fehlt oder ist zu lang.')
  if (raw.barcode != null && (typeof raw.barcode !== 'string' || raw.barcode.length > 80)) throw new Error('Ungültiger Barcode.')
  const recipe = raw.recipe === undefined ? null : validateRecipe(raw.recipe)
  if (recipe) {
    const nutrients = ['kcal', 'protein', 'carbs', 'fat']
    for (const nutrient of nutrients) {
      const total = recipe.ingredients.reduce((sum, item) => sum + item[nutrient], 0)
      const expected = total * 100 / recipe.yieldGrams
      const actual = raw[nutrient + '100']
      if (typeof actual !== 'number' || !Number.isFinite(actual) ||
          Math.abs(actual - expected) > Math.max(1e-7, Math.abs(expected) * 1e-10))
        throw new Error('Rezept-Nährwerte stimmen nicht mit den Zutaten überein.')
    }
  }
  return {
    id: raw.id, name,
    kcal100: number(raw.kcal100, 'Kalorien', 10000),
    protein100: number(raw.protein100, 'Protein', 1000),
    carbs100: number(raw.carbs100, 'Kohlenhydrate', 1000),
    fat100: number(raw.fat100, 'Fett', 1000),
    ...(raw.barcode ? { barcode: raw.barcode } : {}),
    ...(recipe ? { recipe } : {}),
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
  let cooked = null
  if (raw.weighedAs === 'cooked') {
    const weighedAmountG = number(raw.weighedAmountG, 'Gekochte Menge', 100000)
    const factor = number(raw.cookingYieldFactor, 'Umrechnungsfaktor', 10)
    if (weighedAmountG <= 0 || factor < 0.1 || Math.abs(grams - weighedAmountG / factor) > Math.max(1e-7, grams * 1e-10))
      throw new Error('Gekochte Menge und Rohmenge stimmen nicht überein.')
    cooked = { weighedAs: 'cooked', weighedAmountG, cookingYieldFactor: factor }
  } else if (raw.weighedAmountG !== undefined || raw.cookingYieldFactor !== undefined) throw new Error('Umrechnungsdaten ohne gekochtes Gewicht.')
  return { id: raw.id, date: raw.date, mealType: raw.mealType, foodName, grams,
    kcal: number(raw.kcal, 'Kalorien', 1000000),
    protein: number(raw.protein, 'Protein', 100000),
    carbs: number(raw.carbs, 'Kohlenhydrate', 100000),
    fat: number(raw.fat, 'Fett', 100000), ...(cooked || {}) }
}
export function makeMealEntry(food, grams, mealType, date, id) {
  const f = validateFood(food)
  const values = scaleFood(f, grams)
  return validateEntry({ id, date, mealType, foodName: f.name, grams, ...values })
}
// A recipe becomes one selectable food: a meal logged later keeps its own snapshot.
export function makeRecipeFood({ id, name, ingredients, yieldGrams, servings }) {
  if (!Array.isArray(ingredients) || ingredients.length === 0 || ingredients.length > 50)
    throw new Error('Rezept muss 1 bis 50 Zutaten enthalten.')
  const snapshots = ingredients.map(item => {
    const food = validateFood(item?.food)
    const grams = number(item?.grams, 'Zutatenmenge', 100000)
    if (grams === 0) throw new Error('Zutatenmenge muss grösser als 0 sein.')
    return { foodName: food.name, grams, ...scaleFood(food, grams) }
  })
  const recipe = validateRecipe({ ingredients: snapshots, yieldGrams, servings })
  const totals = totalsOf(recipe.ingredients)
  const f = 100 / recipe.yieldGrams
  return validateFood({
    id, name, kcal100: totals.kcal * f, protein100: totals.protein * f,
    carbs100: totals.carbs * f, fat100: totals.fat * f, recipe,
  })
}


/** Planned meals never count as eaten. Food and recipe ingredient values are snapshotted. */
export function validatePlannedMeal(raw) {
  const entry = validateEntry(raw)
  if (!Array.isArray(raw.ingredients) || raw.ingredients.length === 0 || raw.ingredients.length > 50)
    throw new Error('Ein Plan braucht 1 bis 50 Zutaten.')
  const ingredients = raw.ingredients.map(item => {
    const foodName = typeof item?.foodName === 'string' ? item.foodName.trim() : ''
    if (!foodName || foodName.length > 120) throw new Error('Ungültiger Zutatenname im Plan.')
    const grams = number(item.grams, 'Zutatenmenge', 100000)
    if (grams === 0) throw new Error('Zutatenmenge muss grösser als 0 sein.')
    return { foodName, grams }
  })
  const status = raw.status === undefined ? 'planned' : raw.status
  if (status !== 'planned' && status !== 'done') throw new Error('Ungültiger Planstatus.')
  if (status === 'done' && !positiveId(raw.loggedEntryId)) throw new Error('Abgehaktem Plan fehlt der Mahlzeiteneintrag.')
  if (status === 'planned' && raw.loggedEntryId !== undefined) throw new Error('Offener Plan darf keinen Mahlzeiteneintrag haben.')
  return {
    ...entry, ingredients, status,
    ...(status === 'done' ? { loggedEntryId: raw.loggedEntryId } : {}),
  }
}

export function makePlannedMeal(food, grams, mealType, date, id) {
  const f = validateFood(food)
  const entry = makeMealEntry(f, grams, mealType, date, id)
  const factor = grams / (f.recipe?.yieldGrams || grams)
  const ingredients = f.recipe
    ? f.recipe.ingredients.map(i => ({ foodName: i.foodName, grams: i.grams * factor }))
    : [{ foodName: f.name, grams }]
  return validatePlannedMeal({ ...entry, ingredients, status: 'planned' })
}

export function planDates(from, days = 7) {
  if (!validDate(from) || !Number.isInteger(days) || days < 1 || days > 31)
    throw new Error('Ungültige Planungswoche.')
  const date = new Date(from + 'T12:00:00')
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(date)
    day.setDate(date.getDate() + i)
    return localDateKey(day)
  })
}

/** Shopping amounts are derived only from pending plans, grouped by normalized ingredient. */
export function shoppingListOf(plans) {
  const grouped = new Map()
  for (const row of plans) {
    const plan = validatePlannedMeal(row)
    if (plan.status !== 'planned') continue
    for (const item of plan.ingredients) {
      const key = item.foodName.toLocaleLowerCase('de-CH')
      const current = grouped.get(key)
      if (current) current.grams += item.grams
      else grouped.set(key, { foodName: item.foodName, grams: item.grams })
    }
  }
  return [...grouped.values()].sort((a, b) => a.foodName.localeCompare(b.foodName, 'de-CH'))
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
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.format !== 'redfit-nutrition' ||
    (raw.version !== 1 && raw.version !== 2) ||
    !Array.isArray(raw.foods) || !Array.isArray(raw.entries) || raw.foods.length > 10000 || raw.entries.length > 100000 ||
    (raw.version === 2 && (!Array.isArray(raw.plans) || raw.plans.length > 20000)))
    throw new Error('Keine gültige RED-Fit-Ernährungssicherung (v1 oder v2).')
  const legacy = { format: 'redfit-nutrition', version: raw.version,
    foods: raw.foods.map(validateFood), entries: raw.entries.map(validateEntry) }
  return raw.version === 1 ? legacy : { ...legacy, plans: raw.plans.map(validatePlannedMeal) }
}

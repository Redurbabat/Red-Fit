import { describe, expect, it } from 'vitest'
import {
  localDateKey, makeMealEntry, makePlannedMeal, makeRecipeFood,
  mergeRecords, planDates, shoppingListOf, totalsOf,
  validateBackup, validatePlannedMeal,
} from './model.js'

const oats = { id: 'oats', name: 'Haferflocken', kcal100: 370, protein100: 13, carbs100: 60, fat100: 7 }
const milk = { id: 'milk', name: 'Milch', kcal100: 60, protein100: 3.5, carbs100: 4.7, fat100: 3.2 }
const porridge = makeRecipeFood({
  id: 'porridge', name: 'Haferbrei',
  ingredients: [{ food: oats, grams: 80 }, { food: milk, grams: 200 }],
  yieldGrams: 280, servings: 2,
})
const plan = (id = 'p1', date = '2026-11-09') =>
  makePlannedMeal(porridge, 140, 'Frühstück', date, id)

describe('RED Fit original-openGym weekly nutrition planning', () => {
  it('keeps planned and eaten meals independent', () => {
    const p = plan()
    const eaten = makeMealEntry(oats, 80, 'Frühstück', '2026-11-09', 'e1')
    expect(p.status).toBe('planned')
    expect(p.kcal).toBeCloseTo(208, 10)
    expect(totalsOf([eaten]).kcal).toBe(296)
  })
  it('scales recipe shopping ingredients by serving yield, not cooked weight as raw food', () => {
    expect(plan().ingredients).toEqual([
      { foodName: 'Haferflocken', grams: 40 }, { foodName: 'Milch', grams: 100 },
    ])
  })
  it('supports ordinary foods in a plan', () => {
    expect(makePlannedMeal(oats, 80, 'Snack', '2026-11-09', 'p2').ingredients)
      .toEqual([{ foodName: 'Haferflocken', grams: 80 }])
  })
  it('groups shopping by ingredient and skips logged plans', () => {
    const pending = [plan(), makePlannedMeal(oats, 30, 'Snack', '2026-11-10', 'p2')]
    const completed = validatePlannedMeal({
      ...plan('p3'), status: 'done', loggedEntryId: 'e3',
    })
    const shopping = shoppingListOf([...pending, completed])
    expect(shopping).toEqual([
      { foodName: 'Haferflocken', grams: 70 }, { foodName: 'Milch', grams: 100 },
    ])
  })
  it('does not alter historical dates across month and year boundaries', () => {
    expect(planDates('2026-12-29')).toEqual([
      '2026-12-29','2026-12-30','2026-12-31',
      '2027-01-01','2027-01-02','2027-01-03','2027-01-04',
    ])
    expect(localDateKey(new Date(2026, 10, 9))).toBe('2026-11-09')
  })
  it('roundtrips a v2 nutrition snapshot including shopping ingredients', () => {
    const raw = { format: 'redfit-nutrition', version: 2,
      foods: [oats, porridge], entries: [], plans: [plan()] }
    expect(validateBackup(raw)).toEqual(raw)
  })
  it('accepts old v1 exports with no plan store and no mutation', () => {
    const v1 = { format: 'redfit-nutrition', version: 1, foods: [oats], entries: [] }
    expect(validateBackup(v1)).toEqual(v1)
  })
  it('rejects missing planning data in a v2 backup before mutation', () => {
    expect(() => validateBackup({ format: 'redfit-nutrition', version: 2, foods: [], entries: [] })).toThrow()
  })
  it('rejects corrupt planned ingredients before accepting a backup', () => {
    const raw = { format: 'redfit-nutrition', version: 2, foods: [], entries: [],
      plans: [{ ...plan(), ingredients: [{ foodName: 'Milch', grams: -1 }] }] }
    expect(() => validateBackup(raw)).toThrow()
  })
  it('does not accept a done plan without a matching identifier', () => {
    expect(() => validatePlannedMeal({ ...plan(), status: 'done' })).toThrow()
    expect(() => validatePlannedMeal({ ...plan(), loggedEntryId: 'e1' })).toThrow()
  })
  it('rejects invalid dates and excessive plan spans', () => {
    expect(() => planDates('2026-02-30')).toThrow()
    expect(() => planDates('2026-11-09', 32)).toThrow()
  })
  it('merges collisions idempotently without losing two independent plans', () => {
    const first = plan()
    const second = makePlannedMeal(oats, 100, 'Frühstück', '2026-11-09', 'p1')
    const merged = mergeRecords([first], [second], validatePlannedMeal)
    expect(merged).toHaveLength(2)
    expect(mergeRecords(merged, [second], validatePlannedMeal)).toEqual(merged)
  })
})

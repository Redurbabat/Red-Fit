import { describe, expect, it } from 'vitest'
import { makeMealEntry, makeRecipeFood, mergeRecords, validateBackup, validateFood } from './model.js'

const oats = { id: 'oats', name: 'Haferflocken', kcal100: 370, protein100: 13, carbs100: 60, fat100: 7 }
const milk = { id: 'milk', name: 'Milch', kcal100: 60, protein100: 3.5, carbs100: 4.7, fat100: 3.2 }
const recipe = overrides => makeRecipeFood({
  id: 'haferbrei', name: 'Haferbrei', ingredients: [{ food: oats, grams: 80 }, { food: milk, grams: 200 }],
  yieldGrams: 280, servings: 2, ...overrides,
})

describe('Original openGym nutrition: recipe composition using v1 foods and backups', () => {
  it('computes macros from actual ingredient amounts', () => {
    const r = recipe()
    expect(r.recipe.ingredients).toHaveLength(2)
    expect(r.kcal100).toBeCloseTo(416 / 280 * 100, 9)
    expect(r.protein100).toBeCloseTo(17.4 / 280 * 100, 9)
    expect(r.carbs100).toBeCloseTo(57.4 / 280 * 100, 9)
  })
  it('supports a different cooked yield while keeping absolute nutritional totals', () => {
    const r = recipe({ yieldGrams: 200 })
    expect(r.kcal100).toBeCloseTo(208, 10)
    expect(r.recipe.yieldGrams).toBe(200)
  })
  it('records a serving as a regular immutable meal entry', () => {
    const r = recipe()
    const entry = makeMealEntry(r, 140, 'Mittagessen', '2026-11-09', 'entry-1')
    expect(entry).toMatchObject({ foodName: 'Haferbrei', grams: 140, kcal: 208 })
  })
  it('preserves original legacy nutrition food and v1 backup formats', () => {
    expect(validateFood(oats)).toEqual(oats)
    const original = { format: 'redfit-nutrition', version: 1, foods: [oats], entries: [] }
    expect(validateBackup(original)).toEqual(original)
  })
  it('roundtrips complete recipe ingredient snapshots through existing JSON backup', () => {
    const r = recipe()
    expect(validateBackup({ format: 'redfit-nutrition', version: 1, foods: [r], entries: [] }).foods[0]).toEqual(r)
  })
  it('rejects tampered recipe nutrition values on import', () => {
    expect(() => validateFood({ ...recipe(), protein100: 999 })).toThrow(/Rezept-Nährwerte/)
  })
  it('rejects invalid ingredient quantities', () => {
    expect(() => recipe({ ingredients: [{ food: oats, grams: 0 }] })).toThrow()
    expect(() => recipe({ ingredients: [{ food: oats, grams: -1 }] })).toThrow()
  })
  it('rejects empty recipe ingredients', () => {
    expect(() => recipe({ ingredients: [] })).toThrow()
  })
  it('rejects invalid cooked yield and portions', () => {
    expect(() => recipe({ yieldGrams: 0 })).toThrow()
    expect(() => recipe({ servings: 1.5 })).toThrow()
  })
  it('keeps different recipes even when a backup reused the same record ID', () => {
    const original = recipe()
    const alternate = recipe({ ingredients: [{ food: milk, grams: 80 }] })
    const merged = mergeRecords([original], [alternate], validateFood)
    expect(merged).toHaveLength(2)
    expect(mergeRecords(merged, [alternate], validateFood)).toEqual(merged)
  })
})

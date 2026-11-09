import { describe, expect, it } from 'vitest'
import { localDateKey, makeMealEntry, mergeRecords, scaleFood, totalsOf, validateBackup, validateEntry, validateFood } from './model.js'

const food = { id: 'a', name: 'Reis trocken', kcal100: 370, protein100: 13, carbs100: 60, fat100: 2, barcode: '001234' }
const entry = (id, foodName = 'Reis trocken') => ({
  id, date: '2026-11-09', mealType: 'Mittagessen', foodName, grams: 80,
  kcal: 296, protein: 10.4, carbs: 48, fat: 1.6,
})
describe('Original-openGym nutrition extension', () => {
  it('uses 100 g as the single source of truth, without premature rounding', () => {
    expect(scaleFood(food, 80)).toEqual({ kcal: 296, protein: 10.4, carbs: 48, fat: 1.6 })
    expect(() => scaleFood(food, -10)).toThrow()
    expect(() => scaleFood(food, Infinity)).toThrow()
  })
  it('logs immutable per-meal snapshots when the food later changes', () => {
    const snap = makeMealEntry(food, 80, 'Mittagessen', '2026-11-09', 'meal-1')
    const renamed = { ...food, name: 'Reis neu', kcal100: 400 }
    expect(renamed.kcal100).toBe(400)
    expect(snap).toMatchObject({ foodName: 'Reis trocken', kcal: 296, protein: 10.4 })
    expect(totalsOf([snap, snap])).toMatchObject({ kcal: 592, carbs: 96 })
  })
  it('keeps barcode leading zeroes and rejects invalid 100-g macros', () => {
    expect(validateFood(food).barcode).toBe('001234')
    expect(() => validateFood({ ...food, protein100: -1 })).toThrow()
    expect(() => validateFood({ ...food, barcode: 123 })).toThrow()
  })
  it('uses local calendar dates across UTC boundary', () => {
    expect(localDateKey(new Date(2026, 10, 9, 0, 5))).toBe('2026-11-09')
    expect(() => validateEntry({ ...entry('bad'), date: '2026-02-30' })).toThrow()
  })
  it('rejects malformed or potentially hostile backups before mutation', () => {
    expect(() => validateBackup({ format: 'redfit-nutrition', version: 1, foods: [{ __proto__: {} }], entries: [] })).toThrow()
    expect(() => validateBackup({ format: 'redfit-nutrition', version: 2, foods: [], entries: [] })).toThrow()
    const parsed = JSON.parse('{"format":"redfit-nutrition","version":1,"foods":[],"entries":[],"__proto__":{"polluted":true}}')
    expect(validateBackup(parsed)).toEqual({ format: 'redfit-nutrition', version: 1, foods: [], entries: [] })
    expect({}.polluted).toBeUndefined()
  })
  it('merges entries idempotently and retains different snapshots despite identical IDs', () => {
    const different = entry('same', 'Brot')
    const first = mergeRecords([entry('same')], [different], validateEntry)
    expect(first).toHaveLength(2)
    expect(first.some(e => e.id.startsWith('restored:') && e.foodName === 'Brot')).toBe(true)
    expect(mergeRecords(first, [different], validateEntry)).toEqual(first)
    expect(mergeRecords(first, [entry('same')], validateEntry)).toEqual(first)
  })
  it('does not rewrite or mutate existing records while merging', () => {
    const old = entry('same')
    const result = mergeRecords([old], [entry('same', 'Nudeln')], validateEntry)
    expect(old.id).toBe('same')
    expect(result[0]).toEqual(old)
  })
})

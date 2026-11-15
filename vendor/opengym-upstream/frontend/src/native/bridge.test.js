// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { useStore, freshState } from '../store/useStore.js'
import { executeNativeCommand, nativeSnapshot } from './bridge.js'

beforeAll(() => { useStore.setState({ ready: true, S: freshState(), localProfile: null, user: null, sync: { server: null } }) })
describe('native views use the original domain', () => {
  it('searches original catalogue records and muscle metadata', async () => {
    const result = await executeNativeCommand('search', { query: 'bench press' })
    expect(result.count).toBeGreaterThan(0)
    expect(result.items[0]).toMatchObject({ id: expect.any(String), muscles: expect.any(Object) })
  })
  it('writes food, a frozen meal, and reads 80g = 296kcal from the real nutrition repository', async () => {
    const id = crypto.randomUUID()
    await executeNativeCommand('food', { food: { id, name: 'Hafer', kcal100: 370, protein100: 13, carbs100: 60, fat100: 7 } })
    await executeNativeCommand('meal', { id: crypto.randomUUID(), foodId: id, grams: 80, mealType: 'Frühstück', date: '2026-11-15' })
    expect(nativeSnapshot().nutrition.entries.at(-1)).toMatchObject({ kcal: 296, protein: 10.4, carbs: 48, fat: 5.6 })
  })
  it('uses cooked/raw factor without changing the food basis', async () => {
    const food = nativeSnapshot().nutrition.foods[0]
    await executeNativeCommand('meal', { id: crypto.randomUUID(), foodId: food.id, grams: 240, yieldFactor: 3, mealType: 'Mittagessen', date: '2026-11-15' })
    expect(nativeSnapshot().nutrition.entries.at(-1)).toMatchObject({ grams: 80, kcal: 296, weighedAs: 'cooked', weighedAmountG: 240, cookingYieldFactor: 3 })
  })
  it('exports and previews both data domains without importing or clearing anything', async () => {
    const before = nativeSnapshot().nutrition.entries.length
    const exported = await executeNativeCommand('export', {})
    const checked = await executeNativeCommand('previewImport', { text: exported.text })
    expect(checked.meals).toBe(before)
    expect(nativeSnapshot().nutrition.entries).toHaveLength(before)
    expect(JSON.parse(exported.text).format).toBe('redfit-ios')
  })
  it('rejects unknown actions, stale workouts, unsafe imports and remote navigation', async () => {
    await expect(executeNativeCommand('resetAll', {})).rejects.toThrow()
    await expect(executeNativeCommand('finish', { workoutId: 'old' })).rejects.toThrow('geändert')
    await expect(executeNativeCommand('previewImport', { text: '{"__proto__":{}}' })).rejects.toThrow('Unsichere')
    await expect(executeNativeCommand('route', { path: 'https://example.com' })).rejects.toThrow('App-Ziel')
  })
  it('creates plans with the existing default exercise configuration', async () => {
    const ex = (await executeNativeCommand('search', { query: 'bench press' })).items[0]
    const result = await executeNativeCommand('routine', { name: 'Testplan', exerciseIds: [ex.id] })
    const original = useStore.getState().S.routines.find(r => r.id === result.id)
    expect(original.ex[0]).toMatchObject({ id: ex.id, sets: expect.any(Number) })
    expect(nativeSnapshot().routines.find(r => r.id === result.id).exercises[0].name).toBeTruthy()
  })
  it('preserves distinct prescriptions for repeated exercise IDs when native rows reorder', async () => {
    const id = (await executeNativeCommand('search', { query: 'bench press' })).items[0].id
    useStore.getState().update(S => { S.routines.push({ id: 'duplicates', name: 'Doppelt', ex: [{ id, sets: 3, reps: 5, sg: 'a' }, { id, sets: 2, reps: 12, restSec: 45 }] }) })
    await executeNativeCommand('routine', { id: 'duplicates', name: 'Umgeordnet', exerciseSlots: [{ id, sourceIndex: 1 }, { id, sourceIndex: 0 }] })
    expect(useStore.getState().S.routines.find(r => r.id === 'duplicates').ex).toMatchObject([{ sets: 2, reps: 12, restSec: 45 }, { sets: 3, reps: 5, sg: 'a' }])
  })
})

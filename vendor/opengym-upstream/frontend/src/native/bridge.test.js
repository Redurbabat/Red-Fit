// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { useStore, freshState } from '../store/useStore.js'
import { executeNativeCommand, nativeSnapshot, homeSummary, latestPhotoOf, installNativeBridge } from './bridge.js'

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
    // Entries are ordered by their random IDs, so read this one back by ID, not by position.
    const id = crypto.randomUUID()
    await executeNativeCommand('meal', { id, foodId: food.id, grams: 240, yieldFactor: 3, mealType: 'Mittagessen', date: '2026-11-15' })
    expect(nativeSnapshot().nutrition.entries.find(e => e.id === id)).toMatchObject({ grams: 80, kcal: 296, weighedAs: 'cooked', weighedAmountG: 240, cookingYieldFactor: 3 })
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
  it('takes week, streak and next workout from the widget snapshot for Home', () => {
    const empty = homeSummary(freshState(), '2026-11-18')
    expect(empty).toMatchObject({ exercises: [], latestPhoto: null, widget: { weekFrom: '2026-11-16', streak: 0 } })
    const S = { ...freshState(), routines: [{ id: 'r1', name: 'Push', ex: [{ id: 'bench', sets: 4, reps: 8 }] }],
      week: { 3: ['r1'] }, workouts: [{ id: 'w1', d: '2026-11-10', entries: [] }, { id: 'w2', d: '2026-11-17', entries: [] }] }
    const home = homeSummary(S, '2026-11-18')
    expect(home.widget.streak).toBe(2)
    expect(home.widget.next).toMatchObject({ today: true, ids: ['r1'] })
    expect(home.exercises).toEqual([expect.objectContaining({ id: 'bench' })])
    expect(home.plan).toMatchObject({ ids: ['r1'], planned: true, today: true })
    const unscheduled = homeSummary({ ...S, week: {} }, '2026-11-18')
    expect(unscheduled.plan).toMatchObject({ ids: ['r1'], planned: false, name: 'Push' })
    expect(unscheduled.exercises[0]).toMatchObject({ id: 'bench', line: '4 × 8' })
    expect(nativeSnapshot().home).toMatchObject({ widget: expect.any(Object), exercises: expect.any(Array) })
  })
  it('picks the newest image as progress photo and ignores videos', () => {
    const ref = (hash, kind = 'image') => ({ kind, hash, mime: kind === 'image' ? 'image/jpeg' : 'video/mp4', size: 10, width: 10, height: 10 })
    const a = 'a'.repeat(64), b = 'b'.repeat(64), c = 'c'.repeat(64)
    const S = { ...freshState(), dayPhotos: { [a]: { d: '2026-11-01', m: ref(a), _ts: 1 } },
      workouts: [{ id: 'w', d: '2026-11-12', media: [ref(b)] }, { id: 'v', d: '2026-11-14', media: [ref(c, 'video')] }] }
    expect(latestPhotoOf(S)).toEqual({ d: '2026-11-12', hash: b })
  })
  it('allows the progress photo route but rejects photo reads for unknown files', async () => {
    await expect(executeNativeCommand('route', { path: '/progress-photos' })).resolves.toBeTruthy()
    await expect(executeNativeCommand('photoThumb', { hash: 'f'.repeat(64) })).rejects.toThrow('Foto')
  })
  it('marks the document as SwiftUI-hosted only when the native shell is present', () => {
    delete document.documentElement.dataset.redfitSwiftui
    installNativeBridge()
    expect(document.documentElement.dataset.redfitSwiftui).toBeUndefined()
    window.__REDFitSwiftUI = true
    window.webkit = { messageHandlers: { redFitApp: { postMessage: () => {} } } }
    try {
      installNativeBridge()
      expect(document.documentElement.dataset.redfitSwiftui).toBe('true')
    } finally { delete window.__REDFitSwiftUI; delete window.webkit; delete window.redFitNative }
  })
})

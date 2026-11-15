import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { changeExtras, loadExtras, validateExtras } from './extras.js'

const newScope = () => 'test-' + crypto.randomUUID()
describe('additive nutrition extras', () => {
  it('persists water exactly once for the same record ID', async () => {
    const scope = newScope(), payload = { id: 'water1', date: '2026-11-15', ml: 250 }
    await changeExtras(scope, 'water', payload); await changeExtras(scope, 'water', payload)
    expect((await loadExtras(scope)).water).toEqual([payload])
  })
  it('keeps account scopes isolated', async () => {
    const scope = newScope()
    await changeExtras(scope, 'water', { id: 'w', date: '2026-11-15', ml: 300 })
    expect((await loadExtras(newScope())).water).toEqual([])
  })
  it('rejects invalid values without changing the existing copy', async () => {
    const scope = newScope()
    await changeExtras(scope, 'water', { id: 'w', date: '2026-11-15', ml: 300 })
    await expect(changeExtras(scope, 'water', { id: 'bad', date: '2026-02-30', ml: -1 })).rejects.toThrow()
    expect((await loadExtras(scope)).water).toHaveLength(1)
  })
  it('merges conflicting backup IDs without dropping either record; reimport is idempotent', async () => {
    const scope = newScope()
    await changeExtras(scope, 'water', { id: 'w', date: '2026-11-15', ml: 300 })
    const backup = { version: 1, water: [{ id: 'w', date: '2026-11-15', ml: 500 }], goals: [], shopping: [] }
    await changeExtras(scope, 'import', backup); await changeExtras(scope, 'import', backup)
    expect((await loadExtras(scope)).water.map(x => x.ml).sort()).toEqual([300, 500])
  })
  it('keeps historical goals when saving a later target', async () => {
    const scope = newScope(), goals = { kcal: 2000, protein: 100, carbs: 200, fat: 70, water: 2000 }
    await changeExtras(scope, 'goals', { ...goals, id: 'a', date: '2026-11-14' })
    await changeExtras(scope, 'goals', { ...goals, id: 'b', date: '2026-11-15', kcal: 2100 })
    expect((await loadExtras(scope)).goals).toHaveLength(2)
  })
  it('persists shopping checks and rejects unsupported backup versions', async () => {
    const scope = newScope()
    await changeExtras(scope, 'shopping', { id: 'reis', date: '2026-11-15', checked: true })
    expect((await loadExtras(scope)).shopping[0].checked).toBe(true)
    expect(() => validateExtras({ version: 99 })).toThrow()
  })
})

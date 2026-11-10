import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeMealEntry, makePlannedMeal } from './model.js'
import {
  completePlannedMeal, exportNutrition, importNutrition, loadNutrition,
  removePlannedMeal, saveMealEntry, savePlannedMeal,
} from './repository.js'

// Deliberately small IndexedDB transaction double, requiring no new npm dependencies.
// Clones stores per transaction; only oncomplete commits, onabort discards all writes.
function mockIndexedDB() {
  const dbs = new Map()
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
  function database(version = 0) {
    const stores = new Map()
    const db = {
      version, stores,
      objectStoreNames: { contains: name => stores.has(name) },
      createObjectStore(name) {
        if (stores.has(name)) throw new Error('ObjectStore already exists')
        stores.set(name, new Map())
        return { createIndex() {} }
      },
      close() {},
      transaction(names, mode) {
        const working = new Map(names.map(name => {
          if (!stores.has(name)) throw new Error('Missing store: ' + name)
          return [name, new Map([...stores.get(name)].map(([key, value]) => [key, clone(value)]))]
        }))
        const tx = { pending: 0, aborted: false, settled: false, error: null,
          oncomplete: null, onabort: null, onerror: null }
        const abort = error => {
          if (tx.aborted || tx.settled) return
          tx.aborted = true
          tx.error = error || new Error('aborted')
          queueMicrotask(() => tx.onabort?.())
        }
        tx.abort = () => abort(new Error('aborted'))
        const request = run => {
          const req = { readyState: 'pending', result: undefined, onsuccess: null, onerror: null }
          tx.pending += 1
          queueMicrotask(() => {
            if (!tx.aborted) {
              try { req.result = run(); req.readyState = 'done'; req.onsuccess?.() }
              catch (error) { abort(error); req.onerror?.() }
            }
            tx.pending -= 1
            if (!tx.pending && !tx.aborted) queueMicrotask(() => {
              if (tx.pending || tx.aborted || tx.settled) return
              tx.settled = true
              if (mode === 'readwrite') for (const [name, rows] of working) stores.set(name, rows)
              tx.oncomplete?.()
            })
          })
          return req
        }
        tx.objectStore = name => {
          const rows = working.get(name)
          if (!rows) throw new Error('Missing store in transaction: ' + name)
          return {
            getAll: () => request(() => [...rows.values()].map(clone)),
            get: id => request(() => clone(rows.get(id))),
            add: value => request(() => {
              if (rows.has(value.id)) throw new Error('ConstraintError')
              rows.set(value.id, clone(value))
            }),
            put: value => request(() => rows.set(value.id, clone(value))),
            delete: id => request(() => rows.delete(id)),
          }
        }
        return tx
      },
    }
    return db
  }
  return {
    dbs,
    seedV1(scope, foods, entries) {
      const db = database(1)
      db.createObjectStore('foods')
      db.createObjectStore('entries')
      for (const food of foods) db.stores.get('foods').set(food.id, food)
      for (const entry of entries) db.stores.get('entries').set(entry.id, entry)
      dbs.set('redfit-nutrition-v1:' + scope, db)
    },
    open(name, version) {
      const req = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null }
      queueMicrotask(() => {
        try {
          const db = dbs.get(name) || database()
          if (version < db.version) throw new Error('VersionError')
          req.result = db
          if (version > db.version) { req.onupgradeneeded?.(); db.version = version }
          dbs.set(name, db)
          req.onsuccess?.()
        } catch (error) { req.error = error; req.onerror?.() }
      })
      return req
    },
  }
}

const food = { id: 'oats', name: 'Haferflocken', kcal100: 370, protein100: 13, carbs100: 60, fat100: 7 }
const eaten = makeMealEntry(food, 100, 'Frühstück', '2026-11-09', 'eaten-0')
const planned = makePlannedMeal(food, 90, 'Mittagessen', '2026-11-10', 'plan-1')
let idb

beforeEach(() => { idb = mockIndexedDB(); vi.stubGlobal('indexedDB', idb) })
afterEach(() => { vi.unstubAllGlobals() })

describe('RED Fit nutrition v1 → v2 IDB migration and transaction safety', () => {
  it('adds a plans object store without deleting older foods or logged meals', async () => {
    idb.seedV1('local', [food], [eaten])
    const data = await loadNutrition('local')
    expect(data).toEqual({ foods: [food], entries: [eaten], plans: [] })
    expect(idb.dbs.get('redfit-nutrition-v1:local').version).toBe(2)
  })
  it('stores planning separately and never adds planned macros to eaten entries', async () => {
    await savePlannedMeal('local', planned)
    expect(await loadNutrition('local')).toEqual({ foods: [], entries: [], plans: [planned] })
  })
  it('logs and completes a planned meal in a single atomic transaction', async () => {
    await savePlannedMeal('local', planned)
    const logged = await completePlannedMeal('local', 'plan-1', 'eaten-1')
    expect(logged).toMatchObject({ id: 'eaten-1', kcal: 333 })
    const data = await loadNutrition('local')
    expect(data.entries).toEqual([logged])
    expect(data.plans[0]).toMatchObject({ status: 'done', loggedEntryId: 'eaten-1' })
  })
  it('rejects second completion without double-counting calories', async () => {
    await savePlannedMeal('local', planned)
    await completePlannedMeal('local', 'plan-1', 'eaten-1')
    await expect(completePlannedMeal('local', 'plan-1', 'eaten-2')).rejects.toThrow()
    expect((await loadNutrition('local')).entries).toHaveLength(1)
  })
  it('exports v2 and imports an older v1 backup without clearing its plans', async () => {
    await savePlannedMeal('local', planned)
    await importNutrition('local', { format: 'redfit-nutrition', version: 1, foods: [food], entries: [eaten] })
    const data = JSON.parse(await exportNutrition('local'))
    expect(data.version).toBe(2)
    expect(data).toMatchObject({ foods: [food], entries: [eaten], plans: [planned] })
  })
  it('restores the same v2 backup idempotently', async () => {
    await savePlannedMeal('local', planned)
    const backup = JSON.parse(await exportNutrition('local'))
    expect(await importNutrition('local', backup)).toEqual({ foods: 0, entries: 0, plans: 0 })
    expect(await importNutrition('local', backup)).toEqual({ foods: 0, entries: 0, plans: 0 })
  })
  it('rejects a malicious plan backup without mutating the existing database', async () => {
    await savePlannedMeal('local', planned)
    const corrupt = { format: 'redfit-nutrition', version: 2, foods: [], entries: [],
      plans: [{ ...planned, ingredients: [{ foodName: 'Haferflocken', grams: -3 }] }] }
    await expect(importNutrition('local', corrupt)).rejects.toThrow()
    expect((await loadNutrition('local')).plans).toEqual([planned])
  })
  it('isolates one RED Fit account from another in IndexedDB', async () => {
    await savePlannedMeal('local', planned)
    expect((await loadNutrition('account:example:42')).plans).toEqual([])
  })
  it('rejects a duplicate meal ID without overwriting the old meal', async () => {
    await saveMealEntry('local', eaten)
    await expect(saveMealEntry('local', eaten)).rejects.toThrow()
    expect((await loadNutrition('local')).entries).toEqual([eaten])
  })
  it('removes a pending plan without deleting logged meals', async () => {
    await saveMealEntry('local', eaten)
    await savePlannedMeal('local', planned)
    await removePlannedMeal('local', 'plan-1')
    expect(await loadNutrition('local')).toMatchObject({ entries: [eaten], plans: [] })
  })
})

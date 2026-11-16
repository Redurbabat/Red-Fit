import { describe, expect, it } from 'vitest'
import { createCommandQueue, safeJSON, finiteNumber } from './protocol.js'

const command = (id, action = 'save') => ({ v: 1, id, action, payload: {} })
describe('native command boundary', () => {
  it('serializes writes and keeps running after a failed write', async () => {
    const order = []
    const request = createCommandQueue(async action => { order.push(action); await Promise.resolve(); if (action === 'fail') throw new Error('disk'); order.push(action + '-done'); return action })
    const calls = [request(command('1', 'first')), request(command('2', 'fail')), request(command('3', 'last'))]
    expect((await Promise.allSettled(calls)).map(x => x.status)).toEqual(['fulfilled', 'rejected', 'fulfilled'])
    expect(order).toEqual(['first', 'first-done', 'fail', 'last', 'last-done'])
  })
  it('does not execute an in-flight duplicate twice', async () => {
    let calls = 0
    const request = createCommandQueue(async () => ++calls)
    expect(await Promise.all([request(command('same')), request(command('same'))])).toEqual([1, 1])
    expect(calls).toBe(1)
  })
  it('rejects reused request IDs with changed content', async () => {
    const request = createCommandQueue(async () => true)
    await request(command('same'))
    await expect(request(command('same', 'delete'))).rejects.toThrow('bereits')
  })
  it('rejects incompatible or malformed envelopes before execution', async () => {
    const request = createCommandQueue(() => { throw new Error('must not run') })
    for (const value of [null, {}, { ...command('a'), v: 2 }, command('../secret')]) await expect(request(value)).rejects.toThrow('Ungültige')
  })
  it('rejects prototype-polluting backup keys at every nesting level', () => {
    for (const value of ['{"__proto__":{}}', '{"nested":{"constructor":{}}}', '[{"prototype":{}}]']) expect(() => safeJSON(value)).toThrow('Unsichere')
    expect(safeJSON('{"workouts":[]}')).toEqual({ workouts: [] })
  })
  it('rejects nonfinite and out-of-range numeric inputs', () => {
    for (const value of [NaN, Infinity, -1, 2001, '20']) expect(() => finiteNumber(value, 0, 2000)).toThrow()
    expect(finiteNumber(0, 0, 2000)).toBe(0)
  })
})

import { webcrypto } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { backupNameForScope, writeNutritionDocumentBackup } from './native-backup.js'

const food = { id: 'food-1', name: 'Haferflocken', kcal100: 370, protein100: 13, carbs100: 60, fat100: 7 }
const entry = { id: 'meal-1', date: '2026-11-09', mealType: 'Frühstück', foodName: 'Haferflocken', grams: 80,
  kcal: 296, protein: 10.4, carbs: 48, fat: 5.6 }
const data = { format: 'redfit-nutrition', version: 1, foods: [food], entries: [entry] }
const docFS = () => {
  const writeFile = vi.fn(async () => ({}))
  return { Filesystem: { writeFile }, Directory: { Documents: 'DOCUMENTS' }, Encoding: { UTF8: 'utf8' } }
}
describe('Nutrition native Documents backup (original openGym app)', () => {
  it('never exposes the server URL or account identifier in file paths', async () => {
    const scope = 'account:' + encodeURIComponent('https://gym.example/app') + ':alice@example.com'
    const path = await backupNameForScope(scope, '2026-11-09', webcrypto)
    expect(path).toMatch(/^RED-Fit\/Ernaehrung\/[a-f0-9]{64}\/redfit-nutrition-2026-11-09\.json$/)
    expect(path).not.toContain('gym.example')
    expect(path).not.toContain('alice@example.com')
    expect(await backupNameForScope(scope, '2026-11-09', webcrypto)).toBe(path)
  })
  it('isolates same user ID on different self-hosted servers', async () => {
    const a = await backupNameForScope('account:one.example:1', '2026-11-09', webcrypto)
    const b = await backupNameForScope('account:two.example:1', '2026-11-09', webcrypto)
    expect(a).not.toBe(b)
  })
  it('keeps previous days instead of overwriting them', async () => {
    const before = await backupNameForScope('local', '2026-11-09', webcrypto)
    const after = await backupNameForScope('local', '2026-11-10', webcrypto)
    expect(before).not.toBe(after)
  })
  it('rejects unsafe path parameters', async () => {
    await expect(backupNameForScope('', '2026-11-09', webcrypto)).rejects.toThrow()
    await expect(backupNameForScope('local', '../../2026-11-09', webcrypto)).rejects.toThrow()
    await expect(backupNameForScope('x'.repeat(301), '2026-11-09', webcrypto)).rejects.toThrow()
  })
  it('writes a validated snapshot only to the native Documents directory', async () => {
    const filesystem = docFS()
    const result = await writeNutritionDocumentBackup('local', JSON.stringify(data),
      { filesystem, cryptoAPI: webcrypto, day: '2026-11-09' })
    expect(result).toMatchObject({ foods: 1, entries: 1 })
    expect(filesystem.Filesystem.writeFile).toHaveBeenCalledTimes(1)
    const written = filesystem.Filesystem.writeFile.mock.calls[0][0]
    expect(written).toMatchObject({ directory: 'DOCUMENTS', encoding: 'utf8', recursive: true })
    expect(JSON.parse(written.data)).toEqual(data)
  })
  it('refuses malformed JSON without touching any document', async () => {
    const filesystem = docFS()
    await expect(writeNutritionDocumentBackup('local', '{', { filesystem, cryptoAPI: webcrypto })).rejects.toThrow()
    expect(filesystem.Filesystem.writeFile).not.toHaveBeenCalled()
  })
  it('rejects an invalid nutrition schema before opening a native file', async () => {
    const filesystem = docFS()
    await expect(writeNutritionDocumentBackup('local',
      JSON.stringify({ ...data, foods: [{ ...food, protein100: -1 }] }),
      { filesystem, cryptoAPI: webcrypto })).rejects.toThrow()
    expect(filesystem.Filesystem.writeFile).not.toHaveBeenCalled()
  })
  it('propagates a file-write failure to the UI', async () => {
    const filesystem = docFS()
    filesystem.Filesystem.writeFile.mockRejectedValue(new Error('disk full'))
    await expect(writeNutritionDocumentBackup('local', JSON.stringify(data),
      { filesystem, cryptoAPI: webcrypto })).rejects.toThrow('disk full')
  })
  it('rejects missing crypto support', async () => {
    await expect(backupNameForScope('local', '2026-11-09', {})).rejects.toThrow()
  })
  it('rejects a native bridge with no filesystem writer', async () => {
    const filesystem = { Directory: { Documents: 'DOCUMENTS' }, Encoding: { UTF8: 'utf8' } }
    await expect(writeNutritionDocumentBackup('local', JSON.stringify(data),
      { filesystem, cryptoAPI: webcrypto })).rejects.toThrow('Dateisystem')
  })
})

// An additional native Documents backup for nutrition. It is intentionally separate from
// the original openGym backup/sync until a tested cross-domain migration exists.
// A dated, account-scoped copy is written after successful IndexedDB commits.
// Users must still copy it out of the app folder before uninstalling.
import { localDateKey, validateBackup } from './model.js'

export async function backupNameForScope(scope, day = localDateKey(), cryptoAPI = globalThis.crypto) {
  if (typeof scope !== 'string' || !scope || scope.length > 300) throw new Error('Ungültiger Ernährungsspeicher.')
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Ungültiger Backup-Tag.')
  if (typeof cryptoAPI?.subtle?.digest !== 'function') throw new Error('Sicherer Backup-Namensraum nicht verfügbar.')
  const hash = await cryptoAPI.subtle.digest('SHA-256', new TextEncoder().encode(scope))
  const id = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  return 'RED-Fit/Ernaehrung/' + id + '/redfit-nutrition-' + day + '.json'
}

export async function writeNutritionDocumentBackup(scope, json, { filesystem, cryptoAPI = globalThis.crypto, day = localDateKey() } = {}) {
  // Read/validate before opening a native file handle. Never write a truncated or invalid backup.
  const data = validateBackup(JSON.parse(json))
  const path = await backupNameForScope(scope, day, cryptoAPI)
  const fs = filesystem || await import('@capacitor/filesystem')
  if (!fs.Filesystem?.writeFile || !fs.Directory?.Documents || !fs.Encoding?.UTF8)
    throw new Error('Das iPhone-Dateisystem ist nicht verfügbar.')
  await fs.Filesystem.writeFile({
    path, directory: fs.Directory.Documents, data: JSON.stringify(data),
    encoding: fs.Encoding.UTF8, recursive: true,
  })
  return { path, foods: data.foods.length, entries: data.entries.length }
}

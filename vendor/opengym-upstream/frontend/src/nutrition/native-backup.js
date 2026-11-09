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


const NUTRITION_BACKUP_NAME = /^redfit-nutrition-(\d{4}-\d{2}-\d{2})\.json$/
const MAX_RESTORE_BYTES = 64 * 1024 * 1024

function isCalendarDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const value = new Date(date + 'T12:00:00Z')
  return !Number.isNaN(value.valueOf()) && value.toISOString().slice(0, 10) === date
}

// Local recovery is additive, not a replacement for externally exporting a backup.
// Never scan other users' folders: the path is derived exclusively from this account scope.
// A corrupt newest snapshot does not prevent recovering the previous valid day's copy.
export async function readLatestNutritionDocumentBackup(scope, { filesystem, cryptoAPI = globalThis.crypto } = {}) {
  const name = await backupNameForScope(scope, '2000-01-01', cryptoAPI)
  const folder = name.slice(0, name.lastIndexOf('/'))
  const fs = filesystem || await import('@capacitor/filesystem')
  if (!fs.Filesystem?.readdir || !fs.Filesystem?.readFile || !fs.Directory?.Documents || !fs.Encoding?.UTF8)
    throw new Error('Das iPhone-Dateisystem kann keine Sicherungen lesen.')

  let directory
  try {
    directory = await fs.Filesystem.readdir({ path: folder, directory: fs.Directory.Documents })
  } catch {
    throw new Error('Keine Gerätesicherung für dieses Konto gefunden.')
  }
  const names = (Array.isArray(directory.files) ? directory.files : [])
    .filter(file => typeof file === 'string' || (file && file.type !== 'directory'))
    .map(file => typeof file === 'string' ? file : file?.name)
    .filter(file => {
      const match = typeof file === 'string' && file.match(NUTRITION_BACKUP_NAME)
      return !!match && isCalendarDate(match[1])
    })
    .sort().reverse()

  for (const filename of names) {
    try {
      const path = folder + '/' + filename
      const read = await fs.Filesystem.readFile({
        path, directory: fs.Directory.Documents, encoding: fs.Encoding.UTF8,
      })
      if (typeof read?.data !== 'string' || read.data.length > MAX_RESTORE_BYTES)
        continue
      const backup = validateBackup(JSON.parse(read.data))
      return { path, day: filename.slice('redfit-nutrition-'.length, -'.json'.length), backup }
    } catch {
      // A partial or corrupt newest file must not hide an older healthy copy.
    }
  }
  throw new Error(names.length
    ? 'Alle gefundenen Gerätesicherungen sind beschädigt oder nicht lesbar.'
    : 'Keine Gerätesicherung für dieses Konto gefunden.')
}

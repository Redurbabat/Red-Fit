// A server-scoped namespace prevents two independent openGym installations from sharing
// nutrition entries just because their account tables both contain user ID "1".
// Do not store tokens or personal credentials in the database name.
export function nutritionScope({ userId, server, origin }) {
  if (userId == null) return 'local'
  const id = String(userId).trim()
  if (!id) throw new Error('Ungültige Konto-ID für den Ernährungsspeicher.')
  const raw = (typeof server === 'string' && server.trim()) || origin || ''
  let base
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      throw new Error('invalid server URL')
    base = url.origin + url.pathname.replace(/\/+$/, '')
  } catch {
    // A native app with a lost pairing must not silently read a different server's records.
    // Distinct from local guest data; cannot be synced until pairing is restored.
    base = 'unpaired'
  }
  return 'account:' + encodeURIComponent(base) + ':' + encodeURIComponent(id)
}

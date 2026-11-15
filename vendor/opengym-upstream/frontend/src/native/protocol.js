// A local, versioned command boundary. Never evaluate caller-supplied JavaScript.
export const PROTOCOL_VERSION = 1
export function createCommandQueue(execute, { limit = 256 } = {}) {
  let tail = Promise.resolve()
  const requests = new Map()
  return command => {
    if (!command || command.v !== PROTOCOL_VERSION || typeof command.id !== 'string' ||
        !/^[a-zA-Z0-9-]{1,100}$/.test(command.id) || typeof command.action !== 'string')
      return Promise.reject(new Error('Ungültige native Anfrage.'))
    const signature = JSON.stringify(command)
    if (requests.has(command.id)) {
      const prior = requests.get(command.id)
      return prior.signature === signature ? prior.promise : Promise.reject(new Error('Anfrage-ID wurde bereits verwendet.'))
    }
    const promise = tail.then(() => execute(command.action, command.payload || {}))
    tail = promise.catch(() => {})
    requests.set(command.id, { signature, promise })
    promise.finally(() => {
      if (requests.size > limit) requests.delete(requests.keys().next().value)
    }).catch(() => {})
    return promise
  }
}

export function finiteNumber(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error('Bitte einen gültigen Wert eingeben.')
  return value
}
export function safeJSON(text) {
  if (typeof text !== 'string' || text.length > 64 * 1024 * 1024) throw new Error('Die Sicherung ist zu gross.')
  return JSON.parse(text, (key, value) => {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Unsichere Sicherungsdatei.')
    return value
  })
}

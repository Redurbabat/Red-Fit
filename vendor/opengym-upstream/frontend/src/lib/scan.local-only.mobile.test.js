import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  vi.stubEnv('VITE_MOBILE', '1')
  return { platform: 'ios', nativeLoaded: vi.fn(), decode: vi.fn() }
})
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => h.platform } }))
vi.mock('@capacitor-mlkit/barcode-scanning', () => {
  h.nativeLoaded()
  throw new Error('ML Kit must never load under the local-only policy')
})
vi.mock('./scan-web.js', () => ({ importCodeFromImageWeb: (...args) => h.decode(...args) }))

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); h.platform = 'ios' })

describe('local-only mobile code scanning', () => {
  it.each(['ios', 'android'])('uses the local camera/photo path on %s without loading ML Kit', async platform => {
    h.platform = platform
    const { requireLocalOnly } = await import('./local-only.js')
    requireLocalOnly()
    const { nativeScanner } = await import('./channel.js')
    const { webScanner, scanCode, importCodeFromImage } = await import('./scan.js')
    expect(await nativeScanner()).toBe(false)
    expect(await webScanner()).toBe(true)
    await expect(scanCode()).rejects.toMatchObject({ code: 'local-only' })
    const image = new File(['synthetic'], 'gym-code.png', { type: 'image/png' })
    const code = { value: '1234567890128', fmt: 'ean13' }
    h.decode.mockResolvedValue(code)
    expect(await importCodeFromImage(image)).toEqual(code)
    expect(h.decode).toHaveBeenCalledWith(image)
    expect(h.nativeLoaded).not.toHaveBeenCalled()
  })

  it('keeps the native iOS dependency allowlist free of ML Kit and its telemetry', async () => {
    const { readFileSync } = await import('node:fs')
    const config = JSON.parse(readFileSync(new URL('../../capacitor.config.json', import.meta.url), 'utf8'))
    expect(config.ios.includePlugins).toContain('@aparajita/capacitor-secure-storage')
    expect(config.ios.includePlugins).toContain('@capacitor/filesystem')
    expect(config.ios.includePlugins).not.toContain('@capacitor-mlkit/barcode-scanning')
    const pods = readFileSync(new URL('../../ios/App/Podfile', import.meta.url), 'utf8')
    expect(pods).not.toMatch(/MLKit|GoogleDataTransport|GoogleUtilities/)
  })
})

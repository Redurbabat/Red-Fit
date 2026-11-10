// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { installLocalOnlyPolicy, isLocalOnly, localResourceAllowed, requireLocalOnly } from './local-only.js'
import { localOnlyBuild, LOCAL_ONLY_CSP } from '../../scripts/local-only-build.mjs'

const base = 'capacitor://localhost/index.html'

describe('RED Fit local-only transport', () => {
  it.each([
    ['assets/app.js', true], ['exercise-media/clip/0001.mp4', true],
    ['capacitor://localhost/_capacitor_file_/private/photo.webp', true],
    ['opengym-pack://anim-480-male/0001.webp', true], ['data:image/png;base64,AA==', true],
    ['https://api.provider.example/v1/chat', false], ['//stats.example/pixel', false],
    ['http://localhost/api/data', false], ['/api/data', false], ['/nested/api/config', false],
    ['/%61pi/data', false], ['/api%2Fdata', false], ['javascript:alert(1)', false],
  ])('classifies %s before any request', (url, allowed) => {
    expect(localResourceAllowed(url, {}, base)).toBe(allowed)
  })

  it('refuses uploads, same-origin APIs and lookalike hosts', () => {
    const web = 'https://redfit.example/app/'
    expect(localResourceAllowed('assets/main.js', { method: 'POST' }, web)).toBe(false)
    expect(localResourceAllowed('https://redfit.example.evil/app/main.js', {}, web)).toBe(false)
    expect(localResourceAllowed('https://user:secret@redfit.example/main.js', {}, web)).toBe(false)
    expect(localResourceAllowed(new Request('https://redfit.example/api/data'), {}, web)).toBe(false)
  })

  it('does not invoke fetch, XHR, sockets, beacons or external navigation for forbidden requests', async () => {
    const fetch = vi.fn(async () => ({ ok: true }))
    const open = vi.fn(), xhrOpen = vi.fn(), beacon = vi.fn()
    const win = {
      fetch, open, navigator: { sendBeacon: beacon },
      XMLHttpRequest: class { open(...args) { xhrOpen(...args) } },
      WebSocket: class {}, EventSource: class {},
    }
    installLocalOnlyPolicy(win)
    expect(isLocalOnly()).toBe(true)
    await expect(win.fetch('https://stats.example/event', { method: 'POST', body: 'private' })).rejects.toMatchObject({ code: 'local-only' })
    expect(() => new win.XMLHttpRequest().open('POST', 'https://server.example/api/data')).toThrow()
    expect(() => new win.WebSocket('wss://server.example')).toThrow()
    expect(() => new win.EventSource('https://server.example')).toThrow()
    expect(win.navigator.sendBeacon('https://stats.example', 'private')).toBe(false)
    expect(win.open('https://opengym.ch/r#private')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(xhrOpen).not.toHaveBeenCalled()
    expect(beacon).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it('refuses native HTTP before Capacitor can transmit', async () => {
    requireLocalOnly()
    const request = vi.fn()
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true }, CapacitorHttp: { request } }))
    const { nativeFetch } = await import('./capacitor-fetch.js')
    await expect(nativeFetch('https://provider.example/v1/chat', { method: 'POST', body: 'private' })).rejects.toMatchObject({ code: 'local-only' })
    expect(request).not.toHaveBeenCalled()
  })

  it('refuses old server credentials and explicit server API calls', async () => {
    requireLocalOnly()
    const { api, apiBlob, apiUpload, beacon, setRemoteAuth, remoteAuth } = await import('./api.js')
    setRemoteAuth('https://previous-server.example', 'old-token')
    expect(remoteAuth()).toBeNull()
    await expect(api('/api/data', { method: 'PUT', body: 'private' })).rejects.toMatchObject({ code: 'local-only' })
    await expect(apiBlob('/api/media/hash')).rejects.toMatchObject({ code: 'local-only' })
    await expect(apiUpload('/api/media/hash', new Blob(['private']), 'text/plain')).rejects.toMatchObject({ code: 'local-only' })
    expect(beacon('/api/activity', { data: 'private' })).toBe(false)
    const { connect } = await import('./remote.js')
    await expect(connect('https://server.example', 'ABCD')).rejects.toMatchObject({ code: 'local-only' })
  })

  it('refuses analytics and remote media build settings and emits a restrictive CSP', () => {
    expect(() => localOnlyBuild({ VITE_UMAMI_SRC: 'https://stats.example/a.js', VITE_UMAMI_ID: 'id' }).configResolved()).toThrow(/analytics/)
    expect(() => localOnlyBuild({ VITE_IMG_BASE: 'https://cdn.example/' }).configResolved()).toThrow(/bundled/)
    expect(() => localOnlyBuild({ VITE_GIF_BASE: '//cdn.example/' }).configResolved()).toThrow(/bundled/)
    expect(() => localOnlyBuild({}).configResolved()).not.toThrow()
    expect(LOCAL_ONLY_CSP).toContain("frame-src 'none'")
    expect(LOCAL_ONLY_CSP).not.toMatch(/https?:|\*/)
    expect(localOnlyBuild({}).transformIndexHtml.handler()).toEqual(expect.arrayContaining([
      expect.objectContaining({ attrs: { 'http-equiv': 'Content-Security-Policy', content: LOCAL_ONLY_CSP }, injectTo: 'head-prepend' }),
    ]))
  })

  it('does not resume saved Health sharing or hand training text to a system speech provider', async () => {
    requireLocalOnly()
    const { syncHealth, enableHealth, enableRead, loadHealth } = await import('./health-sync.js')
    expect((await loadHealth()).on).toBe(false)
    expect(await syncHealth({ workouts: [{ id: 'private' }] })).toBeNull()
    expect(await enableHealth({})).toEqual({ ok: false, reason: 'local-only' })
    expect(await enableRead('weight', () => ({}))).toEqual({ ok: false, reason: 'local-only' })
    const { speak, speechSupported } = await import('./speech.js')
    expect(speechSupported()).toBe(false)
    expect(await speak('synthetic training detail')).toBe(false)
  })
})

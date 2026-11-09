// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TabBar from './TabBar.jsx'
import { DEF, useStore } from '../store/useStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host, root, router, originalS, originalUser, onStart, nativeMessages
beforeEach(() => {
  const store = useStore.getState()
  originalS = store.S
  originalUser = store.user
  nativeMessages = []
  vi.stubGlobal('webkit', { messageHandlers: {
    redFitDock: { postMessage: message => nativeMessages.push(message) },
  } })
  useStore.setState({ S: JSON.parse(JSON.stringify(DEF)), user: { id: 'ios-test', name: 'test' } })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  onStart = vi.fn()
  router = createMemoryRouter([{ path: '*', element: <TabBar onStart={onStart} /> }], {
    initialEntries: ['/home'],
  })
  act(() => root.render(<RouterProvider router={router} />))
})
afterEach(() => {
  act(() => root.unmount())
  router.dispose()
  host.remove()
  useStore.setState({ S: originalS, user: originalUser })
  vi.unstubAllGlobals()
  expect(document.documentElement.hasAttribute('data-redfit-native-dock')).toBe(false)
})

function nativeTap(tab) {
  return act(async () => window.dispatchEvent(new CustomEvent('redfit:native-dock', { detail: { tab } })))
}

describe('RED Fit iOS 26 native SwiftUI glass dock handoff', () => {
  it('announces real selected tab and hides only the duplicate web presentation', () => {
    expect(document.documentElement.dataset.redfitNativeDock).toBe('true')
    expect(nativeMessages.at(-1)).toMatchObject({
      visible: true, selected: 'home', running: false, startLabel: 'Start',
    })
    expect(host.querySelectorAll('#tabbar button')).toHaveLength(5)
  })

  it('native Plan / Stats / Exercises / Home keep the existing router and replace tab history', async () => {
    for (const [tab, route] of [
      ['plan', '/plan'], ['stats', '/stats'], ['library', '/library'], ['home', '/home'],
    ]) {
      await nativeTap(tab)
      expect(router.state.location.pathname).toBe(route)
      expect(nativeMessages.at(-1).selected).toBe(tab)
    }
    await act(async () => router.navigate(-1))
    expect(router.state.location.pathname).toBe('/home')
  })

  it('native Start keeps the existing workout picker / session path', async () => {
    act(() => useStore.setState({ S: { ...useStore.getState().S, routines: [] } }))
    await nativeTap('start')
    expect(router.state.location.pathname).toBe('/workout')
    expect(onStart).not.toHaveBeenCalled()
  })

  it('hides the native surface while a web sheet covers the page', async () => {
    const portal = document.createElement('div')
    portal.id = 'modal-root'
    document.body.appendChild(portal)
    // Modals.jsx creates the portal after the page has already mounted.
    const sheet = document.createElement('div')
    sheet.className = 'sheet'
    await act(async () => {
      portal.appendChild(sheet)
      await Promise.resolve()
    })
    expect(nativeMessages.at(-1).visible).toBe(false)
    await act(async () => {
      sheet.remove()
      await Promise.resolve()
    })
    expect(nativeMessages.at(-1).visible).toBe(true)
    portal.remove()
  })

  it('leaves keyboard input unobstructed and restores the dock on blur', async () => {
    const field = document.createElement('input')
    document.body.appendChild(field)
    await act(async () => { field.focus(); await Promise.resolve() })
    expect(nativeMessages.at(-1).visible).toBe(false)
    await act(async () => { field.blur(); await Promise.resolve() })
    expect(nativeMessages.at(-1).visible).toBe(true)
    field.remove()
  })
})

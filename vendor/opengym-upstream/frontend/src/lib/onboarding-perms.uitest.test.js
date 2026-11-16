// The real iOS 26 native-tabbar XCUITest must reach Home without HealthKit
// sheets obscuring the native navigation. Ordinary launches still request permissions.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pendingSteps } from './onboarding-perms.js'

const makeSteps = () => [
  { id: 'notifications', state: vi.fn(async () => 'prompt') },
  { id: 'appleHealth', state: vi.fn(async () => 'prompt') },
]

afterEach(() => { vi.unstubAllGlobals() })

describe('iPhone native-dock UI-test permission isolation', () => {
  it('skips only for the exact native UI-test marker, without querying permissions or storage', async () => {
    const steps = makeSteps()
    const getItem = vi.fn(() => { throw new Error('Do not read storage in native test mode') })
    vi.stubGlobal('localStorage', { getItem })
    vi.stubGlobal('window', { __REDFitUITestSkipOnboardingPermissions: true })
    await expect(pendingSteps(steps, true)).resolves.toEqual([])
    expect(getItem).not.toHaveBeenCalled()
    for (const step of steps) expect(step.state).not.toHaveBeenCalled()
  })

  it('keeps real permissions on normal iPhone launches', async () => {
    const steps = makeSteps()
    vi.stubGlobal('localStorage', { getItem: () => null })
    vi.stubGlobal('window', {})
    await expect(pendingSteps(steps, true)).resolves.toEqual(steps)
    for (const step of steps) expect(step.state).toHaveBeenCalledOnce()
  })

  it('a false or absent marker never bypasses the original permissions', async () => {
    const steps = makeSteps()
    vi.stubGlobal('localStorage', { getItem: () => null })
    vi.stubGlobal('window', { __REDFitUITestSkipOnboardingPermissions: false })
    await expect(pendingSteps(steps, true)).resolves.toEqual(steps)
  })

  it('does not enable onboarding permissions in the web build', async () => {
    const steps = makeSteps()
    vi.stubGlobal('window', { __REDFitUITestSkipOnboardingPermissions: true })
    await expect(pendingSteps(steps, false)).resolves.toEqual([])
    for (const step of steps) expect(step.state).not.toHaveBeenCalled()
  })
})

import { describe, expect, it } from 'vitest'
import { nutritionScope } from './scope.js'

describe('Nutrition account isolation across RED Fit installations', () => {
  it('keeps guest data local even with a known remote server', () => {
    expect(nutritionScope({ userId: null, server: 'https://gym.example' })).toBe('local')
  })
  it('normalizes a server URL without losing distinct accounts', () => {
    const a = nutritionScope({ userId: 1, server: 'https://GYM.example/app/' })
    const b = nutritionScope({ userId: 1, server: 'https://gym.example/app' })
    const c = nutritionScope({ userId: 2, server: 'https://gym.example/app' })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
  it('separates same numeric user ID on different self-hosted servers', () => {
    expect(nutritionScope({ userId: 1, server: 'https://one.example' }))
      .not.toBe(nutritionScope({ userId: 1, server: 'https://two.example' }))
  })
  it('separates instances on distinct paths of a shared domain', () => {
    expect(nutritionScope({ userId: '1', server: 'https://gym.example/a' }))
      .not.toBe(nutritionScope({ userId: '1', server: 'https://gym.example/b' }))
  })
  it('uses web origin when RED Fit reports no paired server', () => {
    expect(nutritionScope({ userId: 3, origin: 'https://web.example' }))
      .toBe(nutritionScope({ userId: 3, server: 'https://web.example' }))
  })
  it('does not mix unpaired native identities with a local guest', () => {
    expect(nutritionScope({ userId: 1, origin: 'capacitor://localhost' })).not.toBe('local')
    expect(nutritionScope({ userId: 1, origin: 'capacitor://localhost' }))
      .not.toBe(nutritionScope({ userId: 1, server: 'https://gym.example' }))
  })
  it('never includes URL credentials or query tokens in the scope', () => {
    expect(nutritionScope({ userId: 1, server: 'https://gym.example/path?token=secret' })).not.toContain('secret')
    expect(nutritionScope({ userId: 1, server: 'https://name:password@gym.example/path' })).not.toContain('password')
  })
})

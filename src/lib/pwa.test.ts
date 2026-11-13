import { describe, expect, it } from 'vitest'
import { canReloadAt } from './pwa'

describe('App 更新時機', () => {
  it('錄入、複習中不自動重新整理', () => {
    expect(canReloadAt('/capture')).toBe(false)
    expect(canReloadAt('/review')).toBe(false)
  })

  it('其他畫面可以', () => {
    for (const p of ['/', '/library', '/library/abc', '/settings', '/welcome', '/reviewer']) {
      expect(canReloadAt(p)).toBe(true)
    }
  })
})

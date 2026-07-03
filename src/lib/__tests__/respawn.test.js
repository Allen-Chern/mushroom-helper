import { describe, it, expect } from 'vitest'
import { calculateRespawnAt, BUFFER_MS } from '../respawn.js'

describe('calculateRespawnAt', () => {
  it('adds duration and fixed 5-minute buffer to photo time', () => {
    const photoTimeMs = new Date('2026-07-03T13:40:00+08:00').getTime()
    const durationMs = (19 * 60 + 7) * 1000 // 剩下19分7秒

    const result = calculateRespawnAt(photoTimeMs, durationMs)

    expect(BUFFER_MS).toBe(5 * 60 * 1000)
    expect(result).toBe(photoTimeMs + durationMs + BUFFER_MS)
  })

  it('handles zero duration (already respawned in the photo)', () => {
    const photoTimeMs = 1000
    expect(calculateRespawnAt(photoTimeMs, 0)).toBe(photoTimeMs + BUFFER_MS)
  })
})

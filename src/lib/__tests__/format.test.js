import { describe, it, expect } from 'vitest'
import { formatRemaining } from '../format.js'

describe('formatRemaining', () => {
  it('formats hours, minutes, seconds with zero padding', () => {
    expect(formatRemaining((1 * 3600 + 5 * 60 + 30) * 1000)).toBe('01:05:30')
  })

  it('formats sub-hour durations', () => {
    expect(formatRemaining((19 * 60 + 7) * 1000)).toBe('00:19:07')
  })

  it('clamps negative remaining time to zero', () => {
    expect(formatRemaining(-5000)).toBe('00:00:00')
  })
})

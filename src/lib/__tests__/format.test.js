import { describe, it, expect } from 'vitest'
import { formatRemaining, formatClockTime } from '../format.js'

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

describe('formatClockTime', () => {
  const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi).getTime()

  it('shows HH:MM for the same day', () => {
    expect(formatClockTime(at(2026, 7, 6, 14, 32), at(2026, 7, 6, 10, 0))).toBe('14:32')
  })

  it('pads hours and minutes', () => {
    expect(formatClockTime(at(2026, 7, 6, 8, 5), at(2026, 7, 6, 7, 0))).toBe('08:05')
  })

  it('marks tomorrow explicitly', () => {
    expect(formatClockTime(at(2026, 7, 7, 0, 15), at(2026, 7, 6, 23, 50))).toBe('明天 00:15')
  })

  it('marks yesterday explicitly', () => {
    expect(formatClockTime(at(2026, 7, 5, 22, 0), at(2026, 7, 6, 1, 0))).toBe('昨天 22:00')
  })

  it('falls back to month/day for farther dates', () => {
    expect(formatClockTime(at(2026, 7, 9, 9, 30), at(2026, 7, 6, 10, 0))).toBe('7/9 09:30')
  })
})

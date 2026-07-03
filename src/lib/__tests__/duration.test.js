import { describe, it, expect } from 'vitest'
import { parseDurationText } from '../duration.js'

describe('parseDurationText', () => {
  it('parses hour + minute + second', () => {
    expect(parseDurationText('剩下1小時5分30秒')).toEqual({
      hours: 1,
      minutes: 5,
      seconds: 30,
      totalMs: (1 * 3600 + 5 * 60 + 30) * 1000,
    })
  })

  it('parses minute + second without hour', () => {
    expect(parseDurationText('剩下19分7秒')).toEqual({
      hours: 0,
      minutes: 19,
      seconds: 7,
      totalMs: (19 * 60 + 7) * 1000,
    })
  })

  it('parses second only', () => {
    expect(parseDurationText('剩下30秒')).toEqual({
      hours: 0,
      minutes: 0,
      seconds: 30,
      totalMs: 30 * 1000,
    })
  })

  it('finds the pattern even with surrounding noise text', () => {
    expect(parseDurationText('風景變電箱 59,140 剩下19分7秒 大家的合計工作力')).toEqual({
      hours: 0,
      minutes: 19,
      seconds: 7,
      totalMs: (19 * 60 + 7) * 1000,
    })
  })

  it('returns null when no duration pattern found', () => {
    expect(parseDurationText('小 紫色蘑菇')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(parseDurationText('')).toBeNull()
    expect(parseDurationText(null)).toBeNull()
    expect(parseDurationText(undefined)).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { sortItems } from '../sorting.js'

describe('sortItems', () => {
  const now = 1_000_000

  it('sorts counting items before awaiting_confirmation items', () => {
    const items = [
      { id: 'expired-1', status: 'awaiting_confirmation', respawnAt: now - 1000 },
      { id: 'counting-1', status: 'counting', respawnAt: now + 5000 },
    ]

    const result = sortItems(items, now)

    expect(result.map((i) => i.id)).toEqual(['counting-1', 'expired-1'])
  })

  it('sorts counting items by soonest respawn first', () => {
    const items = [
      { id: 'far', status: 'counting', respawnAt: now + 10000 },
      { id: 'soon', status: 'counting', respawnAt: now + 1000 },
      { id: 'mid', status: 'counting', respawnAt: now + 5000 },
    ]

    const result = sortItems(items, now)

    expect(result.map((i) => i.id)).toEqual(['soon', 'mid', 'far'])
  })

  it('sorts awaiting_confirmation items by most recently expired first', () => {
    const items = [
      { id: 'old', status: 'awaiting_confirmation', respawnAt: now - 10000 },
      { id: 'recent', status: 'awaiting_confirmation', respawnAt: now - 1000 },
    ]

    const result = sortItems(items, now)

    expect(result.map((i) => i.id)).toEqual(['recent', 'old'])
  })

  it('does not mutate the original array', () => {
    const items = [
      { id: 'b', status: 'counting', respawnAt: now + 2000 },
      { id: 'a', status: 'counting', respawnAt: now + 1000 },
    ]
    const original = [...items]

    sortItems(items, now)

    expect(items).toEqual(original)
  })
})

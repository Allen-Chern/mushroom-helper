import { describe, it, expect } from 'vitest'
import { findDuplicateItem } from '../duplicate.js'

const item = (overrides) => ({
  id: 'x',
  locationName: '風景變電箱',
  status: 'counting',
  respawnAt: 1000,
  ...overrides,
})

describe('findDuplicateItem', () => {
  it('matches an item with the same trimmed name', () => {
    const target = item({ id: 'a', locationName: ' 風景變電箱 ' })
    expect(findDuplicateItem([target], '風景變電箱')).toBe(target)
  })

  it('matches awaiting_confirmation items too (re-upload after respawn)', () => {
    const target = item({ id: 'a', status: 'awaiting_confirmation' })
    expect(findDuplicateItem([target], '風景變電箱')).toBe(target)
  })

  it('prefers a counting item over an awaiting_confirmation one', () => {
    const awaiting = item({ id: 'a', status: 'awaiting_confirmation', respawnAt: 9000 })
    const counting = item({ id: 'b', status: 'counting', respawnAt: 2000 })
    expect(findDuplicateItem([awaiting, counting], '風景變電箱')).toBe(counting)
  })

  it('picks the latest respawnAt among candidates', () => {
    const older = item({ id: 'a', respawnAt: 1000 })
    const newer = item({ id: 'b', respawnAt: 5000 })
    expect(findDuplicateItem([older, newer], '風景變電箱')).toBe(newer)
  })

  it('returns null when there is no match or the name is blank', () => {
    expect(findDuplicateItem([item()], '別的地方')).toBeNull()
    expect(findDuplicateItem([item()], '   ')).toBeNull()
    expect(findDuplicateItem([], '風景變電箱')).toBeNull()
  })
})

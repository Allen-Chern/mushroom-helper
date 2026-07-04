import { describe, it, expect, beforeEach } from 'vitest'
import {
  getReminderBeforeSeconds,
  setReminderBeforeSeconds,
  DEFAULT_REMINDER_BEFORE_SECONDS,
  getActionBeforeSeconds,
  setActionBeforeSeconds,
  DEFAULT_ACTION_BEFORE_SECONDS,
} from '../notificationSettings.js'

// Vitest 的 node 環境沒有內建可用的 localStorage(全域雖存在但方法未實作),
// 這裡用一個以 Map 為底的最小替身,每個測試前重建即可確保互不干擾
function installFakeLocalStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

describe('notificationSettings', () => {
  beforeEach(() => installFakeLocalStorage())

  it('defaults to 20s reminder / 3s action when nothing stored', () => {
    expect(getReminderBeforeSeconds()).toBe(DEFAULT_REMINDER_BEFORE_SECONDS)
    expect(getActionBeforeSeconds()).toBe(DEFAULT_ACTION_BEFORE_SECONDS)
  })

  it('reminder threshold reuses the legacy notifyBeforeSeconds key so existing users keep their value', () => {
    localStorage.setItem('mushroom-helper:notifyBeforeSeconds', '45')
    expect(getReminderBeforeSeconds()).toBe(45)
  })

  it('round-trips set/get for both thresholds independently', () => {
    setReminderBeforeSeconds(30)
    setActionBeforeSeconds(5)
    expect(getReminderBeforeSeconds()).toBe(30)
    expect(getActionBeforeSeconds()).toBe(5)
  })

  it('falls back to defaults on invalid stored values', () => {
    localStorage.setItem('mushroom-helper:actionBeforeSeconds', 'not-a-number')
    expect(getActionBeforeSeconds()).toBe(DEFAULT_ACTION_BEFORE_SECONDS)
  })
})

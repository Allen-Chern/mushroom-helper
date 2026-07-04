// 通知設定屬於裝置/瀏覽器層級(對應 Decision Log #8),存在 localStorage
// 拆分成「提醒」與「操作」兩組獨立門檻(對應 Decision Log #24):
// - reminder 沿用原本唯一設定的 storage key,既有使用者已存的值不會被這次拆分重置
// - action 是全新設定,同時也是 ItemCard 圓環倒數視覺的時窗(見 ItemCard.vue)
const REMINDER_STORAGE_KEY = 'mushroom-helper:notifyBeforeSeconds'
const ACTION_STORAGE_KEY = 'mushroom-helper:actionBeforeSeconds'

export const DEFAULT_REMINDER_BEFORE_SECONDS = 20
export const DEFAULT_ACTION_BEFORE_SECONDS = 3

function readSeconds(key, defaultValue) {
  const raw = localStorage.getItem(key)
  const parsed = raw !== null ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue
}

export function getReminderBeforeSeconds() {
  return readSeconds(REMINDER_STORAGE_KEY, DEFAULT_REMINDER_BEFORE_SECONDS)
}

export function setReminderBeforeSeconds(seconds) {
  localStorage.setItem(REMINDER_STORAGE_KEY, String(seconds))
}

export function getActionBeforeSeconds() {
  return readSeconds(ACTION_STORAGE_KEY, DEFAULT_ACTION_BEFORE_SECONDS)
}

export function setActionBeforeSeconds(seconds) {
  localStorage.setItem(ACTION_STORAGE_KEY, String(seconds))
}

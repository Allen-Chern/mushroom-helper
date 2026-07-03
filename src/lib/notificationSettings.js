// 通知設定屬於裝置/瀏覽器層級(對應 Decision Log #8),存在 localStorage
const STORAGE_KEY = 'mushroom-helper:notifyBeforeSeconds'
export const DEFAULT_NOTIFY_BEFORE_SECONDS = 20

export function getNotifyBeforeSeconds() {
  const raw = localStorage.getItem(STORAGE_KEY)
  const parsed = raw !== null ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_NOTIFY_BEFORE_SECONDS
}

export function setNotifyBeforeSeconds(seconds) {
  localStorage.setItem(STORAGE_KEY, String(seconds))
}

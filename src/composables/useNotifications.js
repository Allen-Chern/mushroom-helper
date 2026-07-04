import { watch } from 'vue'
import { getReminderBeforeSeconds, getActionBeforeSeconds } from '../lib/notificationSettings.js'

function scheduleTone(ctx, { freq, start, duration, peakGain = 0.28, type = 'sine' }) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = freq
  const t0 = ctx.currentTime + start
  const t1 = t0 + duration
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(peakGain, t0 + Math.min(0.05, duration / 4))
  gain.gain.exponentialRampToValueAtTime(0.0001, t1)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(t0)
  oscillator.stop(t1)
}

function playPattern(notes) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContextClass()
    let maxEnd = 0
    for (const note of notes) {
      scheduleTone(ctx, note)
      maxEnd = Math.max(maxEnd, note.start + note.duration)
    }
    // 音效較長,且可能多個項目短時間內接連觸發,主動關閉 context 避免堆積
    // (部分瀏覽器對併發 AudioContext 數量有上限)
    setTimeout(() => ctx.close().catch(() => {}), (maxEnd + 0.2) * 1000)
  } catch (err) {
    console.warn('無法播放通知音效', err)
  }
}

// 提醒音(對應需求1-1):柔和圓潤的兩音「叮-咚」重複三次,節奏平緩,總長約 3.1 秒
export function playReminderSound() {
  playPattern([
    { freq: 880, start: 0.0, duration: 0.35 },
    { freq: 659, start: 0.45, duration: 0.45 },
    { freq: 880, start: 1.15, duration: 0.35 },
    { freq: 659, start: 1.6, duration: 0.45 },
    { freq: 880, start: 2.3, duration: 0.35 },
    { freq: 659, start: 2.75, duration: 0.4 },
  ])
}

// 操作音(對應需求1-2):急促、音高更高的方波三連短音再拉長收尾,節奏比提醒音快很多,
// 讓兩者光靠聽覺就能分辨,總長約 3.0 秒
export function playActionSound() {
  playPattern([
    { freq: 1318, start: 0.0, duration: 0.15, type: 'square', peakGain: 0.22 },
    { freq: 1318, start: 0.25, duration: 0.15, type: 'square', peakGain: 0.22 },
    { freq: 1318, start: 0.5, duration: 0.15, type: 'square', peakGain: 0.22 },
    { freq: 1568, start: 0.85, duration: 0.15, type: 'square', peakGain: 0.24 },
    { freq: 1568, start: 1.1, duration: 0.15, type: 'square', peakGain: 0.24 },
    { freq: 1568, start: 1.35, duration: 0.15, type: 'square', peakGain: 0.24 },
    { freq: 1976, start: 1.75, duration: 1.25, type: 'square', peakGain: 0.26 },
  ])
}

function notifyBrowser(item, kind) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  const isAction = kind === 'action'
  new Notification(isAction ? '🎮 該操作了!' : '🔔 蘑菇即將重生', {
    body: item.locationName || '未命名地點',
    tag: `mushroom-${item.id}-${kind}`,
    requireInteraction: isAction,
  })
}

export function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function crossedThreshold(lastRemainingMs, remainingMs, thresholdMs) {
  return lastRemainingMs !== undefined && lastRemainingMs > thresholdMs && remainingMs <= thresholdMs
}

// 監看 items + tick,分別判斷每個倒數項目是否「跨過」提醒/操作兩組門檻(對應設計文件 §4.4)
// 用「跨過」而非「等於」避免因 tick 間隔誤差錯過那個精確秒數
export function useNotifications(itemsRef, nowRef) {
  const lastRemainingByKey = new Map()
  const reminderNotifiedKeys = new Set()
  const actionNotifiedKeys = new Set()

  watch([itemsRef, nowRef], ([items, now]) => {
    const reminderThresholdMs = getReminderBeforeSeconds() * 1000
    const actionThresholdMs = getActionBeforeSeconds() * 1000
    const activeKeys = new Set()

    for (const item of items) {
      if (item.status !== 'counting') continue

      const key = `${item.id}:${item.respawnAt}`
      activeKeys.add(key)
      const remainingMs = item.respawnAt - now
      const lastRemainingMs = lastRemainingByKey.get(key)

      if (crossedThreshold(lastRemainingMs, remainingMs, reminderThresholdMs) && !reminderNotifiedKeys.has(key)) {
        reminderNotifiedKeys.add(key)
        playReminderSound()
        notifyBrowser(item, 'reminder')
      }
      if (crossedThreshold(lastRemainingMs, remainingMs, actionThresholdMs) && !actionNotifiedKeys.has(key)) {
        actionNotifiedKeys.add(key)
        playActionSound()
        notifyBrowser(item, 'action')
      }

      lastRemainingByKey.set(key, remainingMs)
    }

    for (const key of lastRemainingByKey.keys()) {
      if (!activeKeys.has(key)) {
        lastRemainingByKey.delete(key)
        reminderNotifiedKeys.delete(key)
        actionNotifiedKeys.delete(key)
      }
    }
  })
}

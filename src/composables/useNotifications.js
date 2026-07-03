import { watch } from 'vue'
import { getNotifyBeforeSeconds } from '../lib/notificationSettings.js'

// 用 Web Audio API 產生嗶聲,不需要額外的音檔資產
function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContextClass()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.5)
  } catch (err) {
    console.warn('無法播放通知音效', err)
  }
}

function notifyBrowser(item) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  new Notification('蘑菇即將重生', { body: item.locationName || '未命名地點' })
}

export function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// 監看 items + tick,判斷每個倒數項目是否「跨過」使用者設定的提醒秒數(對應設計文件 §4.4)
// 用「跨過」而非「等於」避免因 tick 間隔誤差錯過那個精確秒數
export function useNotifications(itemsRef, nowRef) {
  const notifiedKeys = new Set()
  const lastRemainingByKey = new Map()

  watch([itemsRef, nowRef], ([items, now]) => {
    const thresholdMs = getNotifyBeforeSeconds() * 1000
    const activeKeys = new Set()

    for (const item of items) {
      if (item.status !== 'counting') continue

      const key = `${item.id}:${item.respawnAt}`
      activeKeys.add(key)
      const remainingMs = item.respawnAt - now
      const lastRemainingMs = lastRemainingByKey.get(key)

      const crossedThreshold =
        lastRemainingMs !== undefined && lastRemainingMs > thresholdMs && remainingMs <= thresholdMs

      if (crossedThreshold && !notifiedKeys.has(key)) {
        notifiedKeys.add(key)
        playBeep()
        notifyBrowser(item)
      }

      lastRemainingByKey.set(key, remainingMs)
    }

    for (const key of lastRemainingByKey.keys()) {
      if (!activeKeys.has(key)) {
        lastRemainingByKey.delete(key)
        notifiedKeys.delete(key)
      }
    }
  })
}

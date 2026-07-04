<script setup>
import { computed } from 'vue'
import { formatRemaining } from '../lib/format.js'
import { getReminderBeforeSeconds, getActionBeforeSeconds } from '../lib/notificationSettings.js'

const props = defineProps({
  item: { type: Object, required: true },
  now: { type: Number, required: true },
})

const emit = defineEmits(['delete'])

const remainingMs = computed(() => props.item.respawnAt - props.now)
const isAwaitingConfirmation = computed(() => props.item.status === 'awaiting_confirmation')

// 依剩餘時間分三個階段上色,呼應皮克敏的紅/黃/綠色系,讓玩家一眼掃過去就知道哪個最快要重生
const urgency = computed(() => {
  if (isAwaitingConfirmation.value) return 'bloom'
  const minutes = remainingMs.value / 60000
  if (minutes <= 5) return 'coral'
  if (minutes <= 20) return 'sun'
  return 'leaf'
})

// 依剩餘時間 vs 使用者設定的提醒/操作門檻,決定目前該疊加哪種強調效果(對應通知雙門檻需求)。
// 'go' 只看 remainingMs<=0,不看 item.status —— Firestore 要等 RESPAWN_GRACE_MS(見 ObservationSet.vue)
// 才會把 status 寫成 awaiting_confirmation,這段等待期間本來就該持續顯示 GO。
const phase = computed(() => {
  if (isAwaitingConfirmation.value) return 'bloom'
  if (remainingMs.value <= 0) return 'go'
  if (remainingMs.value <= getActionBeforeSeconds() * 1000) return 'action'
  if (remainingMs.value <= getReminderBeforeSeconds() * 1000) return 'reminder'
  return 'idle'
})

// 圓環中心顯示的秒數,與 phase==='action' 共用同一組操作門檻,兩者是同一段時間窗
const actionRemainingSeconds = computed(() => Math.max(1, Math.ceil(remainingMs.value / 1000)))
const actionProgress = computed(() => {
  const totalMs = getActionBeforeSeconds() * 1000
  if (totalMs <= 0) return 1
  return Math.min(1, Math.max(0, 1 - remainingMs.value / totalMs))
})
</script>

<template>
  <li
    class="item-card"
    :class="[`urgency-${urgency}`, `phase-${phase}`, { 'is-expired': isAwaitingConfirmation }]"
  >
    <span class="stem" aria-hidden="true"></span>
    <div class="item-main">
      <strong class="location-name">{{ item.locationName || '(未命名地點)' }}</strong>
      <span v-if="isAwaitingConfirmation" class="badge">
        <span class="bloom-icon" aria-hidden="true">🌸</span> 已重生 / 待確認
      </span>
      <div
        v-else-if="phase === 'action' || phase === 'go'"
        class="action-ring"
        :style="{ '--progress': phase === 'go' ? 1 : actionProgress }"
      >
        <span v-if="phase === 'go'" class="ring-label go-label">GO</span>
        <span v-else :key="actionRemainingSeconds" class="ring-label">{{ actionRemainingSeconds }}</span>
      </div>
      <span v-else class="countdown">{{ formatRemaining(remainingMs) }}</span>
    </div>
    <button class="delete-btn" title="刪除" @click="emit('delete', item.id)">✕</button>
  </li>
</template>

<style scoped>
.item-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 14px 20px;
  border: 2px solid var(--border);
  border-radius: 8px 20px 20px 8px / 8px 26px 26px 8px;
  background: var(--card-bg);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.05), 0 8px 18px -12px rgba(46, 90, 30, 0.35);
  animation: popIn 0.4s ease both;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.item-card:hover {
  transform: translateY(-2px) rotate(-0.3deg);
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.06), 0 12px 22px -12px rgba(46, 90, 30, 0.4);
}

/* 提醒門檻已跨過:疊加緩慢的暖黃光暈呼吸,讓卡片在一片列表中明顯浮現(對應需求3) */
.item-card.phase-reminder {
  animation: popIn 0.4s ease both, reminderGlow 1.1s ease-in-out infinite;
}

@keyframes reminderGlow {
  0%,
  100% {
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.05), 0 8px 18px -12px rgba(46, 90, 30, 0.35),
      0 0 0 0 color-mix(in srgb, var(--sun) 55%, transparent);
  }
  50% {
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.05), 0 8px 18px -12px rgba(46, 90, 30, 0.35),
      0 0 0 10px color-mix(in srgb, var(--sun) 0%, transparent);
  }
}

/* 到期瞬間(GO):一次性的彈跳強光,標記「現在就是這一刻」 */
.item-card.phase-go {
  animation: popIn 0.4s ease both, goFlash 0.6s ease-out 1;
}

@keyframes goFlash {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--bloom) 70%, transparent), 0 2px 0 rgba(0, 0, 0, 0.05),
      0 8px 18px -12px rgba(46, 90, 30, 0.35);
  }
  100% {
    box-shadow: 0 0 0 22px color-mix(in srgb, var(--bloom) 0%, transparent), 0 2px 0 rgba(0, 0, 0, 0.05),
      0 8px 18px -12px rgba(46, 90, 30, 0.35);
  }
}

.stem {
  position: absolute;
  left: 0;
  top: 10%;
  bottom: 10%;
  width: 7px;
  border-radius: 6px;
  background: var(--leaf);
}

.urgency-sun .stem {
  background: var(--sun);
}

.urgency-coral .stem {
  background: var(--coral);
}

.urgency-bloom .stem {
  background: var(--bloom);
}

.item-card.is-expired {
  background: var(--card-bg-soft);
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.location-name {
  color: var(--text-h);
  font-size: 1.02rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.countdown {
  font-variant-numeric: tabular-nums;
  font-size: 1.3em;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.urgency-leaf .countdown {
  color: var(--leaf-dark);
}

.urgency-sun .countdown {
  color: var(--sun-dark);
}

.urgency-coral .countdown {
  color: var(--coral-dark);
  animation: bob 1.2s ease-in-out infinite;
}

/* 圓環倒數(對應需求4):CSS conic-gradient 畫出的進度環,秒數在中心跳動報數,
   歸零後圓心改顯示「GO」並持續脈動,直到 5 秒緩衝結束轉為已重生徽章 */
.action-ring {
  --progress: 0;
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: conic-gradient(var(--coral) calc(var(--progress) * 360deg), var(--coral-bg) 0);
  animation: popIn 0.3s ease both;
}

.action-ring::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: var(--card-bg);
}

.ring-label {
  position: relative;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--coral-dark);
  animation: popIn 0.25s ease both;
}

.go-label {
  color: var(--bloom-dark);
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  animation: goPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both, goPulse 0.6s ease-in-out 0.4s infinite;
}

@keyframes goPop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes goPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  font-weight: 700;
  color: var(--bloom-dark);
}

.bloom-icon {
  display: inline-block;
  animation: bob 2.4s ease-in-out infinite;
}

.delete-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.1em;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  box-shadow: none;
}

.delete-btn:hover {
  color: #fff;
  background: var(--coral);
}

.delete-btn:active {
  transform: scale(0.9);
}
</style>

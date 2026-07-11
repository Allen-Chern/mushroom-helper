<script setup>
import { ref, computed } from 'vue'
import {
  getReminderBeforeSeconds,
  setReminderBeforeSeconds,
  getActionBeforeSeconds,
  setActionBeforeSeconds,
} from '../lib/notificationSettings.js'
import {
  requestNotificationPermission,
  playReminderSound,
  playActionSound,
} from '../composables/useNotifications.js'

const reminderSeconds = ref(getReminderBeforeSeconds())
const actionSeconds = ref(getActionBeforeSeconds())
const permission = ref(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')

const isActionAfterReminder = computed(() => Number(actionSeconds.value) >= Number(reminderSeconds.value))

function handleReminderChange() {
  const value = Number(reminderSeconds.value)
  if (Number.isFinite(value) && value >= 0) {
    setReminderBeforeSeconds(value)
  }
}

function handleActionChange() {
  const value = Number(actionSeconds.value)
  if (Number.isFinite(value) && value >= 0) {
    setActionBeforeSeconds(value)
  }
}

async function handleRequestPermission() {
  requestNotificationPermission()
  // Notification.requestPermission 是非同步但舊瀏覽器可能是同步 callback 版本,稍微延遲後重新讀取狀態較保險
  setTimeout(() => {
    permission.value = Notification.permission
  }, 300)
}
</script>

<template>
  <div class="notification-fields">
    <label>
      <span class="label-text">
        提醒音
        <span class="hint">重生前多久播放,提醒即將要操作了</span>
      </span>
      <span class="seconds-input">
        <input v-model.number="reminderSeconds" type="number" min="0" @change="handleReminderChange" />
        秒
        <button type="button" class="icon-btn" title="試聽提醒音" @click="playReminderSound">🔊</button>
      </span>
    </label>

    <label>
      <span class="label-text">
        操作音
        <span class="hint">重生前多久播放,提醒該點開遊戲操作了</span>
      </span>
      <span class="seconds-input">
        <input v-model.number="actionSeconds" type="number" min="0" @change="handleActionChange" />
        秒
        <button type="button" class="icon-btn" title="試聽操作音" @click="playActionSound">🔊</button>
      </span>
    </label>

    <p v-if="isActionAfterReminder" class="hint warning">⚠️ 操作秒數通常應小於提醒秒數</p>

    <div v-if="permission !== 'unsupported'">
      <p v-if="permission === 'granted'" class="granted">✅ 已授權瀏覽器通知</p>
      <button v-else type="button" class="permission-btn" @click="handleRequestPermission">
        開啟瀏覽器通知授權
      </button>
    </div>
    <p v-else class="muted">此瀏覽器不支援 Notification API,僅會播放音效。</p>
  </div>
</template>

<style scoped>
.notification-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-fields label {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  font-weight: 700;
  gap: 10px;
}

.label-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-text .hint {
  font-weight: 500;
  font-size: 0.8em;
  color: var(--muted);
}

.seconds-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--muted);
  flex-shrink: 0;
}

.seconds-input input {
  width: 60px;
  padding: 6px 8px;
  text-align: center;
  font-weight: 700;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 2px solid var(--border);
  border-radius: 50%;
  background: var(--card-bg-soft);
  font-size: 0.95em;
  box-shadow: none;
}

.icon-btn:hover {
  background: var(--sun-bg);
}

.icon-btn:active {
  transform: scale(0.9);
}

.permission-btn {
  align-self: flex-start;
  font-size: 0.9em;
}

.granted {
  color: var(--leaf-dark);
  font-weight: 700;
  margin: 0;
}

.muted {
  color: var(--muted);
  font-weight: 600;
  margin: 0;
}

.hint.warning {
  color: var(--danger);
  font-weight: 700;
  margin: -4px 0 0;
}
</style>

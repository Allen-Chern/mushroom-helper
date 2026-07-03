<script setup>
import { ref } from 'vue'
import { getNotifyBeforeSeconds, setNotifyBeforeSeconds } from '../lib/notificationSettings.js'
import { requestNotificationPermission } from '../composables/useNotifications.js'

const seconds = ref(getNotifyBeforeSeconds())
const permission = ref(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')

function handleSecondsChange() {
  const value = Number(seconds.value)
  if (Number.isFinite(value) && value >= 0) {
    setNotifyBeforeSeconds(value)
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
  <details class="settings">
    <summary>🔔 通知設定(僅影響這台裝置)</summary>
    <div class="settings-body">
      <label>
        重生前幾秒提醒:
        <input v-model.number="seconds" type="number" min="0" @change="handleSecondsChange" />
        秒
      </label>

      <div v-if="permission !== 'unsupported'">
        <p v-if="permission === 'granted'">✅ 已授權瀏覽器通知</p>
        <button v-else @click="handleRequestPermission">開啟瀏覽器通知授權</button>
      </div>
      <p v-else class="muted">此瀏覽器不支援 Notification API,僅會播放音效。</p>
    </div>
  </details>
</template>

<style scoped>
.settings {
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.muted {
  color: var(--muted);
}
</style>

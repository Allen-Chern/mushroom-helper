<script setup>
import { ref, computed } from 'vue'
import { calculateRespawnAt } from '../lib/respawn.js'

const props = defineProps({
  imageUrl: { type: String, required: true },
  guess: { type: Object, required: true }, // { locationName, hours, minutes, seconds, photoTimeMs, photoTimeSource }
  existingItems: { type: Array, default: () => [] },
})

const emit = defineEmits(['submit', 'skip'])

const locationName = ref(props.guess.locationName)
const hours = ref(props.guess.hours)
const minutes = ref(props.guess.minutes)
const seconds = ref(props.guess.seconds)
const photoTimeSource = ref(props.guess.photoTimeSource)
const updateMode = ref('update')

// 照片時間的「分鐘以上」部分交給原生 datetime-local 元件(iOS 對這塊支援沒問題),
// 「秒」則獨立用數字輸入框處理 —— 實測發現 iOS Safari 的 datetime-local 選擇器
// 介面本身就沒有秒數欄位,靠它顯示/編輯秒數不可靠,乾脆完全不依賴它處理秒
function toLocalMinuteInputValue(ms) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const photoDateTimeMinutePart = ref(toLocalMinuteInputValue(props.guess.photoTimeMs))
const photoSeconds = ref(new Date(props.guess.photoTimeMs).getSeconds())

const photoTimeMs = computed(() => {
  const base = new Date(photoDateTimeMinutePart.value)
  if (Number.isNaN(base.getTime())) return props.guess.photoTimeMs
  base.setSeconds(Number(photoSeconds.value) || 0)
  return base.getTime()
})

function markPhotoTimeAsManual() {
  photoTimeSource.value = 'manual'
}

const timeSourceLabel = computed(() => {
  return { exif: '照片 EXIF(自動)', lastModified: '檔案時間(自動)', manual: '需手動輸入' }[
    photoTimeSource.value
  ]
})

const durationMs = computed(() => {
  return ((Number(hours.value) * 60 + Number(minutes.value)) * 60 + Number(seconds.value)) * 1000
})

const respawnAt = computed(() => calculateRespawnAt(photoTimeMs.value, durationMs.value))

const duplicateMatch = computed(() => {
  const name = locationName.value.trim()
  if (!name) return null
  return (
    props.existingItems.find((item) => item.status === 'counting' && item.locationName.trim() === name) ||
    null
  )
})

const isRespawnTimeSuspicious = computed(() => respawnAt.value < Date.now() - 60 * 60 * 1000)

const isValid = computed(() => locationName.value.trim().length > 0)

function handleSubmit() {
  if (!isValid.value) return
  emit('submit', {
    locationName: locationName.value.trim(),
    respawnAt: respawnAt.value,
    photoTimeSource: photoTimeSource.value,
    duplicateItemId: duplicateMatch.value && updateMode.value === 'update' ? duplicateMatch.value.id : null,
  })
}
</script>

<template>
  <div class="confirm-card">
    <img :src="imageUrl" alt="上傳的截圖縮圖" class="thumbnail" />

    <label>
      地標名稱
      <input v-model="locationName" type="text" placeholder="例如:風景變電箱" />
    </label>

    <fieldset class="duration-fields">
      <legend>剩餘時間</legend>
      <label>時 <input v-model.number="hours" type="number" min="0" /></label>
      <label>分 <input v-model.number="minutes" type="number" min="0" max="59" /></label>
      <label>秒 <input v-model.number="seconds" type="number" min="0" max="59" /></label>
    </fieldset>

    <fieldset class="photo-time-fields">
      <legend>照片時間({{ timeSourceLabel }})</legend>
      <input
        v-model="photoDateTimeMinutePart"
        type="datetime-local"
        @change="markPhotoTimeAsManual"
      />
      <label>秒 <input v-model.number="photoSeconds" type="number" min="0" max="59" @change="markPhotoTimeAsManual" /></label>
    </fieldset>

    <p v-if="isRespawnTimeSuspicious" class="warning">
      ⚠️ 算出的重生時間比現在早超過 1 小時,請確認時間是否正確。
    </p>

    <div v-if="duplicateMatch" class="duplicate-notice">
      <p>⚠️ 已有相同地點「{{ duplicateMatch.locationName }}」正在倒數中,要:</p>
      <label><input v-model="updateMode" type="radio" value="update" /> 更新既有項目</label>
      <label><input v-model="updateMode" type="radio" value="add" /> 新增一筆</label>
    </div>

    <div class="actions">
      <button type="button" @click="emit('skip')">放棄這張</button>
      <button type="button" :disabled="!isValid" @click="handleSubmit">加入</button>
    </div>
  </div>
</template>

<style scoped>
.confirm-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
}

.thumbnail {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 8px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9em;
  color: var(--muted);
}

input[type='text'],
input[type='datetime-local'] {
  padding: 8px;
  color: var(--text-h);
  background: var(--bg);
}

.duration-fields {
  display: flex;
  gap: 12px;
  border: none;
  padding: 0;
  margin: 0;
}

.duration-fields label {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.duration-fields input {
  width: 60px;
  padding: 6px;
}

.photo-time-fields {
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  padding: 0;
  margin: 0;
}

.photo-time-fields label {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.photo-time-fields input[type='number'] {
  width: 60px;
  padding: 6px;
}

.warning {
  color: var(--danger);
  font-size: 0.9em;
}

.duplicate-notice {
  padding: 10px;
  border-radius: 8px;
  background: var(--accent-bg);
  font-size: 0.9em;
}

.duplicate-notice label {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  display: inline-flex;
  margin-right: 12px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

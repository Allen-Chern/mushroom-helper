<script setup>
import { ref, computed } from 'vue'
import { calculateRespawnAt } from '../lib/respawn.js'
import { findDuplicateItem } from '../lib/duplicate.js'

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

const duplicateMatch = computed(() => findDuplicateItem(props.existingItems, locationName.value))

const duplicateStateLabel = computed(() => {
  if (!duplicateMatch.value) return ''
  return duplicateMatch.value.status === 'awaiting_confirmation' ? '已重生待確認' : '正在倒數中'
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
    <div class="polaroid">
      <img :src="imageUrl" alt="上傳的截圖縮圖" class="thumbnail" />
    </div>

    <label>
      🏷️ 地標名稱
      <input v-model="locationName" type="text" placeholder="例如:風景變電箱" />
    </label>

    <fieldset class="duration-fields">
      <legend>⏳ 剩餘時間</legend>
      <label class="dial"><input v-model.number="hours" type="number" min="0" /><span>時</span></label>
      <label class="dial"><input v-model.number="minutes" type="number" min="0" max="59" /><span>分</span></label>
      <label class="dial"><input v-model.number="seconds" type="number" min="0" max="59" /><span>秒</span></label>
    </fieldset>

    <fieldset class="photo-time-fields">
      <legend>📸 照片時間({{ timeSourceLabel }})</legend>
      <input
        v-model="photoDateTimeMinutePart"
        type="datetime-local"
        @change="markPhotoTimeAsManual"
      />
      <label class="dial"><input v-model.number="photoSeconds" type="number" min="0" max="59" @change="markPhotoTimeAsManual" /><span>秒</span></label>
    </fieldset>

    <p v-if="isRespawnTimeSuspicious" class="warning">
      ⚠️ 算出的重生時間比現在早超過 1 小時,請確認時間是否正確。
    </p>

    <div v-if="duplicateMatch" class="duplicate-notice">
      <p>🔁 已有相同地點「{{ duplicateMatch.locationName }}」({{ duplicateStateLabel }}),要:</p>
      <label class="radio"><input v-model="updateMode" type="radio" value="update" /> 更新既有項目</label>
      <label class="radio"><input v-model="updateMode" type="radio" value="add" /> 新增一筆</label>
    </div>

    <div class="actions">
      <button type="button" class="ghost-btn" @click="emit('skip')">放棄這張</button>
      <button type="button" class="submit-btn" :disabled="!isValid" @click="handleSubmit">🌼 加入</button>
    </div>
  </div>
</template>

<style scoped>
.confirm-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  margin-bottom: 14px;
  border: 2px solid var(--border);
  border-radius: 20px;
  background: var(--card-bg);
  box-shadow: var(--shadow-pop);
  animation: popIn 0.35s ease both;
}

.polaroid {
  padding: 10px 10px 20px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 6px 16px -8px rgba(0, 0, 0, 0.35);
  transform: rotate(-1.2deg);
  align-self: center;
  width: 92%;
}

.thumbnail {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 2px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.92em;
  font-weight: 700;
  color: var(--muted);
}

input[type='text'],
input[type='datetime-local'] {
  padding: 9px 10px;
  color: var(--text-h);
  background: var(--card-bg-soft);
  font-weight: 600;
}

input[type='text']:focus-visible,
input[type='datetime-local']:focus-visible {
  border-color: var(--leaf);
}

.duration-fields,
.photo-time-fields {
  border: none;
  padding: 0;
  margin: 0;
}

.duration-fields legend,
.photo-time-fields legend {
  font-weight: 700;
  color: var(--text-h);
  padding: 0 0 6px;
}

.duration-fields {
  display: flex;
  gap: 10px;
}

.photo-time-fields {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.dial {
  flex-direction: column-reverse;
  align-items: center;
  gap: 4px;
}

.dial input {
  width: 64px;
  padding: 8px 4px;
  text-align: center;
  font-weight: 700;
  font-size: 1.05em;
}

.warning {
  color: var(--danger);
  font-size: 0.9em;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--coral-bg);
}

.duplicate-notice {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--sun-bg);
  font-size: 0.92em;
}

.duplicate-notice p {
  margin: 0 0 8px;
  font-weight: 700;
  color: var(--text-h);
}

.radio {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  display: inline-flex;
  margin-right: 12px;
  font-weight: 600;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.ghost-btn {
  background: transparent;
  color: var(--muted);
  box-shadow: none;
  border: 2px solid var(--border);
}

.ghost-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.submit-btn {
  background: linear-gradient(180deg, var(--bloom) 0%, var(--bloom-dark) 100%);
  border-radius: 999px;
}
</style>

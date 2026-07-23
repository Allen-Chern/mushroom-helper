<script setup>
import { ref, computed } from 'vue'
import { recognizeImage, getImageDimensions } from '../lib/ocr.js'
import { guessDurationText, guessLocationName } from '../lib/ocrParse.js'
import { readExifDateTime } from '../lib/exif.js'
import { getClientId } from '../lib/clientId.js'
import { calculateRespawnAt, RESPAWN_GRACE_MS } from '../lib/respawn.js'
import { findDuplicateItem } from '../lib/duplicate.js'
import { formatClockTime } from '../lib/format.js'
import { addItem, updateItem } from '../services/observationSets.js'
import { autoMode } from '../lib/autoMode.js'
import ConfirmCard from './ConfirmCard.vue'

const props = defineProps({
  setId: { type: String, required: true },
  existingItems: { type: Array, default: () => [] },
})

const fileInput = ref(null)
const queue = ref([])
const currentIndex = ref(0)
const currentGuess = ref(null)
const currentImageUrl = ref('')
const isProcessing = ref(false)
const isAutoResolving = ref(false)
const isSaving = ref(false)
const ocrError = ref('')
const saveError = ref('')
const completedCount = ref(0)
const autoLog = ref([])

// 同一批次內剛存好的項目(名稱→itemId):Firestore snapshot 回寫有延遲,
// 批次裡連續兩張同地點截圖若只靠 existingItems 比對會漏掉,導致重複新增
let sessionSavedIds = new Map()

const isActive = computed(() => queue.value.length > 0 && currentIndex.value < queue.value.length)
const isFinished = computed(() => queue.value.length > 0 && currentIndex.value >= queue.value.length)

// 上傳入口改為 header 的圓形 icon 按鈕(位於 ObservationSet),
// 由父層透過 template ref 呼叫 openPicker 觸發隱藏的檔案選擇器
function openPicker() {
  if (!isActive.value) fileInput.value?.click()
}

defineExpose({ openPicker, isActive })
const showConfirmCard = computed(
  () => currentGuess.value && !isProcessing.value && !isAutoResolving.value,
)

async function resolvePhotoTime(file) {
  const exifMs = await readExifDateTime(file)
  if (exifMs) return { photoTimeMs: exifMs, photoTimeSource: 'exif' }
  if (file.lastModified) return { photoTimeMs: file.lastModified, photoTimeSource: 'lastModified' }
  return { photoTimeMs: Date.now(), photoTimeSource: 'manual' }
}

async function handleFilesSelected(event) {
  const files = Array.from(event.target.files ?? [])
  if (files.length === 0) return
  queue.value = files
  currentIndex.value = 0
  completedCount.value = 0
  saveError.value = ''
  autoLog.value = []
  sessionSavedIds = new Map()
  await processQueueStep()
  event.target.value = ''
}

// 每張截圖的處理入口:先 OCR,自動模式下嘗試直接存檔並連續處理下一張;
// 辨識不完整或存檔失敗就退回手動確認卡,由使用者接手
async function processQueueStep() {
  const useAuto = autoMode.value
  if (useAuto) isAutoResolving.value = true
  try {
    await processCurrent()
    if (!useAuto || !currentGuess.value) return
    const saved = await tryAutoSave()
    if (saved) {
      advanceCleanup()
      if (currentIndex.value < queue.value.length) await processQueueStep()
    }
  } finally {
    if (useAuto) isAutoResolving.value = false
  }
}

async function processCurrent() {
  const file = queue.value[currentIndex.value]
  if (!file) return

  isProcessing.value = true
  ocrError.value = ''
  currentImageUrl.value = URL.createObjectURL(file)

  try {
    const [timeResult, dimensions, ocrResult] = await Promise.all([
      resolvePhotoTime(file),
      getImageDimensions(file),
      recognizeImage(file),
    ])

    const durationGuess = guessDurationText(ocrResult.text)
    const locationGuess = guessLocationName(ocrResult.lines, dimensions.height)

    currentGuess.value = {
      locationName: locationGuess,
      hours: durationGuess?.hours ?? 0,
      minutes: durationGuess?.minutes ?? 0,
      seconds: durationGuess?.seconds ?? 0,
      photoTimeMs: timeResult.photoTimeMs,
      photoTimeSource: timeResult.photoTimeSource,
    }

    if (!durationGuess) {
      ocrError.value = '未偵測到剩餘時間文字,請手動輸入。'
    }
  } catch (err) {
    console.error(err)
    ocrError.value = 'OCR 辨識失敗,請手動填寫下方欄位。'
    const timeResult = await resolvePhotoTime(file).catch(() => ({
      photoTimeMs: Date.now(),
      photoTimeSource: 'manual',
    }))
    currentGuess.value = {
      locationName: '',
      hours: 0,
      minutes: 0,
      seconds: 0,
      photoTimeMs: timeResult.photoTimeMs,
      photoTimeSource: timeResult.photoTimeSource,
    }
  } finally {
    isProcessing.value = false
  }
}

// 自動模式的存檔判斷:地標名稱與剩餘時間都辨識到、算出的重生時間不可疑才放行,
// 任一條件不滿足就回傳 false 落回手動確認
async function tryAutoSave() {
  const guess = currentGuess.value
  const name = (guess.locationName ?? '').trim()
  const durationMs =
    ((Number(guess.hours) * 60 + Number(guess.minutes)) * 60 + Number(guess.seconds)) * 1000

  if (!name || durationMs <= 0) {
    ocrError.value = '⚡ 自動模式:辨識結果不完整,改由手動確認這張。'
    return false
  }

  const respawnAt = calculateRespawnAt(guess.photoTimeMs, durationMs)
  if (respawnAt < Date.now() - 60 * 60 * 1000) {
    ocrError.value = '⚡ 自動模式:算出的重生時間比現在早超過 1 小時,請手動確認。'
    return false
  }

  const duplicateId =
    sessionSavedIds.get(name) ?? findDuplicateItem(props.existingItems, name)?.id ?? null

  isSaving.value = true
  try {
    await saveObservation({
      locationName: name,
      respawnAt,
      photoTimeSource: guess.photoTimeSource,
      itemId: duplicateId,
    })
    autoLog.value.push({
      name,
      action: duplicateId ? 'updated' : 'added',
      clock: formatClockTime(respawnAt),
    })
    return true
  } catch (err) {
    console.error(err)
    saveError.value = '⚡ 自動儲存失敗,請檢查網路後改用下方卡片手動加入。'
    return false
  } finally {
    isSaving.value = false
  }
}

// 上傳的截圖可能是舊照片(例如手機休眠期間才被處理),算出來的 respawnAt 早已超過
// RESPAWN_GRACE_MS 緩衝——這種情況直接寫 awaiting_confirmation,
// 避免其他正在看這筆項目的裝置被迫閃過一次沒有意義的 counting/GO 畫面。
async function saveObservation({ locationName, respawnAt, photoTimeSource, itemId }) {
  const status = respawnAt + RESPAWN_GRACE_MS <= Date.now() ? 'awaiting_confirmation' : 'counting'
  if (itemId) {
    await updateItem(props.setId, itemId, {
      locationName,
      respawnAt,
      photoTimeSource,
      status,
    })
    sessionSavedIds.set(locationName, itemId)
  } else {
    const newId = await addItem(props.setId, {
      locationName,
      respawnAt,
      photoTimeSource,
      status,
      updatedBy: getClientId(),
    })
    sessionSavedIds.set(locationName, newId)
  }
  completedCount.value += 1
}

function advanceCleanup() {
  if (currentImageUrl.value) URL.revokeObjectURL(currentImageUrl.value)
  currentImageUrl.value = ''
  currentGuess.value = null
  saveError.value = ''
  ocrError.value = ''
  currentIndex.value += 1
}

async function advanceToNext() {
  advanceCleanup()
  if (currentIndex.value < queue.value.length) {
    await processQueueStep()
  }
}

async function handleSubmit(payload) {
  isSaving.value = true
  saveError.value = ''
  try {
    await saveObservation({
      locationName: payload.locationName,
      respawnAt: payload.respawnAt,
      photoTimeSource: payload.photoTimeSource,
      itemId: payload.duplicateItemId,
    })
    await advanceToNext()
  } catch (err) {
    console.error(err)
    saveError.value = '儲存失敗,請檢查網路後再按一次「加入」。'
  } finally {
    isSaving.value = false
  }
}

function handleSkip() {
  advanceToNext()
}

function handleReset() {
  queue.value = []
  currentIndex.value = 0
  currentGuess.value = null
  completedCount.value = 0
  autoLog.value = []
}
</script>

<template>
  <section class="upload-flow">
    <input
      ref="fileInput"
      class="hidden-input"
      type="file"
      accept="image/*"
      multiple
      @change="handleFilesSelected"
    />

    <p v-if="isActive" class="progress">🐛 處理中:第 {{ currentIndex + 1 }} / {{ queue.length }} 張</p>

    <p v-if="isProcessing" class="hint">🔍 OCR 辨識中,請稍候...</p>
    <p v-else-if="isAutoResolving" class="hint">⚡ 自動判斷中...</p>
    <p v-if="ocrError" class="hint warning">⚠️ {{ ocrError }}</p>
    <p v-if="saveError" class="hint warning">⚠️ {{ saveError }}</p>

    <ul v-if="autoLog.length > 0" class="auto-log">
      <li v-for="(entry, index) in autoLog" :key="index">
        <span class="log-action" :class="`log-${entry.action}`">
          {{ entry.action === 'updated' ? '更新' : '新增' }}
        </span>
        <span class="log-name">{{ entry.name }}</span>
        <span class="log-clock">{{ entry.clock }} 重生</span>
      </li>
    </ul>

    <ConfirmCard
      v-if="showConfirmCard"
      :key="currentIndex"
      :image-url="currentImageUrl"
      :guess="currentGuess"
      :existing-items="existingItems"
      @submit="handleSubmit"
      @skip="handleSkip"
    />
    <p v-if="isSaving" class="hint">🌀 儲存中...</p>

    <p v-if="isFinished" class="done">
      🌼 已處理完 {{ queue.length }} 張,成功新增/更新 {{ completedCount }} 筆。
      <button type="button" @click="handleReset">關閉</button>
    </p>
  </section>
</template>

<style scoped>
/* 入口按鈕移到 header 後,這個區塊平常只剩隱藏的 input,不佔空間;
   有處理進度/確認卡時由子元素自己的 margin 撐開間距 */
.hidden-input {
  display: none;
}

.progress {
  margin: 10px 0 0;
  color: var(--muted);
  font-weight: 600;
}

.hint {
  font-size: 0.92em;
  color: var(--muted);
  font-weight: 600;
}

.hint.warning {
  color: var(--danger);
}

.auto-log {
  list-style: none;
  margin: 10px 0 0;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--card-bg-soft);
  border: 2px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9em;
}

.auto-log li {
  display: flex;
  align-items: center;
  gap: 8px;
  animation: popIn 0.3s ease both;
}

.log-action {
  flex-shrink: 0;
  font-size: 0.82em;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  color: #fff;
}

.log-added {
  background: var(--leaf);
}

.log-updated {
  background: var(--sky);
}

.log-name {
  font-weight: 700;
  color: var(--text-h);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-clock {
  margin-left: auto;
  flex-shrink: 0;
  color: var(--muted);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.done {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--sun-bg);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
</style>

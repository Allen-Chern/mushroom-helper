<script setup>
import { ref, computed } from 'vue'
import { recognizeImage, getImageDimensions } from '../lib/ocr.js'
import { guessDurationText, guessLocationName } from '../lib/ocrParse.js'
import { readExifDateTime } from '../lib/exif.js'
import { getClientId } from '../lib/clientId.js'
import { addItem, updateItem } from '../services/observationSets.js'
import ConfirmCard from './ConfirmCard.vue'

const props = defineProps({
  setId: { type: String, required: true },
  existingItems: { type: Array, default: () => [] },
})

const queue = ref([])
const currentIndex = ref(0)
const currentGuess = ref(null)
const currentImageUrl = ref('')
const isProcessing = ref(false)
const isSaving = ref(false)
const ocrError = ref('')
const saveError = ref('')
const completedCount = ref(0)

const isActive = computed(() => queue.value.length > 0 && currentIndex.value < queue.value.length)
const isFinished = computed(() => queue.value.length > 0 && currentIndex.value >= queue.value.length)

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
  await processCurrent()
  event.target.value = ''
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

function advanceToNext() {
  if (currentImageUrl.value) URL.revokeObjectURL(currentImageUrl.value)
  currentImageUrl.value = ''
  currentGuess.value = null
  saveError.value = ''
  currentIndex.value += 1
  if (currentIndex.value < queue.value.length) {
    processCurrent()
  }
}

async function handleSubmit(payload) {
  isSaving.value = true
  saveError.value = ''
  try {
    if (payload.duplicateItemId) {
      await updateItem(props.setId, payload.duplicateItemId, {
        locationName: payload.locationName,
        respawnAt: payload.respawnAt,
        photoTimeSource: payload.photoTimeSource,
        status: 'counting',
      })
    } else {
      await addItem(props.setId, {
        locationName: payload.locationName,
        respawnAt: payload.respawnAt,
        photoTimeSource: payload.photoTimeSource,
        status: 'counting',
        updatedBy: getClientId(),
      })
    }
    completedCount.value += 1
    advanceToNext()
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
}
</script>

<template>
  <section class="upload-flow">
    <label class="file-picker" :class="{ 'is-disabled': isActive }">
      <span class="picker-icon" aria-hidden="true">🌱</span>
      <span class="picker-text">上傳截圖(可多選)</span>
      <input type="file" accept="image/*" multiple :disabled="isActive" @change="handleFilesSelected" />
    </label>

    <p v-if="isActive" class="progress">🐛 處理中:第 {{ currentIndex + 1 }} / {{ queue.length }} 張</p>

    <p v-if="isProcessing" class="hint">🔍 OCR 辨識中,請稍候...</p>
    <p v-if="ocrError" class="hint warning">⚠️ {{ ocrError }}</p>
    <p v-if="saveError" class="hint warning">⚠️ {{ saveError }}</p>

    <ConfirmCard
      v-if="currentGuess && !isProcessing"
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
.upload-flow {
  margin-bottom: 18px;
}

.file-picker {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border: 3px dashed color-mix(in srgb, var(--leaf) 55%, var(--border));
  border-radius: 18px;
  background: var(--leaf-bg);
  cursor: pointer;
  font-weight: 700;
  color: var(--leaf-dark);
  transition: transform 0.15s ease, background 0.15s ease;
}

.file-picker:hover {
  background: color-mix(in srgb, var(--leaf) 18%, transparent);
  transform: translateY(-1px);
}

.file-picker.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.picker-icon {
  font-size: 1.4rem;
  animation: bob 3s ease-in-out infinite;
}

.file-picker input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
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

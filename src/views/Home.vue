<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createObservationSet } from '../services/observationSets.js'

const router = useRouter()
const isCreating = ref(false)
const errorMessage = ref('')

async function handleCreate() {
  isCreating.value = true
  errorMessage.value = ''
  try {
    const setId = await createObservationSet()
    router.push({ name: 'observation-set', params: { setId } })
  } catch (err) {
    console.error(err)
    errorMessage.value = '建立失敗,請檢查網路連線或 Firebase 設定後再試一次。'
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <main>
    <h1>🍄 蘑菇重生計時器</h1>
    <p>建立一個觀察集,把連結分享給朋友,大家一起上傳截圖記錄蘑菇的重生時間。</p>
    <button :disabled="isCreating" @click="handleCreate">
      {{ isCreating ? '建立中...' : '建立新觀察集' }}
    </button>
    <p v-if="errorMessage" role="alert" style="color: var(--danger)">{{ errorMessage }}</p>
  </main>
</template>

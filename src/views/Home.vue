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
  <main class="home">
    <div class="badge" aria-hidden="true">🍄</div>
    <h1>蘑菇重生計時器</h1>
    <p class="lede">
      建立一個觀察集,把連結分享給朋友,大家一起上傳截圖記錄蘑菇的重生時間。
    </p>

    <button class="cta" type="button" :disabled="isCreating" @click="handleCreate">
      <span v-if="isCreating">🌱 建立中...</span>
      <span v-else>🌼 建立新觀察集</span>
    </button>

    <p v-if="errorMessage" role="alert" class="error">😵 {{ errorMessage }}</p>

    <ul class="feature-list">
      <li><span class="dot dot-coral"></span>上傳截圖,自動辨識剩餘時間</li>
      <li><span class="dot dot-sun"></span>倒數歸零會提醒你「該去採了」</li>
      <li><span class="dot dot-sky"></span>分享連結,跟隊友一起記錄</li>
    </ul>
  </main>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-top: 8px;
  animation: popIn 0.5s ease both;
}

.badge {
  font-size: 4.2rem;
  line-height: 1;
  margin-bottom: 8px;
  filter: drop-shadow(0 8px 14px rgba(46, 90, 30, 0.28));
  animation: bob 3.4s ease-in-out infinite;
}

h1 {
  font-size: 2rem;
  margin-bottom: 6px;
}

.lede {
  max-width: 34ch;
  color: var(--muted);
  font-weight: 500;
}

.cta {
  font-size: 1.05rem;
  padding: 14px 28px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--leaf) 0%, var(--leaf-dark) 100%);
  margin-top: 6px;
}

.error {
  color: var(--danger);
  font-weight: 600;
  margin-top: 12px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 32px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  color: var(--text);
  font-weight: 600;
  font-size: 0.95rem;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-coral {
  background: var(--coral);
}

.dot-sun {
  background: var(--sun);
}

.dot-sky {
  background: var(--sky);
}
</style>

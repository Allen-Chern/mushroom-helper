import { ref, onMounted, onUnmounted } from 'vue'

// 全域共用的 1 秒 tick,對應設計文件 §4.4
export function useCountdownTick(intervalMs = 1000) {
  const now = ref(Date.now())
  let timerId = null

  onMounted(() => {
    timerId = setInterval(() => {
      now.value = Date.now()
    }, intervalMs)
  })

  onUnmounted(() => {
    if (timerId) clearInterval(timerId)
  })

  return { now }
}

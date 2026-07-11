import { ref, watch } from 'vue'

// 主題偏好三態:'system'(預設,跟隨作業系統)/ 'light' / 'dark'。
// 只有使用者明確選過淺/深才寫入 localStorage;選回「系統」就移除鍵值,
// 讓之後作業系統切換時能即時跟上。
const STORAGE_KEY = 'mushroom-helper:theme'

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
export const themePreference = ref(stored === 'light' || stored === 'dark' ? stored : 'system')

const media = window.matchMedia('(prefers-color-scheme: dark)')

function resolvedTheme() {
  if (themePreference.value === 'system') return media.matches ? 'dark' : 'light'
  return themePreference.value
}

// index.html 的 pre-paint script 已先設好 data-theme 避免閃爍,
// 這裡負責之後的所有更新(使用者切換、系統主題變更)
export function applyTheme() {
  document.documentElement.dataset.theme = resolvedTheme()
}

media.addEventListener('change', () => {
  if (themePreference.value === 'system') applyTheme()
})

watch(themePreference, (value) => {
  if (value === 'system') {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, value)
  }
  applyTheme()
})

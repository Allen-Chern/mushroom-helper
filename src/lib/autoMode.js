import { ref, watch } from 'vue'

// 自動模式開關搬進設定 Modal 後,UploadFlow 與 SettingsModal 都需要讀寫,
// 用模組層級的共享 ref 同步兩邊,並持續存回 localStorage
const STORAGE_KEY = 'mushroom-helper:auto-mode'

export const autoMode = ref(localStorage.getItem(STORAGE_KEY) === '1')

watch(autoMode, (value) => localStorage.setItem(STORAGE_KEY, value ? '1' : '0'))

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { themePreference } from '../lib/theme.js'
import { autoMode } from '../lib/autoMode.js'
import NotificationSettings from './NotificationSettings.vue'

const props = defineProps({
  open: { type: Boolean, required: true },
})

const emit = defineEmits(['close'])

const THEME_OPTIONS = [
  { value: 'system', icon: '🌗', label: '系統' },
  { value: 'light', icon: '☀️', label: '淺色' },
  { value: 'dark', icon: '🌙', label: '深色' },
]

const panelRef = ref(null)
const isLinkCopied = ref(false)

const themeIndex = () => THEME_OPTIONS.findIndex((o) => o.value === themePreference.value)

function handleKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

// Modal 開啟時鎖住背景捲動並監聽 Esc;關閉時全部還原
watch(
  () => props.open,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeydown)
      requestAnimationFrame(() => panelRef.value?.focus())
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeydown)
    }
  },
)

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleKeydown)
})

async function handleCopyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    isLinkCopied.value = true
    setTimeout(() => (isLinkCopied.value = false), 2000)
  } catch (err) {
    console.error(err)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
        <div
          ref="panelRef"
          class="modal-panel"
          role="dialog"
          aria-modal="true"
          aria-label="設定"
          tabindex="-1"
        >
          <header class="modal-header">
            <h2>
              <svg class="flower-icon" viewBox="0 0 24 24" aria-hidden="true">
                <g fill="var(--bloom)">
                  <ellipse cx="12" cy="5" rx="3.1" ry="3.6" />
                  <ellipse cx="12" cy="19" rx="3.1" ry="3.6" />
                  <ellipse cx="5.9" cy="8.5" rx="3.1" ry="3.6" transform="rotate(-60 5.9 8.5)" />
                  <ellipse cx="18.1" cy="8.5" rx="3.1" ry="3.6" transform="rotate(60 18.1 8.5)" />
                  <ellipse cx="5.9" cy="15.5" rx="3.1" ry="3.6" transform="rotate(60 5.9 15.5)" />
                  <ellipse cx="18.1" cy="15.5" rx="3.1" ry="3.6" transform="rotate(-60 18.1 15.5)" />
                </g>
                <circle cx="12" cy="12" r="3.4" fill="var(--sun)" />
              </svg>
              設定
            </h2>
            <button type="button" class="close-btn" title="關閉" @click="emit('close')">✕</button>
          </header>

          <section class="settings-section">
            <h3>🎨 外觀</h3>
            <div class="theme-picker" role="radiogroup" aria-label="外觀主題">
              <span class="picker-thumb" :style="{ transform: `translateX(${themeIndex() * 100}%)` }"></span>
              <button
                v-for="option in THEME_OPTIONS"
                :key="option.value"
                type="button"
                class="theme-option"
                :class="{ 'is-active': themePreference === option.value }"
                role="radio"
                :aria-checked="themePreference === option.value"
                @click="themePreference = option.value"
              >
                <span aria-hidden="true">{{ option.icon }}</span>
                {{ option.label }}
              </button>
            </div>
            <p class="section-hint">「系統」會自動跟隨裝置的深淺色設定</p>
          </section>

          <section class="settings-section">
            <h3>⚡ 自動模式</h3>
            <label class="auto-toggle">
              <input v-model="autoMode" type="checkbox" />
              <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
              <span class="toggle-text">辨識成功就直接新增/更新地標,免逐張確認</span>
            </label>
          </section>

          <section class="settings-section">
            <h3>🔔 通知<span class="scope-hint">(僅影響這台裝置)</span></h3>
            <NotificationSettings />
          </section>

          <section class="settings-section">
            <h3>🔗 分享</h3>
            <button type="button" class="share-btn" @click="handleCopyLink">
              {{ isLinkCopied ? '✅ 已複製連結' : '複製分享連結' }}
            </button>
            <p class="section-hint">把連結傳給隊友,大家一起記錄這片森林</p>
          </section>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: color-mix(in srgb, #1c2a12 45%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

@media (min-width: 520px) {
  .modal-backdrop {
    align-items: center;
  }
}

.modal-panel {
  width: 100%;
  max-width: 440px;
  max-height: calc(100svh - 32px);
  overflow-y: auto;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 26px;
  padding: 18px 20px 22px;
  box-shadow: var(--shadow-pop);
  outline: none;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.modal-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1.25rem;
}

.flower-icon {
  width: 26px;
  height: 26px;
  animation: flowerSpin 14s linear infinite;
}

@keyframes flowerSpin {
  to {
    transform: rotate(360deg);
  }
}

/* 註:以下按鈕選擇器都以 `.modal-header button.xxx` 形式墊高權重,
   蓋過全域的 button:not(.icon-btn):not(.delete-btn) 綠色底樣式 */
.modal-header button.close-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border: 2px solid var(--border);
  border-radius: 50%;
  background: var(--card-bg-soft);
  color: var(--muted);
  font-size: 1em;
  box-shadow: none;
}

.modal-header button.close-btn:hover {
  color: #fff;
  background: var(--coral);
  border-color: var(--coral);
}

.settings-section {
  padding: 14px 0;
  border-top: 2px dashed color-mix(in srgb, var(--leaf) 35%, var(--border));
}

.settings-section:first-of-type {
  border-top: none;
}

.settings-section h3 {
  font-size: 0.98rem;
  margin-bottom: 10px;
}

.scope-hint {
  color: var(--muted);
  font-weight: 500;
  font-size: 0.82em;
  margin-left: 4px;
}

.section-hint {
  margin: 8px 0 0;
  font-size: 0.82em;
  font-weight: 500;
  color: var(--muted);
}

/* ---- 主題三段切換:滑動的圓角滑塊 + 三顆等寬選項 ---- */
.theme-picker {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 4px;
  border-radius: 999px;
  border: 2px solid var(--border);
  background: var(--card-bg-soft);
}

.picker-thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 8px) / 3);
  border-radius: 999px;
  background: linear-gradient(180deg, var(--leaf) 0%, var(--leaf-dark) 100%);
  box-shadow: var(--shadow-pop);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.theme-picker button.theme-option {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 4px;
  border: none;
  border-radius: 999px;
  background: none;
  box-shadow: none;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--muted);
  transition: color 0.2s ease;
}

.theme-picker button.theme-option:hover:not(:disabled) {
  filter: none;
  transform: none;
}

.theme-picker button.theme-option:active:not(:disabled) {
  transform: scale(0.96);
  box-shadow: none;
}

.theme-picker button.theme-option.is-active {
  color: #fff;
}

:root[data-theme='dark'] .theme-picker button.theme-option.is-active {
  color: #14210f;
}

/* ---- 自動模式開關(自 UploadFlow 搬入) ---- */
.auto-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.auto-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-track {
  flex-shrink: 0;
  width: 46px;
  height: 26px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted) 35%, transparent);
  padding: 3px;
  transition: background 0.2s ease;
}

.toggle-thumb {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.auto-toggle input:checked + .toggle-track {
  background: linear-gradient(180deg, var(--sun) 0%, var(--sun-dark) 100%);
}

.auto-toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(20px);
}

.auto-toggle input:focus-visible + .toggle-track {
  outline: 3px solid color-mix(in srgb, var(--sky) 60%, transparent);
  outline-offset: 2px;
}

.toggle-text {
  font-size: 0.88em;
  font-weight: 600;
  color: var(--text);
}

.settings-section button.share-btn {
  background: linear-gradient(180deg, var(--sky) 0%, var(--sky-dark) 100%);
  border-radius: 999px;
  font-size: 0.9rem;
  padding: 10px 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), var(--shadow-pop);
}

/* ---- 開闔動畫:背景淡入,面板由下方彈起(桌機為中央縮放彈出) ---- */
.modal-enter-active {
  transition: opacity 0.25s ease;
}

.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-active .modal-panel {
  transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active .modal-panel {
  transition: transform 0.18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateY(28px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .flower-icon {
    animation: none;
  }

  .modal-enter-active .modal-panel,
  .modal-leave-active .modal-panel {
    transition: none;
  }
}
</style>

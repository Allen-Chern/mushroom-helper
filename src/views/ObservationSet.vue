<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { subscribeToItems, deleteItem, updateItem } from '../services/observationSets.js'
import { sortItems } from '../lib/sorting.js'
import { RESPAWN_GRACE_MS } from '../lib/respawn.js'
import { useCountdownTick } from '../composables/useCountdownTick.js'
import { useNotifications } from '../composables/useNotifications.js'
import ItemCard from '../components/ItemCard.vue'
import UploadFlow from '../components/UploadFlow.vue'
import SettingsModal from '../components/SettingsModal.vue'

const props = defineProps({
  setId: { type: String, required: true },
})

const items = ref([])
const isSettingsOpen = ref(false)
const isConfirmingClear = ref(false)
const isClearing = ref(false)
const uploadFlow = ref(null)
let unsubscribe = null
let confirmClearTimer = null

const { now } = useCountdownTick()
useNotifications(items, now)

const sortedItems = computed(() => sortItems(items.value, now.value))
const countingCount = computed(() => items.value.filter((i) => i.status === 'counting').length)
const awaitingCount = computed(
  () => items.value.filter((i) => i.status === 'awaiting_confirmation').length,
)

// 「沒在倒數中」的地標:已重生待確認的那些,可一鍵收成清除
const idleItems = computed(() => items.value.filter((i) => i.status !== 'counting'))

onMounted(() => {
  unsubscribe = subscribeToItems(props.setId, (list) => {
    items.value = list
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
  clearTimeout(confirmClearTimer)
})

// 對應設計文件 §4.4:倒數歸零後再等 RESPAWN_GRACE_MS(5 秒)才把 status 轉為 awaiting_confirmation,
// 讓 ItemCard 的「GO」動畫有實際顯示時間。多人裝置可能同時偵測到同一筆到期,重複寫入同樣的值是無害的。
const transitioningIds = new Set()
watch([items, now], ([list, currentNow]) => {
  for (const item of list) {
    if (
      item.status === 'counting' &&
      currentNow - item.respawnAt >= RESPAWN_GRACE_MS &&
      !transitioningIds.has(item.id)
    ) {
      transitioningIds.add(item.id)
      updateItem(props.setId, item.id, { status: 'awaiting_confirmation' })
        .catch((err) => console.error(err))
        .finally(() => transitioningIds.delete(item.id))
    }
  }
})

async function handleDelete(itemId) {
  try {
    await deleteItem(props.setId, itemId)
  } catch (err) {
    console.error(err)
  }
}

// 兩段式確認:第一下只切換成確認狀態(6 秒沒動作自動還原),再按一次才真的刪
function startConfirmClear() {
  isConfirmingClear.value = true
  clearTimeout(confirmClearTimer)
  confirmClearTimer = setTimeout(() => (isConfirmingClear.value = false), 6000)
}

function cancelConfirmClear() {
  isConfirmingClear.value = false
  clearTimeout(confirmClearTimer)
}

async function handleClearIdle() {
  clearTimeout(confirmClearTimer)
  isClearing.value = true
  try {
    await Promise.all(idleItems.value.map((item) => deleteItem(props.setId, item.id)))
  } catch (err) {
    console.error(err)
  } finally {
    isClearing.value = false
    isConfirmingClear.value = false
  }
}
</script>

<template>
  <main class="observation-set">
    <header class="set-header">
      <div class="set-title">
        <!-- 手繪感的蘑菇看板娘:菇傘吃 --coral、深淺模式都合拍,取代先前的 emoji 圓徽章 -->
        <svg class="title-mushroom" viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <linearGradient id="mh-cap-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--coral)" />
              <stop offset="100%" stop-color="var(--coral-dark)" />
            </linearGradient>
          </defs>
          <!-- 地面小草與陰影 -->
          <ellipse cx="32" cy="58.5" rx="17" ry="3" fill="var(--leaf)" opacity="0.28" />
          <path d="M13 58 C14 51 17 48.5 19.5 44.5 C19 52 17.5 55.5 16 58 Z" fill="var(--leaf)" />
          <path d="M51 58 C50 52 47.5 49.5 45.5 46 C46 52.5 47.5 55.5 49 58 Z" fill="var(--leaf)" />
          <!-- 菇柄與小臉 -->
          <rect x="24" y="33" width="16" height="23" rx="7" fill="#f6ecd4" />
          <circle cx="29" cy="45" r="1.9" fill="#4a3826" />
          <circle cx="35" cy="45" r="1.9" fill="#4a3826" />
          <path d="M30.4 48.4 Q32 50 33.6 48.4" fill="none" stroke="#4a3826" stroke-width="1.3" stroke-linecap="round" />
          <circle cx="25.4" cy="47.8" r="2" fill="#f0949e" opacity="0.65" />
          <circle cx="38.6" cy="47.8" r="2" fill="#f0949e" opacity="0.65" />
          <!-- 菇傘與斑點 -->
          <path
            d="M32 4 C17.5 4 6 15 6 28.5 C6 33.6 10 37 15 37 L49 37 C54 37 58 33.6 58 28.5 C58 15 46.5 4 32 4 Z"
            fill="url(#mh-cap-grad)"
          />
          <circle cx="20" cy="17.5" r="4.4" fill="#fffdf6" opacity="0.95" />
          <circle cx="37.5" cy="10.5" r="3.1" fill="#fffdf6" opacity="0.95" />
          <circle cx="45.5" cy="23" r="3.7" fill="#fffdf6" opacity="0.95" />
          <circle cx="13.5" cy="28" r="2.7" fill="#fffdf6" opacity="0.95" />
          <ellipse cx="26" cy="9.5" rx="6" ry="2.6" fill="#ffffff" opacity="0.3" transform="rotate(-18 26 9.5)" />
        </svg>
        <div class="title-text">
          <h1>觀察集</h1>
          <p class="title-sub">
            <template v-if="items.length > 0">
              🌱 {{ countingCount }} 個倒數中<template v-if="awaitingCount > 0">
                · 🌸 {{ awaitingCount }} 個待採</template
              >
            </template>
            <template v-else>邀請隊友一起記錄這片森林</template>
          </p>
        </div>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="round-btn upload-btn"
          title="上傳截圖(可多選)"
          aria-label="上傳截圖(可多選)"
          :disabled="uploadFlow?.isActive"
          @click="uploadFlow?.openPicker()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 19.5 V8 M6.8 12.6 L12 7.2 L17.2 12.6"
              fill="none"
              stroke="#fff"
              stroke-width="2.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M4.5 21.5 H19.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round" />
          </svg>
        </button>
        <button
          type="button"
          class="round-btn settings-btn"
          title="設定"
          aria-label="設定"
          @click="isSettingsOpen = true"
        >
          <svg class="settings-flower" viewBox="0 0 24 24" aria-hidden="true">
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
        </button>
      </div>
    </header>

    <UploadFlow ref="uploadFlow" :set-id="setId" :existing-items="items" />

    <p v-if="sortedItems.length === 0" class="empty">
      <span class="empty-icon" aria-hidden="true">🌱</span>
      還沒有任何項目,按右上角的
      <svg class="inline-upload-hint" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 19.5 V8 M6.8 12.6 L12 7.2 L17.2 12.6 M4.5 21.5 H19.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      上傳截圖開始記錄吧。
    </p>
    <template v-else>
      <div v-if="idleItems.length > 0" class="list-tools">
        <template v-if="isConfirmingClear">
          <span class="confirm-text">清除 {{ idleItems.length }} 個已重生的地標?</span>
          <button type="button" class="chip chip-danger" :disabled="isClearing" @click="handleClearIdle">
            {{ isClearing ? '清除中...' : '確定清除' }}
          </button>
          <button type="button" class="chip" :disabled="isClearing" @click="cancelConfirmClear">取消</button>
        </template>
        <button v-else type="button" class="chip" @click="startConfirmClear">
          🧺 清除已重生({{ idleItems.length }})
        </button>
      </div>
      <ul class="item-list">
        <ItemCard
          v-for="(item, index) in sortedItems"
          :key="item.id"
          :item="item"
          :now="now"
          :style="{ animationDelay: `${Math.min(index, 8) * 0.06}s` }"
          @delete="handleDelete"
        />
      </ul>
    </template>

    <SettingsModal :open="isSettingsOpen" @close="isSettingsOpen = false" />
  </main>
</template>

<style scoped>
.observation-set {
  animation: popIn 0.4s ease both;
}

.set-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px dashed color-mix(in srgb, var(--leaf) 45%, var(--border));
}

.set-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.title-mushroom {
  flex-shrink: 0;
  width: 54px;
  height: 54px;
  filter: drop-shadow(0 4px 6px rgba(46, 90, 30, 0.25));
  transform-origin: bottom center;
  animation: mushroomSway 5s ease-in-out infinite;
}

@keyframes mushroomSway {
  0%,
  100% {
    transform: rotate(-2.5deg);
  }
  50% {
    transform: rotate(2.5deg);
  }
}

.title-text {
  min-width: 0;
}

.set-header h1 {
  margin: 0;
  font-size: 1.55rem;
  line-height: 1.15;
  letter-spacing: 0.03em;
}

.title-sub {
  margin: 2px 0 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- header 右側的圓形按鈕組:上傳(葉綠)與設定(花朵) ---- */
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.header-actions button.round-btn {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0;
  border-radius: 50%;
  box-shadow: var(--shadow-pop);
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}

.header-actions button.round-btn svg {
  width: 24px;
  height: 24px;
}

.header-actions button.upload-btn {
  border: none;
  background: linear-gradient(180deg, var(--leaf) 0%, var(--leaf-dark) 100%);
}

.header-actions button.settings-btn {
  border: 2px solid var(--border);
  background: var(--card-bg);
}

.header-actions button.settings-btn:hover:not(:disabled) {
  filter: none;
  transform: translateY(-1px);
}

.settings-flower {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.header-actions button.settings-btn:hover .settings-flower {
  transform: rotate(60deg);
}

/* ---- 清除待採地標:列表右上的小竹籃 chip,兩段式確認 ---- */
.list-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  animation: popIn 0.3s ease both;
}

.confirm-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-h);
}

.list-tools button.chip {
  padding: 6px 14px;
  border: 2px dashed var(--border);
  border-radius: 999px;
  background: var(--card-bg-soft);
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
  box-shadow: none;
}

.list-tools button.chip:hover:not(:disabled) {
  filter: none;
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--bloom) 55%, var(--border));
  color: var(--bloom-dark);
}

.list-tools button.chip-danger {
  border-style: solid;
  border-color: var(--coral);
  background: var(--coral);
  color: #fff;
}

.list-tools button.chip-danger:hover:not(:disabled) {
  border-color: var(--coral);
  color: #fff;
  filter: brightness(1.06);
}

.item-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 沒有待採地標(沒有 list-tools)時,列表自己與上方保持原本距離 */
.item-list:first-child,
.upload-flow + .item-list {
  margin-top: 18px;
}

.empty {
  color: var(--muted);
  margin-top: 20px;
  text-align: center;
  font-weight: 600;
  padding: 28px 16px;
  border: 2px dashed var(--border);
  border-radius: 18px;
  background: var(--card-bg-soft);
}

.empty-icon {
  display: block;
  font-size: 2rem;
  margin-bottom: 8px;
}

.inline-upload-hint {
  width: 16px;
  height: 16px;
  vertical-align: -2px;
  color: var(--leaf-dark);
}

@media (prefers-reduced-motion: reduce) {
  .title-mushroom {
    animation: none;
  }

  .settings-flower {
    transition: none;
  }
}
</style>

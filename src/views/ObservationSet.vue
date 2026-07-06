<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { subscribeToItems, deleteItem, updateItem } from '../services/observationSets.js'
import { sortItems } from '../lib/sorting.js'
import { RESPAWN_GRACE_MS } from '../lib/respawn.js'
import { useCountdownTick } from '../composables/useCountdownTick.js'
import { useNotifications } from '../composables/useNotifications.js'
import ItemCard from '../components/ItemCard.vue'
import UploadFlow from '../components/UploadFlow.vue'
import NotificationSettings from '../components/NotificationSettings.vue'

const props = defineProps({
  setId: { type: String, required: true },
})

const items = ref([])
const isLinkCopied = ref(false)
let unsubscribe = null

const { now } = useCountdownTick()
useNotifications(items, now)

const sortedItems = computed(() => sortItems(items.value, now.value))
const countingCount = computed(() => items.value.filter((i) => i.status === 'counting').length)
const awaitingCount = computed(
  () => items.value.filter((i) => i.status === 'awaiting_confirmation').length,
)

onMounted(() => {
  unsubscribe = subscribeToItems(props.setId, (list) => {
    items.value = list
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
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

async function handleCopyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    isLinkCopied.value = true
    setTimeout(() => (isLinkCopied.value = false), 2000)
  } catch (err) {
    console.error(err)
  }
}

async function handleDelete(itemId) {
  try {
    await deleteItem(props.setId, itemId)
  } catch (err) {
    console.error(err)
  }
}
</script>

<template>
  <main class="observation-set">
    <header class="set-header">
      <div class="set-title">
        <span class="title-badge" aria-hidden="true">🍄</span>
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
      <button class="share-btn" type="button" @click="handleCopyLink">
        {{ isLinkCopied ? '✅ 已複製連結' : '🔗 複製分享連結' }}
      </button>
    </header>

    <NotificationSettings />

    <UploadFlow :set-id="setId" :existing-items="items" />

    <p v-if="sortedItems.length === 0" class="empty">
      <span class="empty-icon" aria-hidden="true">🌱</span>
      還沒有任何項目,上傳截圖開始記錄吧。
    </p>
    <ul v-else class="item-list">
      <ItemCard
        v-for="(item, index) in sortedItems"
        :key="item.id"
        :item="item"
        :now="now"
        :style="{ animationDelay: `${Math.min(index, 8) * 0.06}s` }"
        @delete="handleDelete"
      />
    </ul>
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
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px dashed color-mix(in srgb, var(--leaf) 45%, var(--border));
}

.set-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

/* 蘑菇徽章:圓形葉綠底、白邊、微傾斜,像插在花園裡的木牌招牌 */
.title-badge {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  font-size: 1.7rem;
  border-radius: 50% 50% 50% 12%;
  background: linear-gradient(160deg, color-mix(in srgb, var(--leaf) 40%, var(--card-bg)) 0%, var(--leaf-bg) 100%);
  border: 3px solid var(--card-bg);
  box-shadow: var(--shadow-pop);
  transform: rotate(-6deg);
  animation: bob 4.5s ease-in-out infinite;
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

.share-btn {
  background: linear-gradient(180deg, var(--sky) 0%, var(--sky-dark) 100%);
  border-radius: 999px;
  font-size: 0.9rem;
  padding: 10px 16px;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), var(--shadow-pop);
}

@media (prefers-reduced-motion: reduce) {
  .title-badge {
    animation: none;
  }
}

.item-list {
  list-style: none;
  padding: 0;
  margin: 18px 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
</style>

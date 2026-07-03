<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { subscribeToItems, deleteItem, updateItem } from '../services/observationSets.js'
import { sortItems } from '../lib/sorting.js'
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

onMounted(() => {
  unsubscribe = subscribeToItems(props.setId, (list) => {
    items.value = list
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// 對應設計文件 §4.4:倒數歸零時把 status 轉為 awaiting_confirmation。
// 多人裝置可能同時偵測到同一筆到期,重複寫入同樣的值是無害的。
const transitioningIds = new Set()
watch([items, now], ([list, currentNow]) => {
  for (const item of list) {
    if (item.status === 'counting' && item.respawnAt - currentNow <= 0 && !transitioningIds.has(item.id)) {
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
  <main>
    <h1>🍄 觀察集</h1>
    <button type="button" @click="handleCopyLink">
      {{ isLinkCopied ? '✅ 已複製連結' : '🔗 複製分享連結' }}
    </button>

    <NotificationSettings />

    <UploadFlow :set-id="setId" :existing-items="items" />

    <p v-if="sortedItems.length === 0" class="empty">還沒有任何項目,上傳截圖開始記錄吧。</p>
    <ul v-else class="item-list">
      <ItemCard
        v-for="item in sortedItems"
        :key="item.id"
        :item="item"
        :now="now"
        @delete="handleDelete"
      />
    </ul>
  </main>
</template>

<style scoped>
.item-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
}

.empty {
  color: var(--muted);
  margin-top: 16px;
}
</style>

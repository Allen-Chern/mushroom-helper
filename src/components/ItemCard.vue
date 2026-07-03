<script setup>
import { computed } from 'vue'
import { formatRemaining } from '../lib/format.js'

const props = defineProps({
  item: { type: Object, required: true },
  now: { type: Number, required: true },
})

const emit = defineEmits(['delete'])

const remainingMs = computed(() => props.item.respawnAt - props.now)
const isAwaitingConfirmation = computed(() => props.item.status === 'awaiting_confirmation')
</script>

<template>
  <li class="item-card" :class="{ 'is-expired': isAwaitingConfirmation }">
    <div class="item-main">
      <strong class="location-name">{{ item.locationName || '(未命名地點)' }}</strong>
      <span v-if="isAwaitingConfirmation" class="badge">已重生 / 待確認</span>
      <span v-else class="countdown">{{ formatRemaining(remainingMs) }}</span>
    </div>
    <button class="delete-btn" title="刪除" @click="emit('delete', item.id)">✕</button>
  </li>
</template>

<style scoped>
.item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
}

.item-card.is-expired {
  opacity: 0.6;
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.location-name {
  color: var(--text-h);
}

.countdown {
  font-variant-numeric: tabular-nums;
  font-size: 1.1em;
  color: var(--accent);
}

.badge {
  font-size: 0.85em;
  color: var(--muted);
}

.delete-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.1em;
  padding: 4px 8px;
}

.delete-btn:hover {
  color: var(--danger);
}
</style>

<template>
  <div class="w-full bg-[var(--theme-bg-secondary)] px-4 mobile:px-2">
    <!-- Collapsible header — section-title pattern -->
    <button
      class="w-full flex items-center justify-between py-3 mobile:py-2 text-left group"
      @click="toggleCollapsed"
    >
      <div class="flex items-center gap-3">
        <span class="section-title text-[13px] text-[var(--theme-primary)]">
          Sessions
        </span>
        <span class="font-mono-data text-[10px] px-2 py-0.5 rounded border text-[var(--theme-accent-info)] bg-[var(--theme-accent-info)]/10 border-[var(--theme-accent-info)]/30">
          {{ activeSessions.length }} ACTIVE
        </span>
        <span class="font-mono-data text-[10px] text-[var(--theme-text-quaternary)]">
          {{ sessions.length }} total
        </span>
      </div>
      <span class="text-[10px] text-[var(--theme-text-quaternary)] transition-transform duration-200 group-hover:text-[var(--theme-text-tertiary)]" :class="{ 'rotate-180': !collapsed }">
        &#9660;
      </span>
    </button>

    <!-- Cards grid -->
    <Transition name="collapse">
      <div
        v-if="!collapsed"
        class="grid gap-3 mobile:gap-2 pb-4 mobile:pb-2"
        :class="gridCols"
      >
        <SessionOverviewCard
          v-for="session in sessions"
          :key="session.agentId"
          :session="session"
          :app-color="getHexColorForApp(session.sourceApp)"
          @toggle-lane="$emit('toggle-lane', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { SessionInfo } from '../types';
import SessionOverviewCard from './SessionOverviewCard.vue';
import { useEventColors } from '../composables/useEventColors';

const props = defineProps<{
  sessions: SessionInfo[];
}>();

defineEmits<{
  'toggle-lane': [agentId: string];
}>();

const { getHexColorForApp } = useEventColors();

const STORAGE_KEY = 'session-cards-collapsed';
const collapsed = ref(false);

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) collapsed.value = stored === 'true';
});

function toggleCollapsed() {
  collapsed.value = !collapsed.value;
  localStorage.setItem(STORAGE_KEY, String(collapsed.value));
}

const activeSessions = computed(() => props.sessions.filter(s => s.status === 'active'));

const gridCols = computed(() => {
  const count = props.sessions.length;
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
});
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>

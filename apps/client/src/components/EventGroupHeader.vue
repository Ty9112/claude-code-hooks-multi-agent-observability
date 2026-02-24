<template>
  <button
    class="w-full flex items-center gap-2 px-3 py-2 mobile:px-2 mobile:py-1.5 rounded transition-all duration-150"
    :class="expanded
      ? 'bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)]'
      : 'bg-[var(--theme-bg-secondary)] border border-transparent hover:bg-[var(--theme-bg-tertiary)]'"
    :style="{ borderLeftWidth: '2px', borderLeftColor: appColor }"
    @click="$emit('toggle')"
  >
    <!-- Expand/collapse arrow -->
    <span class="text-[9px] text-[var(--theme-text-quaternary)] transition-transform duration-200" :class="{ 'rotate-90': expanded }">
      &#9654;
    </span>

    <!-- Agent name -->
    <span class="font-label text-[11px] font-semibold uppercase tracking-wider truncate" :style="{ color: appColor }">
      {{ agentId }}
    </span>

    <!-- Active/idle indicator -->
    <span class="relative flex h-[6px] w-[6px] shrink-0">
      <span
        v-if="isActive"
        class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        :style="{ backgroundColor: appColor }"
      ></span>
      <span
        class="relative inline-flex rounded-full h-[6px] w-[6px]"
        :style="{ backgroundColor: isActive ? appColor : '#3d5568' }"
      ></span>
    </span>

    <span class="flex-1"></span>

    <!-- Event count badge -->
    <span class="font-mono-data text-[9px] px-1.5 py-0.5 rounded border bg-[var(--theme-bg-secondary)] text-[var(--theme-text-quaternary)] border-[var(--theme-border-primary)]">
      {{ eventCount }}
    </span>

    <!-- Last event time -->
    <span class="font-mono-data text-[9px] text-[var(--theme-text-quaternary)]">
      {{ lastEventAgo }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  agentId: string;
  appColor: string;
  eventCount: number;
  lastEventTime: number;
  isActive: boolean;
  expanded: boolean;
}>();

defineEmits<{
  toggle: [];
}>();

const lastEventAgo = computed(() => {
  const seconds = Math.floor((Date.now() - props.lastEventTime) / 1000);
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
});
</script>

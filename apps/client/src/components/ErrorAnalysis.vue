<template>
  <div class="rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] p-3" style="border-top: 2px solid #ff3f5a;">
    <h3 class="section-title text-[10px] text-[var(--theme-text-quaternary)] mb-2">
      Error Analysis
      <span
        v-if="failureEvents.length > 0"
        class="ml-2 font-mono-data text-[9px] px-1.5 py-0.5 rounded border"
        style="color: #ff3f5a; background: #ff3f5a11; border-color: #ff3f5a44;"
      >
        {{ failureEvents.length }} FAILURES
      </span>
    </h3>

    <!-- Failure rate bars (top section) -->
    <div class="relative mb-2">
      <canvas ref="failureCanvas" class="w-full" :style="{ height: failureBarHeight + 'px' }"></canvas>
    </div>

    <!-- Recent failures list -->
    <div v-if="failureEvents.length === 0" class="font-mono-data text-[11px] text-[var(--theme-text-quaternary)] text-center py-4">
      No failures detected
    </div>
    <div v-else class="max-h-[120px] overflow-y-auto space-y-1 scrollbar-thin">
      <div
        v-for="(evt, i) in failureEvents.slice(0, 20)"
        :key="i"
        class="rounded border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]"
      >
        <button
          class="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-[var(--theme-hover-bg)] transition-colors duration-100"
          @click="toggleExpand(i)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-1.5 h-1.5 rounded-full bg-[#ff3f5a] shrink-0"></span>
            <span class="font-mono-data text-[10px] text-[#ff3f5a] truncate">
              {{ evt.payload?.tool_name || 'Unknown' }}
            </span>
            <span class="font-mono-data text-[9px] text-[var(--theme-text-quaternary)]">
              {{ formatTime(evt.timestamp) }}
            </span>
          </div>
          <span class="text-[9px] text-[var(--theme-text-quaternary)] shrink-0 ml-1">
            {{ expandedIndex === i ? '&#9650;' : '&#9660;' }}
          </span>
        </button>
        <div v-if="expandedIndex === i" class="px-2 pb-2 border-t border-[var(--theme-border-primary)]">
          <pre class="font-mono-data text-[9px] text-[var(--theme-text-tertiary)] whitespace-pre-wrap break-all max-h-[100px] overflow-y-auto mt-1">{{ formatPayload(evt.payload) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue';
import type { HookEvent, ToolStat } from '../types';
import { renderStackedBars } from '../utils/analyticsRenderer';

const props = defineProps<{
  events?: HookEvent[];
  toolStats?: ToolStat[];
}>();

const failureCanvas = ref<HTMLCanvasElement | null>(null);
const expandedIndex = ref<number | null>(null);

const failureEvents = computed(() => {
  const evts = props.events || [];
  return evts
    .filter(e => e.hook_event_type === 'PostToolUseFailure')
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
});

const failureBarData = computed(() => {
  const stats = props.toolStats || [];
  return stats
    .filter(t => t.postToolUseFailureCount > 0)
    .slice(0, 6)
    .map(t => ({
      label: t.toolName,
      success: t.postToolUseCount,
      failure: t.postToolUseFailureCount,
      color: '#ff3f5a',
    }));
});

const failureBarHeight = computed(() => Math.max(60, failureBarData.value.length * 28 + 16));

function toggleExpand(index: number) {
  expandedIndex.value = expandedIndex.value === index ? null : index;
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '--';
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

function formatPayload(payload: any): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function render() {
  if (failureCanvas.value && failureBarData.value.length > 0) {
    renderStackedBars(failureCanvas.value, failureBarData.value);
  }
}

watch([failureBarData], () => {
  nextTick(() => render());
}, { deep: true });

onMounted(() => {
  nextTick(() => render());
});

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  resizeObserver = new ResizeObserver(() => render());
  if (failureCanvas.value) resizeObserver.observe(failureCanvas.value);
});
onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}
</style>

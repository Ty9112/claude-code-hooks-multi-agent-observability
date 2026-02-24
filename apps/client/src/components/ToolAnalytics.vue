<template>
  <div class="w-full bg-[var(--theme-bg-secondary)] px-4 mobile:px-2">
    <!-- Collapsible header -->
    <button
      class="w-full flex items-center justify-between py-3 mobile:py-2 text-left group"
      @click="toggleCollapsed"
    >
      <div class="flex items-center gap-3">
        <span class="section-title text-[13px] text-[var(--theme-primary)]">
          Analytics
        </span>
        <span class="font-mono-data text-[10px] px-2 py-0.5 rounded border text-[var(--theme-text-quaternary)] bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-primary)]">
          {{ analytics.toolStats.length }} TOOLS
        </span>
      </div>
      <span class="text-[10px] text-[var(--theme-text-quaternary)] transition-transform duration-200 group-hover:text-[var(--theme-text-tertiary)]" :class="{ 'rotate-180': !collapsed }">
        &#9660;
      </span>
    </button>

    <!-- Analytics panels -->
    <Transition name="collapse">
      <div v-if="!collapsed" class="pb-4 mobile:pb-2 space-y-3 mobile:space-y-2">
        <!-- Top row: 3 panels -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mobile:gap-2">
          <!-- Panel 1: Tool Frequency -->
          <div class="relative rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] p-3" style="border-top: 2px solid #00c8ff;">
            <h3 class="section-title text-[10px] text-[var(--theme-text-quaternary)] mb-2">Tool Frequency</h3>
            <canvas ref="toolFreqCanvas" class="w-full" :style="{ height: canvasHeight + 'px' }"></canvas>
          </div>

          <!-- Panel 2: Success/Failure Rates -->
          <div class="relative rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] p-3" style="border-top: 2px solid #00e57a;">
            <h3 class="section-title text-[10px] text-[var(--theme-text-quaternary)] mb-2">Success / Failure</h3>
            <canvas ref="successCanvas" class="w-full" :style="{ height: canvasHeight + 'px' }"></canvas>
          </div>

          <!-- Panel 3: Event Type Distribution -->
          <div class="relative rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] p-3" style="border-top: 2px solid #ffaa00;">
            <h3 class="section-title text-[10px] text-[var(--theme-text-quaternary)] mb-2">Event Types</h3>
            <canvas ref="donutCanvas" class="w-full" :style="{ height: canvasHeight + 'px' }"></canvas>
          </div>
        </div>

        <!-- Middle row: 2 panels -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mobile:gap-2">
          <!-- Panel 4: Events/Min Sparkline -->
          <div class="relative rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] p-3" style="border-top: 2px solid #29ADE4;">
            <h3 class="section-title text-[10px] text-[var(--theme-text-quaternary)] mb-2">Events / Min</h3>
            <canvas ref="sparklineCanvas" class="w-full" style="height: 100px"></canvas>
          </div>

          <!-- Panel 5: Most Active Sessions -->
          <div class="relative rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] p-3" style="border-top: 2px solid #a855f7;">
            <h3 class="section-title text-[10px] text-[var(--theme-text-quaternary)] mb-2">Most Active Sessions</h3>
            <canvas ref="sessionsCanvas" class="w-full" :style="{ height: canvasHeight + 'px' }"></canvas>
          </div>
        </div>

        <!-- Row 3: Tool Timeline + Error Analysis -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mobile:gap-2">
          <!-- Panel 6: Tool Timeline -->
          <ToolTimeline :events="events" />

          <!-- Panel 7: Error Analysis -->
          <ErrorAnalysis :events="events" :tool-stats="analytics.toolStats" />
        </div>
      </div>
    </Transition>

    <!-- Tooltip overlay -->
    <div
      v-if="tooltip.visible"
      class="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded text-[11px] font-mono-data shadow-lg border border-[var(--theme-border-secondary)]"
      :style="{
        left: tooltip.x + 12 + 'px',
        top: tooltip.y - 8 + 'px',
        background: 'var(--theme-bg-primary)',
        borderLeft: '3px solid ' + tooltip.accentColor,
      }"
      v-html="tooltip.html"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, onUnmounted } from 'vue';
import type { ToolAnalyticsData, HookEvent } from '../types';
import { useEventColors } from '../composables/useEventColors';
import { useCanvasTooltip } from '../composables/useCanvasTooltip';
import type { CanvasInteractionManager } from '../utils/canvasInteraction';
import {
  renderHorizontalBars,
  renderStackedBars,
  renderDonut,
  renderSparkline
} from '../utils/analyticsRenderer';
import ToolTimeline from './ToolTimeline.vue';
import ErrorAnalysis from './ErrorAnalysis.vue';

const props = defineProps<{
  analytics: ToolAnalyticsData;
  events?: HookEvent[];
}>();

const emit = defineEmits<{
  filter: [payload: { toolName?: string; eventType?: string }];
}>();

const { getHexColorForApp } = useEventColors();
const { tooltip, hoveredId, bindCanvas, setRegions, onClickRegion } = useCanvasTooltip();

// Handle click-to-filter
onClickRegion((region) => {
  if (region.data?.toolName) {
    emit('filter', { toolName: region.data.toolName });
  } else if (region.label && !region.data?.type) {
    emit('filter', { toolName: region.label });
  } else if (region.data?.type === 'arc') {
    emit('filter', { eventType: region.label });
  }
});

const toolFreqCanvas = ref<HTMLCanvasElement | null>(null);
const successCanvas = ref<HTMLCanvasElement | null>(null);
const donutCanvas = ref<HTMLCanvasElement | null>(null);
const sparklineCanvas = ref<HTMLCanvasElement | null>(null);
const sessionsCanvas = ref<HTMLCanvasElement | null>(null);

// Canvas interaction managers
let toolFreqMgr: CanvasInteractionManager | null = null;
let successMgr: CanvasInteractionManager | null = null;
let donutMgr: CanvasInteractionManager | null = null;
let sparklineMgr: CanvasInteractionManager | null = null;
let sessionsMgr: CanvasInteractionManager | null = null;

const STORAGE_KEY = 'analytics-collapsed';
const collapsed = ref(false);

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) collapsed.value = stored === 'true';
});

function toggleCollapsed() {
  collapsed.value = !collapsed.value;
  localStorage.setItem(STORAGE_KEY, String(collapsed.value));
  if (!collapsed.value) {
    nextTick(() => renderAll());
  }
}

// Harris-inspired palette
const palette = [
  '#29ADE4', '#00c8ff', '#00e57a', '#ffaa00', '#ff3f5a',
  '#a855f7', '#14b8a6', '#f97316', '#ec4899', '#6366f1'
];

const canvasHeight = ref(160);

function ensureManagers() {
  if (toolFreqCanvas.value && !toolFreqMgr) toolFreqMgr = bindCanvas(toolFreqCanvas.value);
  if (successCanvas.value && !successMgr) successMgr = bindCanvas(successCanvas.value);
  if (donutCanvas.value && !donutMgr) donutMgr = bindCanvas(donutCanvas.value);
  if (sparklineCanvas.value && !sparklineMgr) sparklineMgr = bindCanvas(sparklineCanvas.value);
  if (sessionsCanvas.value && !sessionsMgr) sessionsMgr = bindCanvas(sessionsCanvas.value);
}

function renderAll() {
  const a = props.analytics;
  ensureManagers();

  if (toolFreqCanvas.value) {
    const items = a.toolStats.slice(0, 8).map((t, i) => ({
      label: t.toolName,
      value: t.preToolUseCount,
      color: palette[i % palette.length]
    }));
    canvasHeight.value = Math.max(120, items.length * 28 + 16);
    nextTick(() => {
      if (toolFreqCanvas.value) {
        const regions = renderHorizontalBars(toolFreqCanvas.value, items, 'Tool Frequency', hoveredId.value);
        if (toolFreqMgr) setRegions(toolFreqMgr, regions);
      }
    });
  }

  if (successCanvas.value) {
    const items = a.toolStats
      .filter(t => t.postToolUseCount + t.postToolUseFailureCount > 0)
      .slice(0, 8)
      .map((t, i) => ({
        label: t.toolName,
        success: t.postToolUseCount,
        failure: t.postToolUseFailureCount,
        color: palette[i % palette.length]
      }));
    const regions = renderStackedBars(successCanvas.value, items, hoveredId.value);
    if (successMgr) setRegions(successMgr, regions);
  }

  if (donutCanvas.value) {
    const items = a.eventDistribution.map((d, i) => ({
      label: d.eventType,
      value: d.count,
      color: palette[i % palette.length]
    }));
    const regions = renderDonut(donutCanvas.value, items, hoveredId.value);
    if (donutMgr) setRegions(donutMgr, regions);
  }

  if (sparklineCanvas.value) {
    const regions = renderSparkline(sparklineCanvas.value, a.eventsPerMinute, '#29ADE4', hoveredId.value);
    if (sparklineMgr) setRegions(sparklineMgr, regions);
  }

  if (sessionsCanvas.value) {
    const items = a.sessionRankings.map(s => ({
      label: s.agentId,
      value: s.eventCount,
      color: getHexColorForApp(s.sourceApp)
    }));
    const regions = renderHorizontalBars(sessionsCanvas.value, items, 'Sessions', hoveredId.value);
    if (sessionsMgr) setRegions(sessionsMgr, regions);
  }
}

// Re-render on hover to show highlight
watch(hoveredId, () => {
  if (!collapsed.value) renderAll();
});

watch(() => props.analytics, () => {
  if (!collapsed.value) {
    nextTick(() => renderAll());
  }
}, { deep: true });

onMounted(() => {
  if (!collapsed.value) {
    nextTick(() => renderAll());
  }
});

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    if (!collapsed.value) renderAll();
  });
  const el = toolFreqCanvas.value?.parentElement?.parentElement?.parentElement;
  if (el) resizeObserver.observe(el);
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
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
  max-height: 1200px;
}
</style>

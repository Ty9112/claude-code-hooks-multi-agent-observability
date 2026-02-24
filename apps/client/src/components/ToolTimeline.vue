<template>
  <div class="rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] p-3" style="border-top: 2px solid #14b8a6;">
    <h3 class="section-title text-[10px] text-[var(--theme-text-quaternary)] mb-2">Tool Timeline</h3>
    <div class="relative">
      <canvas ref="timelineCanvas" class="w-full" style="height: 160px"></canvas>
      <!-- Tooltip -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue';
import type { HookEvent } from '../types';
import { renderMultiLineChart, type TimeSeriesLine } from '../utils/analyticsRenderer';
import { useCanvasTooltip } from '../composables/useCanvasTooltip';
import type { CanvasInteractionManager } from '../utils/canvasInteraction';

const props = defineProps<{
  events?: HookEvent[];
}>();

const timelineCanvas = ref<HTMLCanvasElement | null>(null);
const { tooltip, hoveredId, bindCanvas, setRegions } = useCanvasTooltip();
let manager: CanvasInteractionManager | null = null;

const palette = [
  '#29ADE4', '#00e57a', '#ffaa00', '#ff3f5a', '#a855f7',
  '#14b8a6', '#f97316', '#ec4899', '#6366f1', '#00c8ff'
];

// Compute per-tool time series data
const timeSeriesData = computed<TimeSeriesLine[]>(() => {
  const evts = props.events || [];
  if (evts.length === 0) return [];

  // Count tool usage
  const toolCounts = new Map<string, number>();
  for (const e of evts) {
    const toolName = e.payload?.tool_name;
    if (!toolName) continue;
    toolCounts.set(toolName, (toolCounts.get(toolName) || 0) + 1);
  }

  // Top 5 tools
  const topTools = Array.from(toolCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  if (topTools.length === 0) return [];

  // Build minute-buckets for each tool
  const bucketSize = 60_000; // 1 minute
  const toolBuckets = new Map<string, Map<number, number>>();
  for (const tool of topTools) {
    toolBuckets.set(tool, new Map());
  }

  for (const e of evts) {
    const toolName = e.payload?.tool_name;
    if (!toolName || !topTools.includes(toolName) || !e.timestamp) continue;
    const bucket = Math.floor(e.timestamp / bucketSize) * bucketSize;
    const map = toolBuckets.get(toolName)!;
    map.set(bucket, (map.get(bucket) || 0) + 1);
  }

  // Convert to lines
  return topTools.map((tool, i) => {
    const bucketMap = toolBuckets.get(tool)!;
    const points = Array.from(bucketMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      label: tool,
      color: palette[i % palette.length],
      points,
    };
  });
});

// Derive hovered series from hoveredId
const hoveredSeries = computed(() => {
  const id = hoveredId.value;
  if (!id) return null;
  // Extract series from region data
  for (const line of timeSeriesData.value) {
    if (id.includes(line.label)) return line.label;
  }
  return null;
});

function render() {
  if (!timelineCanvas.value) return;
  if (!manager) manager = bindCanvas(timelineCanvas.value);

  const regions = renderMultiLineChart(
    timelineCanvas.value,
    timeSeriesData.value,
    hoveredSeries.value
  );
  setRegions(manager, regions);
}

watch([timeSeriesData, hoveredId], () => {
  nextTick(() => render());
}, { deep: true });

onMounted(() => {
  nextTick(() => render());
});

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  resizeObserver = new ResizeObserver(() => render());
  if (timelineCanvas.value) resizeObserver.observe(timelineCanvas.value);
});
onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

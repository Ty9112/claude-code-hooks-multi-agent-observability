<template>
  <div class="flex flex-col h-full overflow-hidden bg-[#12122a]">
    <!-- Agent reorder strip -->
    <div v-if="orderedAgents.length > 0" class="flex flex-wrap gap-1.5 px-3 py-2 bg-[#0c1528] border-b border-[var(--theme-border-primary)] shrink-0">
      <div
        v-for="(agent, idx) in orderedAgents"
        :key="agent.agentId"
        class="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider border cursor-grab select-none transition-all duration-100"
        :class="dragOverIndex === idx ? 'scale-105 opacity-70' : ''"
        :style="{
          borderColor: agent.color + '66',
          backgroundColor: agent.color + '1a',
          color: agent.color,
        }"
        draggable="true"
        @dragstart="onDragStart($event, idx)"
        @dragover.prevent="onDragOver(idx)"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop($event, idx)"
        @dragend="onDragEnd"
      >
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: agent.status === 'active' ? agent.color : '#3d5568' }"></span>
        <span class="truncate max-w-[120px]">{{ agent.name }}</span>
        <span v-if="getTaskCount(agent.agentId) > 0" class="ml-0.5 px-1 py-0 rounded-full text-[8px] bg-[var(--theme-primary)] text-[var(--theme-bg-primary)]">
          {{ getTaskCount(agent.agentId) }}
        </span>
      </div>
    </div>

    <!-- Canvas area -->
    <div ref="container" class="flex-1 relative overflow-hidden" style="min-height: 200px;">
      <canvas ref="canvasEl" class="w-full h-full" />
      <div
        v-if="orderedAgents.length === 0"
        class="absolute inset-0 flex items-center justify-center"
      >
        <span class="font-mono-data text-sm text-[var(--theme-text-tertiary)] opacity-60">
          Waiting for agents to arrive...
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { SessionInfo } from '../types';
import { useEventColors } from '../composables/useEventColors';
import { useEventEmojis } from '../composables/useEventEmojis';
import { useAgentAliases } from '../composables/useAgentAliases';
import { useAgentOrder } from '../composables/useAgentOrder';
import { useAgentTasks } from '../composables/useAgentTasks';
import { createOfficeRenderer, type OfficeAgent, type OfficeRenderer } from '../utils/officeRenderer';

const props = defineProps<{
  sessions: SessionInfo[];
}>();

const canvasEl = ref<HTMLCanvasElement>();
const container = ref<HTMLDivElement>();
let renderer: OfficeRenderer | null = null;
let resizeObserver: ResizeObserver | null = null;

const { getHexColorForApp } = useEventColors();
const { getEmojiForToolName } = useEventEmojis();
const { getDisplayName } = useAgentAliases();
const { getOrderedAgents, moveAgent } = useAgentOrder();
const { getTaskCount } = useAgentTasks();

// Map sessions to OfficeAgent[] with aliases and ordering
const agents = computed<OfficeAgent[]>(() =>
  props.sessions.map((s) => ({
    agentId: s.agentId,
    sourceApp: s.sourceApp,
    status: s.status,
    color: getHexColorForApp(s.sourceApp),
    lastToolEmoji: s.lastToolUsed ? getEmojiForToolName(s.lastToolUsed) : '',
    lastToolName: s.lastToolUsed || '',
    eventCount: s.eventCount,
    name: getDisplayName(s.agentId),
  }))
);

const orderedAgents = computed(() => getOrderedAgents(agents.value));

watch(orderedAgents, (val) => {
  renderer?.setAgents(val);
}, { deep: true });

// Drag-and-drop reorder state
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

function onDragStart(e: DragEvent, idx: number) {
  dragIndex.value = idx;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
}

function onDragOver(idx: number) {
  dragOverIndex.value = idx;
}

function onDragLeave() {
  dragOverIndex.value = null;
}

function onDrop(_e: DragEvent, toIdx: number) {
  const fromIdx = dragIndex.value;
  if (fromIdx !== null && fromIdx !== toIdx) {
    const currentIds = orderedAgents.value.map(a => a.agentId);
    moveAgent(currentIds[fromIdx], fromIdx, toIdx, currentIds);
  }
  dragIndex.value = null;
  dragOverIndex.value = null;
}

function onDragEnd() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}

// Renderer lifecycle — init when visible, watch for container
function initRenderer() {
  if (!canvasEl.value || !container.value) return;
  if (renderer) return; // already initialized
  const w = container.value.offsetWidth || 800;
  const h = container.value.offsetHeight || 500;

  renderer = createOfficeRenderer(canvasEl.value, w, h);
  renderer.setAgents(orderedAgents.value);
  renderer.start();

  resizeObserver = new ResizeObserver(() => {
    if (!container.value || !renderer) return;
    const cw = container.value.offsetWidth;
    const ch = container.value.offsetHeight;
    if (cw > 0 && ch > 0) renderer.resize(cw, ch);
  });
  resizeObserver.observe(container.value);
}

function destroyRenderer() {
  renderer?.destroy();
  renderer = null;
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
}

onMounted(async () => {
  await nextTick();
  initRenderer();
});

onUnmounted(() => {
  destroyRenderer();
});
</script>

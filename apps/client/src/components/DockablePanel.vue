<template>
  <!-- Docked: render inline -->
  <div v-if="panel?.docked" class="relative group/panel">
    <!-- Undock button overlay -->
    <div class="absolute top-2 right-2 z-10 opacity-0 group-hover/panel:opacity-100 transition-opacity duration-150 flex gap-1">
      <button
        @click="panelManager.undockPanel(panelId)"
        class="px-2 py-1 rounded text-[9px] font-semibold uppercase tracking-wider border transition-all duration-150 bg-[var(--theme-bg-primary)] border-[var(--theme-border-secondary)] text-[var(--theme-text-quaternary)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
        title="Undock panel"
      >
        UNDOCK
      </button>
    </div>
    <slot />
  </div>

  <!-- Undocked: floating window -->
  <Teleport to="body">
    <div
      v-if="panel && !panel.docked"
      class="fixed"
      :style="{
        left: panel.x + 'px',
        top: panel.y + 'px',
        width: panel.width + 'px',
        height: panel.minimized ? 'auto' : panel.height + 'px',
        zIndex: panel.zIndex,
      }"
      @mousedown="panelManager.bringToFront(panelId)"
    >
      <div
        class="h-full flex flex-col rounded-lg overflow-hidden border border-[var(--theme-border-secondary)] shadow-2xl"
        style="box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 1px rgba(0,200,255,0.15);"
      >
        <!-- Title bar — draggable -->
        <div
          class="flex items-center justify-between px-3 py-2 bg-[#0F1934] border-b border-[var(--theme-border-primary)] cursor-move select-none shrink-0"
          @mousedown.prevent="startDrag"
        >
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)]"></span>
            <span class="font-label text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-text-secondary)]">
              {{ panel.title }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <button
              @click="panelManager.toggleMinimize(panelId)"
              class="w-6 h-5 flex items-center justify-center rounded text-[9px] text-[var(--theme-text-quaternary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors"
              :title="panel.minimized ? 'Expand' : 'Minimize'"
            >
              {{ panel.minimized ? '&#9650;' : '&#9660;' }}
            </button>
            <button
              @click="panelManager.dockPanel(panelId)"
              class="w-6 h-5 flex items-center justify-center rounded text-[9px] text-[var(--theme-text-quaternary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-primary)] transition-colors"
              title="Dock panel"
            >
              DOCK
            </button>
          </div>
        </div>

        <!-- Panel content -->
        <div
          v-show="!panel.minimized"
          class="flex-1 overflow-auto bg-[var(--theme-bg-secondary)]"
        >
          <slot />
        </div>

        <!-- Resize handle (bottom-right corner) -->
        <div
          v-show="!panel.minimized"
          class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          @mousedown.prevent="startResize"
        >
          <svg class="w-3 h-3 text-[var(--theme-text-quaternary)] opacity-50 absolute bottom-0.5 right-0.5" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="6" cy="10" r="1.5" />
            <circle cx="10" cy="6" r="1.5" />
          </svg>
        </div>

        <!-- Resize handle (right edge) -->
        <div
          v-show="!panel.minimized"
          class="absolute top-8 right-0 w-1.5 bottom-4 cursor-e-resize hover:bg-[var(--theme-primary)]/20 transition-colors"
          @mousedown.prevent="startResizeEdge('right')"
        ></div>

        <!-- Resize handle (bottom edge) -->
        <div
          v-show="!panel.minimized"
          class="absolute bottom-0 left-4 right-4 h-1.5 cursor-s-resize hover:bg-[var(--theme-primary)]/20 transition-colors"
          @mousedown.prevent="startResizeEdge('bottom')"
        ></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { usePanelManager } from '../composables/usePanelManager';

const props = defineProps<{
  panelId: string;
  title: string;
  defaultWidth?: number;
  defaultHeight?: number;
}>();

const panelManager = usePanelManager();
const panel = ref(panelManager.getPanel(props.panelId));

onMounted(() => {
  panel.value = panelManager.registerPanel(props.panelId, props.title, {
    width: props.defaultWidth,
    height: props.defaultHeight,
  });
});

// Drag state
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;

function startDrag(e: MouseEvent) {
  if (!panel.value) return;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragOffsetX = panel.value.x;
  dragOffsetY = panel.value.y;

  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - dragStartX;
    const dy = ev.clientY - dragStartY;
    panelManager.updatePosition(
      props.panelId,
      Math.max(0, dragOffsetX + dx),
      Math.max(0, dragOffsetY + dy)
    );
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// Resize state
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartW = 0;
let resizeStartH = 0;

function startResize(e: MouseEvent) {
  if (!panel.value) return;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  resizeStartW = panel.value.width;
  resizeStartH = panel.value.height;

  const onMove = (ev: MouseEvent) => {
    const dw = ev.clientX - resizeStartX;
    const dh = ev.clientY - resizeStartY;
    panelManager.updateSize(props.panelId, resizeStartW + dw, resizeStartH + dh);
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startResizeEdge(edge: 'right' | 'bottom') {
  if (!panel.value) return;
  resizeStartX = 0;
  resizeStartY = 0;
  resizeStartW = panel.value.width;
  resizeStartH = panel.value.height;

  const onMove = (ev: MouseEvent) => {
    if (!resizeStartX) {
      resizeStartX = ev.clientX;
      resizeStartY = ev.clientY;
      return;
    }
    if (edge === 'right') {
      const dw = ev.clientX - resizeStartX;
      panelManager.updateSize(props.panelId, resizeStartW + dw, resizeStartH);
    } else {
      const dh = ev.clientY - resizeStartY;
      panelManager.updateSize(props.panelId, resizeStartW, resizeStartH + dh);
    }
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>

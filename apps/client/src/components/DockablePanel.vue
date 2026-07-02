<template>
  <!-- Hidden panels render nothing -->
  <template v-if="panel && !panel.hidden">

    <!-- ═══════════════════════════════════════════════════
         DOCKED MODE — inline, resizable all edges + corners
         ═══════════════════════════════════════════════════ -->
    <div
      v-if="panel.docked"
      class="relative border-b border-[var(--theme-border-primary)]"
      :style="dockedStyle"
    >
      <!-- Panel header bar — always visible -->
      <div
        class="flex items-center justify-between px-3 h-7 bg-[#0c1528] border-b border-[var(--theme-border-primary)] select-none shrink-0"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="panel.collapsed ? 'bg-[var(--theme-text-quaternary)]' : 'bg-[var(--theme-primary)]'"></span>
          <span class="font-label text-[10px] font-semibold uppercase tracking-wider truncate" :class="panel.collapsed ? 'text-[var(--theme-text-quaternary)]' : 'text-[var(--theme-text-secondary)]'">
            {{ panel.title }}
          </span>
          <!-- Width badge when not full-width -->
          <span
            v-if="panel.dockedWidth !== null && !panel.collapsed"
            class="font-mono-data text-[8px] text-[var(--theme-text-quaternary)] opacity-60"
          >{{ panel.dockedWidth }}px</span>
        </div>
        <div class="flex items-center gap-0.5 shrink-0">
          <!-- Reset width (show only when custom width is set) -->
          <button
            v-if="panel.dockedWidth !== null"
            @click="panelManager.resetDockedWidth(panelId)"
            class="w-5 h-5 flex items-center justify-center text-[var(--theme-text-quaternary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-accent-warning)] transition-colors"
            title="Reset to full width"
          >
            <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 8h12M2 8l3-3M2 8l3 3M14 8l-3-3M14 8l-3 3" />
            </svg>
          </button>
          <!-- Collapse/Expand -->
          <button
            @click="panelManager.toggleCollapse(panelId)"
            class="w-5 h-5 flex items-center justify-center text-[var(--theme-text-quaternary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors"
            :title="panel.collapsed ? 'Expand' : 'Collapse'"
          >
            <svg class="w-3 h-3 transition-transform" :class="panel.collapsed ? '-rotate-90' : ''" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
          <!-- Undock -->
          <button
            @click="panelManager.undockPanel(panelId)"
            class="w-5 h-5 flex items-center justify-center text-[var(--theme-text-quaternary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-primary)] transition-colors"
            title="Undock (float)"
          >
            <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="1" y="1" width="10" height="10" rx="1" />
              <path d="M5 5h9v9H5" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Panel content — visible when not collapsed -->
      <div
        v-show="!panel.collapsed"
        class="overflow-auto bg-[var(--theme-bg-secondary)]"
        :style="{ height: (panel.dockedHeight - 28) + 'px' }"
      >
        <slot />
      </div>

      <!-- Docked resize handles — all 4 edges + 4 corners -->
      <template v-if="!panel.collapsed">
        <!-- Bottom edge -->
        <div class="absolute bottom-0 left-2 right-2 h-1.5 cursor-ns-resize z-10 hover-handle" @mousedown.prevent="startDockedEdge('s')"></div>
        <!-- Top edge -->
        <div class="absolute top-0 left-2 right-2 h-1.5 cursor-ns-resize z-10 hover-handle" @mousedown.prevent="startDockedEdge('n')"></div>
        <!-- Right edge -->
        <div class="absolute top-8 right-0 w-1.5 bottom-2 cursor-ew-resize z-10 hover-handle" @mousedown.prevent="startDockedEdge('e')"></div>
        <!-- Left edge -->
        <div class="absolute top-8 left-0 w-1.5 bottom-2 cursor-ew-resize z-10 hover-handle" @mousedown.prevent="startDockedEdge('w')"></div>
        <!-- Bottom-right corner -->
        <div class="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-20 hover-handle" @mousedown.prevent="startDockedEdge('se')">
          <svg class="w-2.5 h-2.5 text-[var(--theme-text-quaternary)] opacity-40 absolute bottom-0 right-0" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="10" cy="10" r="1.2" /><circle cx="6" cy="10" r="1.2" /><circle cx="10" cy="6" r="1.2" />
          </svg>
        </div>
        <!-- Bottom-left corner -->
        <div class="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-20 hover-handle" @mousedown.prevent="startDockedEdge('sw')"></div>
        <!-- Top-right corner -->
        <div class="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-20 hover-handle" @mousedown.prevent="startDockedEdge('ne')"></div>
        <!-- Top-left corner -->
        <div class="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-20 hover-handle" @mousedown.prevent="startDockedEdge('nw')"></div>
      </template>
    </div>

    <!-- ═══════════════════════════════════════════════════
         FLOATING MODE — draggable, resizable all edges + corners
         ═══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="!panel.docked"
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
          class="h-full flex flex-col overflow-hidden border border-[var(--theme-border-secondary)] shadow-2xl"
          style="box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 1px rgba(0,200,255,0.15);"
        >
          <!-- Title bar — draggable -->
          <div
            class="flex items-center justify-between px-3 py-2 bg-harris-navy border-b border-[var(--theme-border-primary)] cursor-move select-none shrink-0"
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
                class="w-6 h-5 flex items-center justify-center text-[9px] text-[var(--theme-text-quaternary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors"
                :title="panel.minimized ? 'Expand' : 'Minimize'"
              >
                <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                  <path v-if="panel.minimized" d="M4 10l4-4 4 4" />
                  <path v-else d="M4 6l4 4 4-4" />
                </svg>
              </button>
              <button
                @click="panelManager.dockPanel(panelId)"
                class="w-6 h-5 flex items-center justify-center text-[9px] text-[var(--theme-text-quaternary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-primary)] transition-colors"
                title="Dock panel"
              >
                <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="2" width="12" height="12" rx="1" />
                  <path d="M2 6h12" />
                </svg>
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
        </div>

        <!-- Floating resize handles — all 4 edges + 4 corners -->
        <template v-if="!panel.minimized">
          <!-- Bottom edge -->
          <div class="absolute bottom-0 left-3 right-3 h-1.5 cursor-ns-resize z-10 hover-handle" @mousedown.prevent="startFloatEdge('s')"></div>
          <!-- Top edge -->
          <div class="absolute top-0 left-3 right-3 h-1.5 cursor-ns-resize z-10 hover-handle" @mousedown.prevent="startFloatEdge('n')"></div>
          <!-- Right edge -->
          <div class="absolute top-3 right-0 w-1.5 bottom-3 cursor-ew-resize z-10 hover-handle" @mousedown.prevent="startFloatEdge('e')"></div>
          <!-- Left edge -->
          <div class="absolute top-3 left-0 w-1.5 bottom-3 cursor-ew-resize z-10 hover-handle" @mousedown.prevent="startFloatEdge('w')"></div>
          <!-- Bottom-right corner -->
          <div class="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20" @mousedown.prevent="startFloatEdge('se')">
            <svg class="w-3 h-3 text-[var(--theme-text-quaternary)] opacity-40 absolute bottom-0.5 right-0.5" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="10" cy="10" r="1.2" /><circle cx="6" cy="10" r="1.2" /><circle cx="10" cy="6" r="1.2" />
            </svg>
          </div>
          <!-- Bottom-left corner -->
          <div class="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-20 hover-handle" @mousedown.prevent="startFloatEdge('sw')"></div>
          <!-- Top-right corner -->
          <div class="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-20 hover-handle" @mousedown.prevent="startFloatEdge('ne')"></div>
          <!-- Top-left corner -->
          <div class="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-20 hover-handle" @mousedown.prevent="startFloatEdge('nw')"></div>
        </template>
      </div>
    </Teleport>

  </template>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { usePanelManager } from '../composables/usePanelManager';

type Dir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const props = defineProps<{
  panelId: string;
  title: string;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultDockedHeight?: number;
}>();

const panelManager = usePanelManager();
const panel = ref(panelManager.getPanel(props.panelId));

onMounted(() => {
  panel.value = panelManager.registerPanel(props.panelId, props.title, {
    width: props.defaultWidth,
    height: props.defaultHeight,
    dockedHeight: props.defaultDockedHeight,
  });
});

// ── Docked style (supports custom width) ───────────
const dockedStyle = computed(() => {
  if (!panel.value || panel.value.collapsed) return {};
  const s: Record<string, string> = { height: panel.value.dockedHeight + 'px' };
  if (panel.value.dockedWidth !== null) {
    s.width = panel.value.dockedWidth + 'px';
    s.marginInline = 'auto';
  }
  return s;
});

// ── Docked edge/corner resize ──────────────────────
function startDockedEdge(dir: Dir) {
  if (!panel.value) return;
  const startH = panel.value.dockedHeight;
  let initX = 0, initY = 0;

  // Get actual rendered width if dockedWidth is null (full-width)
  const actualW = panel.value.dockedWidth ?? window.innerWidth;

  const resizesH = dir.includes('n') || dir.includes('s');
  const resizesW = dir.includes('e') || dir.includes('w');

  const onMove = (ev: MouseEvent) => {
    if (!initX) { initX = ev.clientX; initY = ev.clientY; return; }
    const dx = ev.clientX - initX;
    const dy = ev.clientY - initY;

    if (resizesH) {
      const dh = dir.includes('s') ? dy : -dy;
      panelManager.updateDockedHeight(props.panelId, startH + dh);
    }
    if (resizesW) {
      const dw = dir.includes('e') ? dx : -dx;
      panelManager.updateDockedWidth(props.panelId, actualW + dw);
    }
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ── Floating drag ──────────────────────────────────
function startDrag(e: MouseEvent) {
  if (!panel.value) return;
  const sx = e.clientX, sy = e.clientY;
  const ox = panel.value.x, oy = panel.value.y;

  const onMove = (ev: MouseEvent) => {
    panelManager.updatePosition(props.panelId, Math.max(0, ox + ev.clientX - sx), Math.max(0, oy + ev.clientY - sy));
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ── Floating edge/corner resize ────────────────────
function startFloatEdge(dir: Dir) {
  if (!panel.value) return;
  const startX = panel.value.x;
  const startY = panel.value.y;
  const startW = panel.value.width;
  const startH = panel.value.height;
  let initMx = 0, initMy = 0;

  const onMove = (ev: MouseEvent) => {
    if (!initMx) { initMx = ev.clientX; initMy = ev.clientY; return; }
    const dx = ev.clientX - initMx;
    const dy = ev.clientY - initMy;

    let newX = startX, newY = startY, newW = startW, newH = startH;

    // Horizontal
    if (dir.includes('e')) {
      newW = startW + dx;
    } else if (dir.includes('w')) {
      newW = startW - dx;
      newX = startX + dx;
    }
    // Vertical
    if (dir.includes('s')) {
      newH = startH + dy;
    } else if (dir.includes('n')) {
      newH = startH - dy;
      newY = startY + dy;
    }

    // Clamp minimums — prevent position from going past the original right/bottom edge
    const minW = 200, minH = 120;
    if (newW < minW) {
      if (dir.includes('w')) newX = startX + startW - minW;
      newW = minW;
    }
    if (newH < minH) {
      if (dir.includes('n')) newY = startY + startH - minH;
      newH = minH;
    }

    panelManager.updatePositionAndSize(props.panelId, Math.max(0, newX), Math.max(0, newY), newW, newH);
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>

<style scoped>
.hover-handle {
  transition: background-color 0.15s;
}
.hover-handle:hover {
  background-color: color-mix(in srgb, var(--theme-primary) 25%, transparent);
}
</style>

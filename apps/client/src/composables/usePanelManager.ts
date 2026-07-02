import { ref, reactive, computed } from 'vue';

export interface PanelState {
  id: string;
  title: string;
  docked: boolean;
  collapsed: boolean;   // collapsed when docked (header only)
  hidden: boolean;      // completely hidden via panel menu
  x: number;
  y: number;
  width: number;
  height: number;
  dockedHeight: number; // height when docked (resizable)
  dockedWidth: number | null; // width when docked (null = 100%)
  zIndex: number;
  minimized: boolean;   // minimized when floating
  order: number;        // display order when docked
}

const STORAGE_KEY = 'panel-manager-state-v4';
let nextZIndex = 100;
let nextOrder = 0;

// Global panel registry — shared across all components
const panels = reactive<Map<string, PanelState>>(new Map());
const initialized = ref(false);

function loadState(): Record<string, Partial<PanelState>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Migrate from v3 if available
    const v3 = localStorage.getItem('panel-manager-state-v3');
    return v3 ? JSON.parse(v3) : {};
  } catch {
    return {};
  }
}

function saveState() {
  const serialized: Record<string, Partial<PanelState>> = {};
  panels.forEach((panel, id) => {
    serialized[id] = {
      docked: panel.docked,
      collapsed: panel.collapsed,
      hidden: panel.hidden,
      x: panel.x,
      y: panel.y,
      width: panel.width,
      height: panel.height,
      dockedHeight: panel.dockedHeight,
      dockedWidth: panel.dockedWidth,
      minimized: panel.minimized,
      order: panel.order,
    };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
}

export function usePanelManager() {
  if (!initialized.value) {
    initialized.value = true;
  }

  function registerPanel(id: string, title: string, defaults?: { width?: number; height?: number; dockedHeight?: number }) {
    if (panels.has(id)) return panels.get(id)!;

    const saved = loadState()[id] || {};
    const defaultDockedH = defaults?.dockedHeight || Math.min(defaults?.height || 350, 400);
    const panel: PanelState = {
      id,
      title,
      docked: saved.docked ?? true,
      collapsed: saved.collapsed ?? false,
      hidden: saved.hidden ?? false,
      x: saved.x ?? 100,
      y: saved.y ?? 100,
      width: saved.width ?? (defaults?.width || 600),
      height: saved.height ?? (defaults?.height || 400),
      dockedHeight: saved.dockedHeight ?? defaultDockedH,
      dockedWidth: saved.dockedWidth ?? null,
      zIndex: nextZIndex++,
      minimized: saved.minimized ?? false,
      order: saved.order ?? nextOrder++,
    };
    panels.set(id, panel);
    return panel;
  }

  function undockPanel(id: string) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.docked = false;
    panel.zIndex = nextZIndex++;
    panel.x = Math.max(40, (window.innerWidth - panel.width) / 2);
    panel.y = Math.max(40, (window.innerHeight - panel.height) / 3);
    saveState();
  }

  function dockPanel(id: string) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.docked = true;
    panel.minimized = false;
    saveState();
  }

  function bringToFront(id: string) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.zIndex = nextZIndex++;
  }

  function updatePosition(id: string, x: number, y: number) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.x = x;
    panel.y = y;
    saveState();
  }

  function updateSize(id: string, width: number, height: number) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.width = Math.max(200, width);
    panel.height = Math.max(120, height);
    saveState();
  }

  /** Update floating panel position + size simultaneously (for left/top edge resize) */
  function updatePositionAndSize(id: string, x: number, y: number, width: number, height: number) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.x = x;
    panel.y = y;
    panel.width = Math.max(200, width);
    panel.height = Math.max(120, height);
    saveState();
  }

  function toggleMinimize(id: string) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.minimized = !panel.minimized;
    saveState();
  }

  function toggleCollapse(id: string) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.collapsed = !panel.collapsed;
    saveState();
  }

  function toggleHidden(id: string) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.hidden = !panel.hidden;
    saveState();
  }

  function updateDockedHeight(id: string, height: number) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.dockedHeight = Math.max(80, height);
    saveState();
  }

  function updateDockedWidth(id: string, width: number | null) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.dockedWidth = width !== null ? Math.max(200, width) : null;
    saveState();
  }

  function resetDockedWidth(id: string) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.dockedWidth = null;
    saveState();
  }

  function collapseAll() {
    panels.forEach(panel => {
      if (panel.docked) panel.collapsed = true;
    });
    saveState();
  }

  function expandAll() {
    panels.forEach(panel => {
      if (panel.docked) panel.collapsed = false;
    });
    saveState();
  }

  function dockAll() {
    panels.forEach(panel => {
      panel.docked = true;
      panel.minimized = false;
    });
    saveState();
  }

  function getPanel(id: string): PanelState | undefined {
    return panels.get(id);
  }

  /** Move a panel to a new order position, shifting others accordingly */
  function reorderPanel(id: string, newOrder: number) {
    const panel = panels.get(id);
    if (!panel) return;

    const sorted = Array.from(panels.values()).sort((a, b) => a.order - b.order);
    const oldIndex = sorted.findIndex(p => p.id === id);
    if (oldIndex < 0) return;

    sorted.splice(oldIndex, 1);
    sorted.splice(Math.max(0, Math.min(newOrder, sorted.length)), 0, panel);

    sorted.forEach((p, i) => { p.order = i; });
    saveState();
  }

  const undockedPanels = computed(() => {
    return Array.from(panels.values()).filter(p => !p.docked);
  });

  const allPanels = computed(() => {
    return Array.from(panels.values());
  });

  /** All panels sorted by their persisted order */
  const orderedPanels = computed(() => {
    return Array.from(panels.values()).sort((a, b) => a.order - b.order);
  });

  return {
    panels,
    registerPanel,
    undockPanel,
    dockPanel,
    bringToFront,
    updatePosition,
    updatePositionAndSize,
    updateSize,
    toggleMinimize,
    toggleCollapse,
    toggleHidden,
    updateDockedHeight,
    updateDockedWidth,
    resetDockedWidth,
    collapseAll,
    expandAll,
    dockAll,
    getPanel,
    reorderPanel,
    undockedPanels,
    allPanels,
    orderedPanels,
  };
}

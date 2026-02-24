import { ref, reactive, computed } from 'vue';

export interface PanelState {
  id: string;
  title: string;
  docked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
}

const STORAGE_KEY = 'panel-manager-state';
let nextZIndex = 100;

// Global panel registry — shared across all components
const panels = reactive<Map<string, PanelState>>(new Map());
const initialized = ref(false);

function loadState(): Record<string, Partial<PanelState>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState() {
  const serialized: Record<string, Partial<PanelState>> = {};
  panels.forEach((panel, id) => {
    serialized[id] = {
      docked: panel.docked,
      x: panel.x,
      y: panel.y,
      width: panel.width,
      height: panel.height,
      minimized: panel.minimized,
    };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
}

export function usePanelManager() {
  if (!initialized.value) {
    initialized.value = true;
  }

  function registerPanel(id: string, title: string, defaults?: { width?: number; height?: number }) {
    if (panels.has(id)) return panels.get(id)!;

    const saved = loadState()[id] || {};
    const panel: PanelState = {
      id,
      title,
      docked: saved.docked ?? true,
      x: saved.x ?? 100,
      y: saved.y ?? 100,
      width: saved.width ?? (defaults?.width || 600),
      height: saved.height ?? (defaults?.height || 400),
      zIndex: nextZIndex++,
      minimized: saved.minimized ?? false,
    };
    panels.set(id, panel);
    return panel;
  }

  function undockPanel(id: string) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.docked = false;
    panel.zIndex = nextZIndex++;
    // Center the floating panel
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
    panel.width = Math.max(300, width);
    panel.height = Math.max(200, height);
    saveState();
  }

  function toggleMinimize(id: string) {
    const panel = panels.get(id);
    if (!panel) return;
    panel.minimized = !panel.minimized;
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

  const undockedPanels = computed(() => {
    return Array.from(panels.values()).filter(p => !p.docked);
  });

  return {
    panels,
    registerPanel,
    undockPanel,
    dockPanel,
    bringToFront,
    updatePosition,
    updateSize,
    toggleMinimize,
    dockAll,
    getPanel,
    undockedPanels,
  };
}

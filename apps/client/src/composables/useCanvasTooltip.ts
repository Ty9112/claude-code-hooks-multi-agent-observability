// Vue composable wrapping CanvasInteractionManager for canvas chart tooltips
import { ref, onUnmounted, type Ref } from 'vue';
import { CanvasInteractionManager, type HitRegion } from '../utils/canvasInteraction';

export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  html: string;
  accentColor: string;
}

export function useCanvasTooltip() {
  const tooltip = ref<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    html: '',
    accentColor: '#29ADE4',
  });

  const hoveredId = ref<string | null>(null);

  const managers: CanvasInteractionManager[] = [];
  let clickHandler: ((region: HitRegion) => void) | null = null;

  function onClickRegion(handler: (region: HitRegion) => void) {
    clickHandler = handler;
  }

  function bindCanvas(canvas: HTMLCanvasElement): CanvasInteractionManager {
    const manager = new CanvasInteractionManager(
      canvas,
      (region, x, y) => {
        if (region) {
          hoveredId.value = region.id;
          const pctText = region.data?.percentage != null
            ? ` (${Math.round(region.data.percentage)}%)`
            : '';
          tooltip.value = {
            visible: true,
            x,
            y,
            html: `<strong>${region.label}</strong>: ${region.value}${pctText}`,
            accentColor: region.color,
          };
        } else {
          hoveredId.value = null;
          tooltip.value = { ...tooltip.value, visible: false };
        }
      },
      (region) => {
        if (clickHandler) clickHandler(region);
      }
    );
    managers.push(manager);
    return manager;
  }

  function setRegions(manager: CanvasInteractionManager, regions: HitRegion[]) {
    manager.setRegions(regions);
  }

  onUnmounted(() => {
    managers.forEach(m => m.destroy());
    managers.length = 0;
  });

  return {
    tooltip: tooltip as Ref<TooltipState>,
    hoveredId: hoveredId as Ref<string | null>,
    bindCanvas,
    setRegions,
    onClickRegion,
  };
}

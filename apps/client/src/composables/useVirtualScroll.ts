import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue';

export interface VirtualScrollOptions<T> {
  items: Ref<T[]> | ComputedRef<T[]>;
  itemHeight: number;
  containerRef: Ref<HTMLElement | null>;
  overscan?: number;
}

export interface VirtualItem<T> {
  item: T;
  index: number;
}

export function useVirtualScroll<T>(options: VirtualScrollOptions<T>) {
  const { items, itemHeight, containerRef, overscan = 5 } = options;

  const scrollTop = ref(0);
  const containerHeight = ref(0);

  const totalHeight = computed(() => items.value.length * itemHeight);

  const startIndex = computed(() => {
    const raw = Math.floor(scrollTop.value / itemHeight) - overscan;
    return Math.max(0, raw);
  });

  const endIndex = computed(() => {
    const visibleCount = Math.ceil(containerHeight.value / itemHeight);
    const raw = Math.floor(scrollTop.value / itemHeight) + visibleCount + overscan;
    return Math.min(items.value.length, raw);
  });

  const visibleItems = computed<VirtualItem<T>[]>(() => {
    const result: VirtualItem<T>[] = [];
    const list = items.value;
    const start = startIndex.value;
    const end = endIndex.value;
    for (let i = start; i < end; i++) {
      result.push({ item: list[i], index: i });
    }
    return result;
  });

  const offsetY = computed(() => startIndex.value * itemHeight);

  function onScroll(e: Event) {
    const el = e.target as HTMLElement;
    scrollTop.value = el.scrollTop;
  }

  // Track container size
  let resizeObserver: ResizeObserver | null = null;

  onMounted(() => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight;
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          containerHeight.value = entry.contentRect.height;
        }
      });
      resizeObserver.observe(containerRef.value);
    }
  });

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });

  /** Scroll container to bottom (for stick-to-bottom behavior) */
  function scrollToEnd() {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  }

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    scrollToEnd,
  };
}

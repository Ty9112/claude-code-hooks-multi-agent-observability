<template>
  <div class="w-full bg-[var(--theme-bg-secondary)] px-4 mobile:px-2 py-2">
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-2">
      <div
        v-for="card in cards"
        :key="card.label"
        class="rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] px-3 py-2.5 transition-transform duration-150 hover:-translate-y-0.5"
        :style="{ borderTop: '3px solid ' + card.color }"
      >
        <div class="section-title text-[9px] text-[var(--theme-text-quaternary)] mb-1">{{ card.label }}</div>
        <div class="font-mono-data text-[18px] font-bold" :style="{ color: card.color }">
          {{ card.display }}
        </div>
        <div class="font-mono-data text-[10px] text-[var(--theme-text-quaternary)] mt-0.5">{{ card.subtitle }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import type { KpiMetrics } from '../composables/useKpiData';
import { useAnimatedValue } from '../composables/useAnimatedValue';

const props = defineProps<{
  metrics: KpiMetrics;
}>();

const totalEventsAnim = useAnimatedValue(0);
const activeAgentsAnim = useAnimatedValue(0);
const toolCallsAnim = useAnimatedValue(0);
const successRateAnim = useAnimatedValue(100);
const eventsPerMinAnim = useAnimatedValue(0);

watch(() => props.metrics, (m) => {
  totalEventsAnim.animateTo(m.totalEvents);
  activeAgentsAnim.animateTo(m.activeAgents);
  toolCallsAnim.animateTo(m.toolCalls);
  successRateAnim.animateTo(m.successRate);
  eventsPerMinAnim.animateTo(Math.round(m.eventsPerMinute * 10));
}, { immediate: true });

const cards = computed(() => [
  {
    label: 'TOTAL EVENTS',
    display: totalEventsAnim.displayValue.value.toLocaleString(),
    subtitle: `${props.metrics.totalAgents} sessions`,
    color: '#29ADE4',
  },
  {
    label: 'ACTIVE AGENTS',
    display: String(activeAgentsAnim.displayValue.value),
    subtitle: `of ${props.metrics.totalAgents} total`,
    color: '#00e57a',
  },
  {
    label: 'TOOL CALLS',
    display: toolCallsAnim.displayValue.value.toLocaleString(),
    subtitle: props.metrics.topTool ? `top: ${props.metrics.topTool}` : 'no tools yet',
    color: '#00c8ff',
  },
  {
    label: 'SUCCESS RATE',
    display: `${successRateAnim.displayValue.value}%`,
    subtitle: `${props.metrics.errorCount} failures`,
    color: props.metrics.successRate >= 90 ? '#00e57a' : props.metrics.successRate >= 70 ? '#ffaa00' : '#ff3f5a',
  },
  {
    label: 'EVENTS / MIN',
    display: (eventsPerMinAnim.displayValue.value / 10).toFixed(1),
    subtitle: 'last 5 min avg',
    color: '#a855f7',
  },
]);
</script>

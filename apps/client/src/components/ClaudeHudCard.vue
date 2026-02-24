<template>
  <div class="w-full bg-[var(--theme-bg-secondary)] px-4 mobile:px-2">
    <div class="rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] p-3" style="border-top: 2px solid #a855f7;">
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <h3 class="section-title text-[10px] text-[var(--theme-text-quaternary)]">Claude HUD</h3>
          <span
            v-if="current?.planName"
            class="font-mono-data text-[9px] px-1.5 py-0.5 rounded border"
            :style="{
              color: '#a855f7',
              background: '#a855f711',
              borderColor: '#a855f744',
            }"
          >
            {{ current.planName }}
          </span>
        </div>
        <span
          v-if="overallStatus !== 'ok'"
          class="font-mono-data text-[9px] px-1.5 py-0.5 rounded"
          :style="{
            color: overallStatus === 'critical' ? '#ff3f5a' : '#ffaa00',
            background: overallStatus === 'critical' ? '#ff3f5a11' : '#ffaa0011',
          }"
        >
          {{ overallStatus === 'critical' ? 'CRITICAL' : 'WARNING' }}
        </span>
      </div>

      <div v-if="!current" class="font-mono-data text-[11px] text-[var(--theme-text-quaternary)] text-center py-4">
        Waiting for HUD data...
      </div>

      <div v-else class="space-y-3">
        <!-- 5-hour usage -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="font-mono-data text-[10px] text-[var(--theme-text-tertiary)]">5h window</span>
            <div class="flex items-center gap-2">
              <span class="font-mono-data text-[11px] font-bold" :style="{ color: statusColor(fiveHourStatus) }">
                {{ current.fiveHour != null ? Math.round(current.fiveHour) + '%' : '--' }}
              </span>
              <span class="font-mono-data text-[9px] text-[var(--theme-text-quaternary)]">
                reset {{ fiveHourCountdown }}
              </span>
            </div>
          </div>
          <canvas ref="fiveHourBar" class="w-full" style="height: 14px"></canvas>
        </div>

        <!-- 7-day usage -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="font-mono-data text-[10px] text-[var(--theme-text-tertiary)]">7d window</span>
            <div class="flex items-center gap-2">
              <span class="font-mono-data text-[11px] font-bold" :style="{ color: statusColor(sevenDayStatus) }">
                {{ current.sevenDay != null ? Math.round(current.sevenDay) + '%' : '--' }}
              </span>
              <span class="font-mono-data text-[9px] text-[var(--theme-text-quaternary)]">
                reset {{ sevenDayCountdown }}
              </span>
            </div>
          </div>
          <canvas ref="sevenDayBar" class="w-full" style="height: 14px"></canvas>
        </div>

        <!-- Historical sparkline -->
        <div v-if="sparklinePoints.length >= 2">
          <div class="flex items-center justify-between mb-1">
            <span class="font-mono-data text-[10px] text-[var(--theme-text-quaternary)]">24h trend (5h window)</span>
          </div>
          <canvas ref="hudSparkline" class="w-full" style="height: 60px"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useHudData } from '../composables/useHudData';
import { renderUsageBar, renderSparkline } from '../utils/analyticsRenderer';

const {
  current,
  history,
  fiveHourStatus,
  sevenDayStatus,
  fiveHourCountdown,
  sevenDayCountdown,
} = useHudData();

const fiveHourBar = ref<HTMLCanvasElement | null>(null);
const sevenDayBar = ref<HTMLCanvasElement | null>(null);
const hudSparkline = ref<HTMLCanvasElement | null>(null);

const overallStatus = computed(() => {
  if (fiveHourStatus.value === 'critical' || sevenDayStatus.value === 'critical') return 'critical';
  if (fiveHourStatus.value === 'warning' || sevenDayStatus.value === 'warning') return 'warning';
  return 'ok';
});

const sparklinePoints = computed(() =>
  history.value
    .filter(h => h.fiveHour != null)
    .map(h => ({ timestamp: h.timestamp, rate: h.fiveHour! }))
);

function statusColor(status: 'ok' | 'warning' | 'critical'): string {
  return { ok: '#00e57a', warning: '#ffaa00', critical: '#ff3f5a' }[status];
}

function renderBars() {
  if (fiveHourBar.value && current.value?.fiveHour != null) {
    renderUsageBar(fiveHourBar.value, current.value.fiveHour, fiveHourStatus.value, '5h');
  }
  if (sevenDayBar.value && current.value?.sevenDay != null) {
    renderUsageBar(sevenDayBar.value, current.value.sevenDay, sevenDayStatus.value, '7d');
  }
  if (hudSparkline.value && sparklinePoints.value.length >= 2) {
    const color = statusColor(fiveHourStatus.value);
    renderSparkline(hudSparkline.value, sparklinePoints.value, color);
  }
}

watch([current, history], () => {
  nextTick(() => renderBars());
}, { deep: true });

onMounted(() => {
  nextTick(() => renderBars());
});

// Countdown timer refresh
let countdownInterval: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  countdownInterval = setInterval(() => {
    // Force reactivity for countdown display
    if (current.value) {
      current.value = { ...current.value };
    }
  }, 30_000);
});
</script>

<template>
  <div
    class="rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] cursor-pointer transition-all duration-150 hover:translate-y-[-2px]"
    :style="{
      borderTopWidth: '2px',
      borderTopColor: appColor,
      boxShadow: session.status === 'active' ? `0 4px 20px ${appColor}22` : 'none'
    }"
    @click="$emit('toggle-lane', session.agentId)"
  >
    <div class="p-3 mobile:p-2.5">
      <!-- Top row: project name + status -->
      <div class="flex items-center justify-between mb-2">
        <span
          class="font-label text-[12px] font-semibold tracking-wider uppercase truncate mr-2"
          :style="{ color: appColor }"
        >
          {{ session.sourceApp }}
        </span>
        <div class="flex items-center gap-2 shrink-0">
          <!-- Model badge -->
          <span
            v-if="session.modelName"
            class="font-mono-data text-[9px] px-1.5 py-0.5 rounded border bg-[var(--theme-bg-secondary)] text-[var(--theme-text-quaternary)] border-[var(--theme-border-primary)]"
          >
            {{ formatModelName(session.modelName) }}
          </span>
          <!-- Status dot -->
          <span class="relative flex h-2 w-2">
            <span
              v-if="session.status === 'active'"
              class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              :style="{ backgroundColor: appColor }"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2"
              :style="{ backgroundColor: session.status === 'active' ? appColor : '#3d5568' }"
            ></span>
          </span>
        </div>
      </div>

      <!-- Session ID -->
      <div class="font-mono-data text-[11px] text-[var(--theme-text-quaternary)] mb-3">
        {{ session.sessionIdShort }}
      </div>

      <!-- Stats grid — monospace values -->
      <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <div>
          <div class="font-label text-[9px] font-semibold uppercase tracking-widest text-[var(--theme-text-quaternary)]">Duration</div>
          <div class="font-mono-data text-[12px] text-[var(--theme-text-primary)]">{{ formatDuration(session.firstEventTime, session.lastEventTime) }}</div>
        </div>
        <div>
          <div class="font-label text-[9px] font-semibold uppercase tracking-widest text-[var(--theme-text-quaternary)]">Events</div>
          <div class="font-mono-data text-[12px] text-[var(--theme-text-primary)]">{{ session.eventCount }}</div>
        </div>
        <div>
          <div class="font-label text-[9px] font-semibold uppercase tracking-widest text-[var(--theme-text-quaternary)]">Tools</div>
          <div class="font-mono-data text-[12px] text-[var(--theme-text-primary)]">{{ session.toolCount }}</div>
        </div>
        <div>
          <div class="font-label text-[9px] font-semibold uppercase tracking-widest text-[var(--theme-text-quaternary)]">Last Tool</div>
          <div class="font-mono-data text-[12px] text-[var(--theme-text-primary)] truncate" :title="session.lastToolUsed || 'None'">
            {{ session.lastToolUsed || '-' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SessionInfo } from '../types';

defineProps<{
  session: SessionInfo;
  appColor: string;
}>();

defineEmits<{
  'toggle-lane': [agentId: string];
}>();

function formatModelName(name: string): string {
  return name
    .replace('claude-', '')
    .replace(/-(\d+)-(\d+)$/, '-$1.$2');
}

function formatDuration(start: number, end: number): string {
  const ms = end - start;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
</script>

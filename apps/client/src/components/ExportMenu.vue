<template>
  <div class="relative" ref="menuRef">
    <button
      @click="open = !open"
      class="px-2.5 py-1.5 mobile:p-1 rounded text-[11px] font-semibold tracking-wide border transition-all duration-150 bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-hover-bg)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
      title="Export data"
    >
      EXPORT
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute right-0 top-full mt-1 w-56 rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] shadow-2xl overflow-hidden"
        style="z-index: 9999; box-shadow: 0 8px 32px rgba(0,0,0,0.5);"
      >
        <div class="p-1.5">
          <div class="px-2 py-1.5 text-[9px] font-label font-semibold uppercase tracking-widest text-[var(--theme-text-quaternary)]">
            Export Data
          </div>

          <button
            @click="handleExport('events-csv')"
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left text-[11px] hover:bg-[var(--theme-bg-tertiary)] transition-colors group"
          >
            <span class="w-5 text-center text-[var(--theme-text-quaternary)] group-hover:text-[var(--theme-accent-info)]">CSV</span>
            <span class="text-[var(--theme-text-secondary)]">Events</span>
            <span class="ml-auto font-mono-data text-[9px] text-[var(--theme-text-quaternary)]">{{ eventCount }} rows</span>
          </button>

          <button
            @click="handleExport('sessions-csv')"
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left text-[11px] hover:bg-[var(--theme-bg-tertiary)] transition-colors group"
          >
            <span class="w-5 text-center text-[var(--theme-text-quaternary)] group-hover:text-[var(--theme-accent-info)]">CSV</span>
            <span class="text-[var(--theme-text-secondary)]">Sessions</span>
            <span class="ml-auto font-mono-data text-[9px] text-[var(--theme-text-quaternary)]">{{ sessionCount }} rows</span>
          </button>

          <button
            @click="handleExport('analytics-csv')"
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left text-[11px] hover:bg-[var(--theme-bg-tertiary)] transition-colors group"
          >
            <span class="w-5 text-center text-[var(--theme-text-quaternary)] group-hover:text-[var(--theme-accent-info)]">CSV</span>
            <span class="text-[var(--theme-text-secondary)]">Analytics</span>
          </button>

          <div class="my-1 border-t border-[var(--theme-border-primary)]"></div>

          <button
            @click="handleExport('json')"
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left text-[11px] hover:bg-[var(--theme-bg-tertiary)] transition-colors group"
          >
            <span class="w-5 text-center text-[var(--theme-text-quaternary)] group-hover:text-[#ffaa00]">JSON</span>
            <span class="text-[var(--theme-text-secondary)]">Full Export</span>
            <span class="ml-auto font-mono-data text-[9px] text-[var(--theme-text-quaternary)]">all data</span>
          </button>

          <button
            @click="handleExport('markdown')"
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left text-[11px] hover:bg-[var(--theme-bg-tertiary)] transition-colors group"
          >
            <span class="w-5 text-center text-[var(--theme-text-quaternary)] group-hover:text-[#a855f7]">MD</span>
            <span class="text-[var(--theme-text-secondary)]">Report</span>
            <span class="ml-auto font-mono-data text-[9px] text-[var(--theme-text-quaternary)]">markdown</span>
          </button>

          <div class="my-1 border-t border-[var(--theme-border-primary)]"></div>

          <button
            @click="handleExport('pdf')"
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left text-[11px] hover:bg-[var(--theme-bg-tertiary)] transition-colors group"
          >
            <span class="w-5 text-center text-[var(--theme-text-quaternary)] group-hover:text-[#ff3f5a]">PDF</span>
            <span class="text-[var(--theme-text-secondary)]">Print / PDF</span>
            <span class="ml-auto font-mono-data text-[9px] text-[var(--theme-text-quaternary)]">browser</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

defineProps<{
  eventCount: number;
  sessionCount: number;
}>();

const emit = defineEmits<{
  export: [type: 'events-csv' | 'sessions-csv' | 'analytics-csv' | 'json' | 'markdown' | 'pdf'];
}>();

const open = ref(false);
const menuRef = ref<HTMLElement>();

function handleExport(type: 'events-csv' | 'sessions-csv' | 'analytics-csv' | 'json' | 'markdown' | 'pdf') {
  emit('export', type);
  open.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside));
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

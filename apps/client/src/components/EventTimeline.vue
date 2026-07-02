<template>
  <div class="flex-1 mobile:h-[50vh] overflow-hidden flex flex-col">
    <!-- Fixed Header — Harris panel style -->
    <div class="px-4 py-3 mobile:py-2 bg-[var(--theme-bg-primary)] relative z-10 border-b border-[var(--theme-border-primary)]" style="box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4);">
      <div class="flex items-center justify-between">
        <h2 class="section-title text-[13px] text-[var(--theme-primary)]">
          Event Stream
        </h2>

        <div class="flex items-center gap-2">
          <!-- Auto-scroll toggle -->
          <button
            @click="emit('update:stickToBottom', !stickToBottom)"
            class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 border"
            :class="stickToBottom
              ? 'bg-[var(--theme-primary)] text-[var(--theme-bg-primary)] border-[var(--theme-primary)]'
              : 'text-[var(--theme-text-quaternary)] border-[var(--theme-border-primary)] hover:text-[var(--theme-text-secondary)] hover:border-[var(--theme-text-quaternary)]'"
            :title="stickToBottom ? 'Auto-scroll is ON — click to pause' : 'Auto-scroll is OFF — click to follow new events'"
          >
            {{ stickToBottom ? 'LIVE' : 'PAUSED' }}
          </button>

          <!-- Flat / Grouped toggle — pill buttons -->
          <div class="flex items-center gap-0.5 bg-[var(--theme-bg-tertiary)] p-0.5 border border-[var(--theme-border-primary)]">
            <button
              @click="setViewMode('flat')"
              class="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150"
              :class="viewMode === 'flat'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-bg-primary)]'
                : 'text-[var(--theme-text-quaternary)] hover:text-[var(--theme-text-secondary)]'"
            >
              Flat
            </button>
            <button
              @click="setViewMode('grouped')"
              class="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150"
              :class="viewMode === 'grouped'
                ? 'bg-[var(--theme-primary)] text-[var(--theme-bg-primary)]'
                : 'text-[var(--theme-text-quaternary)] hover:text-[var(--theme-text-secondary)]'"
            >
              Grouped
            </button>
          </div>
        </div>
      </div>

      <!-- Agent/App Tags Row -->
      <div v-if="displayedAgentIds.length > 0" class="mt-3 flex flex-wrap gap-2 mobile:gap-1.5 justify-start">
        <button
          v-for="agentId in displayedAgentIds"
          :key="agentId"
          @click="emit('selectAgent', agentId)"
          :class="[
            'text-base mobile:text-sm font-bold px-3 mobile:px-2 py-1 border-2 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer',
            isAgentActive(agentId)
              ? 'text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)]'
              : 'text-[var(--theme-text-tertiary)] bg-[var(--theme-bg-tertiary)] opacity-50 hover:opacity-75'
          ]"
          :style="{
            borderColor: getHexColorForApp(getAppNameFromAgentId(agentId)),
            backgroundColor: getHexColorForApp(getAppNameFromAgentId(agentId)) + (isAgentActive(agentId) ? '33' : '1a')
          }"
          :title="`${isAgentActive(agentId) ? 'Active: Click to add' : 'Sleeping: No recent events. Click to add'} ${agentId} to comparison lanes`"
        >
          <span class="mr-2">{{ isAgentActive(agentId) ? '✨' : '😴' }}</span>
          <span class="font-mono text-sm">{{ getDisplayName(agentId) }}</span>
        </button>
      </div>

      <!-- Search Bar -->
      <div class="mt-3 mobile:mt-2 w-full">
        <div class="flex items-center gap-2 mobile:gap-1">
          <div class="relative flex-1">
            <input
              type="text"
              :value="searchPattern"
              @input="updateSearchPattern(($event.target as HTMLInputElement).value)"
              placeholder="Search events (regex enabled)... e.g., 'tool.*error' or '^GET'"
              :class="[
                'w-full px-3 mobile:px-2 py-2 mobile:py-1.5 text-sm mobile:text-xs font-mono border-2 transition-all duration-200',
                'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-quaternary)]',
                'border-[var(--theme-border-primary)] focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20',
                searchError ? 'border-[var(--theme-accent-error)]' : ''
              ]"
              aria-label="Search events with regex pattern"
            />
            <button
              v-if="searchPattern"
              @click="clearSearch"
              class="absolute right-2 top-1/2 transform -translate-y-1/2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)] transition-colors duration-200"
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          </div>
        </div>
        <div
          v-if="searchError"
          class="mt-1.5 mobile:mt-1 px-2 py-1.5 mobile:py-1 bg-[var(--theme-accent-error)]/10 border border-[var(--theme-accent-error)] text-xs mobile:text-[11px] text-[var(--theme-accent-error)] font-semibold"
          role="alert"
        >
          <span class="inline-block mr-1">⚠️</span> {{ searchError }}
        </div>
      </div>
    </div>

    <!-- Scrollable Event List -->
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto px-3 py-3 mobile:px-2 mobile:py-1.5 relative"
      @scroll="handleScroll"
    >
      <!-- Flat Mode — virtual scrolled -->
      <template v-if="viewMode === 'flat'">
        <div :style="{ height: totalHeight + 'px', position: 'relative' }">
          <div :style="{ transform: `translateY(${offsetY}px)` }">
            <div
              v-for="{ item: event } in visibleItems"
              :key="`${event.id}-${event.timestamp}`"
              :style="{ height: ITEM_HEIGHT + 'px', boxSizing: 'border-box', paddingBottom: '8px' }"
            >
              <EventRow
                :event="event"
                :gradient-class="getGradientForSession(event.session_id)"
                :color-class="getColorForSession(event.session_id)"
                :app-gradient-class="getGradientForApp(event.source_app)"
                :app-color-class="getColorForApp(event.source_app)"
                :app-hex-color="getHexColorForApp(event.source_app)"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- Grouped Mode -->
      <template v-else>
        <div class="space-y-3 mobile:space-y-2">
          <div v-for="group in groupedEvents" :key="group.agentId">
            <EventGroupHeader
              :agent-id="group.agentId"
              :app-color="getHexColorForApp(group.sourceApp)"
              :event-count="group.events.length"
              :last-event-time="group.lastEventTime"
              :is-active="isAgentActive(group.agentId)"
              :expanded="expandedGroups.has(group.agentId)"
              @toggle="toggleGroup(group.agentId)"
            />
            <Transition name="collapse">
              <div v-if="expandedGroups.has(group.agentId)" class="mt-1 ml-4 mobile:ml-2 space-y-2 mobile:space-y-1.5 border-l pl-3 mobile:pl-2" :style="{ borderColor: getHexColorForApp(group.sourceApp) + '4d' }">
                <EventRow
                  v-for="event in group.events"
                  :key="`${event.id}-${event.timestamp}`"
                  :event="event"
                  :gradient-class="getGradientForSession(event.session_id)"
                  :color-class="getColorForSession(event.session_id)"
                  :app-gradient-class="getGradientForApp(event.source_app)"
                  :app-color-class="getColorForApp(event.source_app)"
                  :app-hex-color="getHexColorForApp(event.source_app)"
                />
              </div>
            </Transition>
          </div>
        </div>
      </template>

      <div v-if="filteredEvents.length === 0" class="text-center py-8 mobile:py-6 text-[var(--theme-text-tertiary)]">
        <div class="text-4xl mobile:text-3xl mb-3">🔳</div>
        <p class="text-lg mobile:text-base font-semibold text-[var(--theme-primary)] mb-1.5">No events to display</p>
        <p class="text-base mobile:text-sm">Events will appear here as they are received</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import type { HookEvent } from '../types';
import EventRow from './EventRow.vue';
import EventGroupHeader from './EventGroupHeader.vue';
import { useEventColors } from '../composables/useEventColors';
import { useEventSearch } from '../composables/useEventSearch';
import { useVirtualScroll } from '../composables/useVirtualScroll';
import { useAgentAliases } from '../composables/useAgentAliases';

const ITEM_HEIGHT = 72; // px per EventRow (measured ~68-76px)

const props = defineProps<{
  events: HookEvent[];
  filters: {
    sourceApp: string;
    sessionId: string;
    eventType: string;
  };
  stickToBottom: boolean;
  uniqueAppNames?: string[]; // Agent IDs (app:session) active in current time window
  allAppNames?: string[]; // All agent IDs (app:session) ever seen in session
}>();

const emit = defineEmits<{
  'update:stickToBottom': [value: boolean];
  selectAgent: [agentName: string];
}>();

const scrollContainer = ref<HTMLElement | null>(null);
const { getGradientForSession, getColorForSession, getGradientForApp, getColorForApp, getHexColorForApp } = useEventColors();
const { searchPattern, searchError, searchEvents, updateSearchPattern, clearSearch } = useEventSearch();
const { getDisplayName } = useAgentAliases();

// View mode: flat or grouped
const VIEW_MODE_KEY = 'event-timeline-view-mode';
const viewMode = ref<'flat' | 'grouped'>('flat');

onMounted(() => {
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  if (stored === 'flat' || stored === 'grouped') viewMode.value = stored;
});

function setViewMode(mode: 'flat' | 'grouped') {
  viewMode.value = mode;
  localStorage.setItem(VIEW_MODE_KEY, mode);
}

// Expanded groups tracking
const expandedGroups = ref(new Set<string>());

function toggleGroup(agentId: string) {
  if (expandedGroups.value.has(agentId)) {
    expandedGroups.value.delete(agentId);
  } else {
    expandedGroups.value.add(agentId);
  }
  // Force reactivity
  expandedGroups.value = new Set(expandedGroups.value);
}

// Use all agent IDs, preferring allAppNames if available (all ever seen), fallback to uniqueAppNames (active in time window)
const displayedAgentIds = computed(() => {
  return props.allAppNames?.length ? props.allAppNames : (props.uniqueAppNames || []);
});

// Extract app name from agent ID (format: "app:session")
const getAppNameFromAgentId = (agentId: string): string => {
  return agentId.split(':')[0];
};

// Check if an agent is currently active (has events in the current time window)
const isAgentActive = (agentId: string): boolean => {
  return (props.uniqueAppNames || []).includes(agentId);
};

const filteredEvents = computed(() => {
  let filtered = props.events.filter(event => {
    if (props.filters.sourceApp && event.source_app !== props.filters.sourceApp) {
      return false;
    }
    if (props.filters.sessionId && event.session_id !== props.filters.sessionId) {
      return false;
    }
    if (props.filters.eventType && event.hook_event_type !== props.filters.eventType) {
      return false;
    }
    return true;
  });

  // Apply regex search filter
  if (searchPattern.value) {
    filtered = searchEvents(filtered, searchPattern.value);
  }

  return filtered;
});

// Virtual scroll for flat mode
const { visibleItems, totalHeight, offsetY, onScroll: vsOnScroll, scrollToEnd } = useVirtualScroll({
  items: filteredEvents,
  itemHeight: ITEM_HEIGHT,
  containerRef: scrollContainer,
  overscan: 5,
});

// Grouped events by agent
interface EventGroup {
  agentId: string;
  sourceApp: string;
  lastEventTime: number;
  events: HookEvent[];
}

const groupedEvents = computed<EventGroup[]>(() => {
  const groups = new Map<string, EventGroup>();

  for (const event of filteredEvents.value) {
    const agentId = `${event.source_app}:${event.session_id.slice(0, 8)}`;
    let group = groups.get(agentId);
    if (!group) {
      group = {
        agentId,
        sourceApp: event.source_app,
        lastEventTime: 0,
        events: []
      };
      groups.set(agentId, group);
    }
    group.events.push(event);
    if (event.timestamp && event.timestamp > group.lastEventTime) {
      group.lastEventTime = event.timestamp;
    }
  }

  // Sort: active first, then by last event time
  const result = Array.from(groups.values()).sort((a, b) => {
    const aActive = isAgentActive(a.agentId);
    const bActive = isAgentActive(b.agentId);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return b.lastEventTime - a.lastEventTime;
  });

  return result;
});

// Auto-expand active groups on first appearance
watch(groupedEvents, (groups) => {
  for (const group of groups) {
    if (isAgentActive(group.agentId) && !expandedGroups.value.has(group.agentId)) {
      expandedGroups.value.add(group.agentId);
      expandedGroups.value = new Set(expandedGroups.value);
    }
  }
}, { immediate: true });

const handleScroll = (e: Event) => {
  // Forward to virtual scroll
  vsOnScroll(e);

  if (!scrollContainer.value) return;

  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

  if (isAtBottom !== props.stickToBottom) {
    emit('update:stickToBottom', isAtBottom);
  }
};

watch(() => props.events.length, async () => {
  if (props.stickToBottom) {
    await nextTick();
    scrollToEnd();
  }
});

watch(() => props.stickToBottom, (shouldStick) => {
  if (shouldStick) {
    scrollToEnd();
  }
});
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 5000px;
}
</style>

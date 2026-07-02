<template>
  <div class="h-screen flex flex-col bg-[var(--theme-bg-secondary)]">
    <!-- Header — Navy bar inspired by Harris 3D Viewer ribbon -->
    <header class="short:hidden bg-[#0F1934] shadow-lg border-b border-[var(--theme-border-primary)]" style="box-shadow: 0 2px 16px rgba(0,0,0,.35);">
      <div class="px-4 py-3 mobile:py-1.5 mobile:px-2 flex items-center justify-between mobile:gap-2">
        <!-- Title Section - Hidden on mobile -->
        <div class="mobile:hidden flex items-center gap-3">
          <div class="w-8 h-8 rounded flex items-center justify-center bg-[#29ADE4] font-label font-bold text-white text-sm">H</div>
          <div>
            <h1 class="font-label text-lg font-bold text-[#e8f4ff] tracking-wide uppercase" style="letter-spacing: 0.04em;">
              Mission Control
            </h1>
            <div class="font-mono-data text-[10px] text-[#3d5568] tracking-wider">MULTI-AGENT OBSERVABILITY</div>
          </div>
        </div>

        <!-- Connection Status — fabrication-mcp dot style -->
        <div class="flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            <span
              v-if="isConnected"
              class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style="background: #00e57a;"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2"
              :style="{ background: isConnected ? '#00e57a' : '#ff3f5a' }"
            ></span>
          </span>
          <span class="font-mono-data text-[11px] mobile:hidden" :style="{ color: isConnected ? '#00e57a' : '#ff3f5a' }">
            {{ isConnected ? 'Online' : 'Offline' }}
          </span>
        </div>

        <!-- Event Count + Actions — fabrication-mcp button style -->
        <div class="flex items-center gap-2">
          <span class="font-mono-data text-xs px-2.5 py-1 rounded border text-[#00c8ff] bg-[#00c8ff11] border-[#00c8ff44]">
            {{ events.length }}
          </span>

          <button
            @click="handleClearClick"
            class="px-2.5 py-1.5 mobile:p-1 rounded text-[11px] font-semibold tracking-wide border transition-all duration-150 bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-hover-bg)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
            title="Clear events"
          >
            CLEAR
          </button>

          <button
            @click="showFilters = !showFilters"
            class="px-2.5 py-1.5 mobile:p-1 rounded text-[11px] font-semibold tracking-wide border transition-all duration-150 bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-hover-bg)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
            :title="showFilters ? 'Hide filters' : 'Show filters'"
          >
            FILTERS
          </button>

          <ExportMenu
            :event-count="events.length"
            :session-count="sessions.length"
            @export="handleExport"
          />

          <button
            v-if="panelManager.undockedPanels.value.length > 0"
            @click="panelManager.dockAll()"
            class="px-2.5 py-1.5 mobile:p-1 rounded text-[11px] font-semibold tracking-wide border transition-all duration-150 bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-secondary)] text-[var(--theme-accent-warning)] hover:bg-[var(--theme-hover-bg)] hover:border-[var(--theme-accent-warning)]"
            title="Dock all floating panels"
          >
            DOCK ALL
          </button>

          <!-- Panel menu dropdown -->
          <div class="relative">
            <button
              @click="showPanelMenu = !showPanelMenu"
              class="px-2.5 py-1.5 mobile:p-1 rounded text-[11px] font-semibold tracking-wide border transition-all duration-150 bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-hover-bg)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
              title="Panel visibility & layout"
            >
              PANELS
            </button>
            <div
              v-if="showPanelMenu"
              class="absolute right-0 top-full mt-1 w-56 rounded-lg border border-[var(--theme-border-secondary)] bg-[#0c1528] shadow-xl z-50 py-1"
              style="box-shadow: 0 8px 32px rgba(0,0,0,0.5);"
            >
              <!-- Quick actions -->
              <div class="flex gap-1 px-2 py-1.5 border-b border-[var(--theme-border-primary)]">
                <button
                  @click="panelManager.expandAll()"
                  class="flex-1 px-2 py-1 rounded text-[9px] font-semibold uppercase tracking-wider border border-[var(--theme-border-secondary)] text-[var(--theme-text-quaternary)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition-colors"
                >EXPAND ALL</button>
                <button
                  @click="panelManager.collapseAll()"
                  class="flex-1 px-2 py-1 rounded text-[9px] font-semibold uppercase tracking-wider border border-[var(--theme-border-secondary)] text-[var(--theme-text-quaternary)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition-colors"
                >COLLAPSE ALL</button>
              </div>
              <!-- Panel list (ordered) -->
              <div
                v-for="p in panelManager.orderedPanels.value"
                :key="p.id"
                class="flex items-center justify-between px-3 py-1.5 hover:bg-[var(--theme-hover-bg)] transition-colors cursor-pointer"
                @click="panelManager.toggleHidden(p.id)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    :class="p.hidden ? 'bg-[var(--theme-text-quaternary)] opacity-30' : (p.docked ? 'bg-[var(--theme-primary)]' : 'bg-[var(--theme-accent-warning)]')"
                  ></span>
                  <span class="font-label text-[10px] uppercase tracking-wider truncate" :class="p.hidden ? 'text-[var(--theme-text-quaternary)] line-through' : 'text-[var(--theme-text-secondary)]'">
                    {{ p.title }}
                  </span>
                </div>
                <span v-if="!p.docked && !p.hidden" class="text-[8px] text-[var(--theme-accent-warning)] font-mono uppercase">float</span>
                <span v-if="p.collapsed && !p.hidden" class="text-[8px] text-[var(--theme-text-quaternary)] font-mono uppercase">min</span>
              </div>
            </div>
          </div>

          <button
            @click="handleThemeManagerClick"
            class="px-2.5 py-1.5 mobile:p-1 rounded text-[11px] font-semibold tracking-wide border transition-all duration-150 bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-hover-bg)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
            title="Open theme manager"
          >
            THEMES
          </button>
        </div>
      </div>
    </header>

    <!-- Filters -->
    <FilterPanel
      v-if="showFilters"
      class="short:hidden"
      :filters="filters"
      @update:filters="filters = $event"
    />

    <!-- Live Pulse Chart -->
    <LivePulseChart
      :events="events"
      :filters="filters"
      @update-unique-apps="uniqueAppNames = $event"
      @update-all-apps="allAppNames = $event"
      @update-time-range="currentTimeRange = $event"
    />

    <!-- KPI Row -->
    <KpiRow :metrics="kpiMetrics" />

    <!-- Dockable Panels — dynamic order from panelManager -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden" @click="showPanelMenu = false">
      <template v-for="pDef in sortedPanelDefs" :key="pDef.id">
        <!-- Sessions -->
        <DockablePanel v-if="pDef.id === 'sessions'" panel-id="sessions" title="Sessions" :default-width="700" :default-height="350" :default-docked-height="200">
          <SessionOverviewCards
            v-if="sessions.length > 0"
            :sessions="sessions"
            @toggle-lane="toggleAgentLane"
          />
        </DockablePanel>

        <!-- Agent Teams (conditional) -->
        <DockablePanel v-else-if="pDef.id === 'agent-teams' && hasTeamActivity" panel-id="agent-teams" title="Agent Teams" :default-width="800" :default-height="450" :default-docked-height="320">
          <AgentTeamsPanel
            :tasks="tasks"
            :team-agents="teamAgents"
            :messages="messages"
            :team-name="teamName"
            @select-agent="toggleAgentLane"
          />
        </DockablePanel>

        <!-- Swim Lanes -->
        <DockablePanel v-else-if="pDef.id === 'swim-lanes'" panel-id="swim-lanes" title="Swim Lanes" :default-width="900" :default-height="450" :default-docked-height="300">
          <div v-if="selectedAgentLanes.length > 0" class="w-full bg-[var(--theme-bg-secondary)] px-3 py-4 mobile:px-2 mobile:py-2 overflow-hidden">
            <AgentSwimLaneContainer
              :selected-agents="selectedAgentLanes"
              :events="events"
              :time-range="currentTimeRange"
              @update:selected-agents="selectedAgentLanes = $event"
            />
          </div>
        </DockablePanel>

        <!-- Claude HUD -->
        <DockablePanel v-else-if="pDef.id === 'hud'" panel-id="hud" title="Claude HUD" :default-width="400" :default-height="300" :default-docked-height="180">
          <ClaudeHudCard />
        </DockablePanel>

        <!-- Analytics -->
        <DockablePanel v-else-if="pDef.id === 'analytics'" panel-id="analytics" title="Analytics" :default-width="900" :default-height="500" :default-docked-height="350">
          <ToolAnalytics
            v-if="events.length > 0"
            :analytics="analytics"
            :events="events"
            @filter="handleAnalyticsFilter"
          />
        </DockablePanel>

        <!-- Toolkit -->
        <DockablePanel v-else-if="pDef.id === 'toolkit'" panel-id="toolkit" title="Toolkit" :default-width="850" :default-height="500" :default-docked-height="350">
          <ToolkitPanel />
        </DockablePanel>

        <!-- Event Stream -->
        <DockablePanel v-else-if="pDef.id === 'timeline'" panel-id="timeline" title="Event Stream" :default-width="700" :default-height="500" :default-docked-height="400">
          <div class="flex flex-col flex-1 overflow-hidden h-full">
            <EventTimeline
              :events="events"
              :filters="filters"
              :unique-app-names="uniqueAppNames"
              :all-app-names="allAppNames"
              v-model:stick-to-bottom="stickToBottom"
              @select-agent="toggleAgentLane"
            />
          </div>
        </DockablePanel>

        <!-- Agent Office (now a dockable panel) -->
        <DockablePanel v-else-if="pDef.id === 'agent-office'" panel-id="agent-office" title="Agent Office" :default-width="900" :default-height="600" :default-docked-height="400">
          <AgentOffice :sessions="sessions" />
        </DockablePanel>
      </template>
    </div>

    <!-- Stick to bottom button -->
    <StickScrollButton
      class="short:hidden"
      :stick-to-bottom="stickToBottom"
      @toggle="stickToBottom = !stickToBottom"
    />

    <!-- Error message -->
    <div
      v-if="error"
      class="fixed bottom-4 left-4 mobile:bottom-3 mobile:left-3 mobile:right-3 bg-red-100 border border-red-400 text-red-700 px-3 py-2 mobile:px-2 mobile:py-1.5 rounded mobile:text-xs"
    >
      {{ error }}
    </div>

    <!-- Theme Manager -->
    <ThemeManager
      :is-open="showThemeManager"
      @close="showThemeManager = false"
    />

    <!-- Toast Notifications -->
    <ToastNotification
      v-for="(toast, index) in toasts"
      :key="toast.id"
      :index="index"
      :agent-name="toast.agentName"
      :agent-color="toast.agentColor"
      @dismiss="dismissToast(toast.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { TimeRange } from './types';
import { useWebSocket } from './composables/useWebSocket';
import { useThemes } from './composables/useThemes';
import { useEventColors } from './composables/useEventColors';
import { useSessionTracker } from './composables/useSessionTracker';
import { useToolAnalytics } from './composables/useToolAnalytics';
import { useKpiData } from './composables/useKpiData';
import { usePanelManager } from './composables/usePanelManager';
import { useTeamOrchestration } from './composables/useTeamOrchestration';
import { exportEventsCSV, exportSessionsCSV, exportAnalyticsCSV, exportJSON, exportPDF, exportMarkdownReport } from './composables/useExport';
import EventTimeline from './components/EventTimeline.vue';
import FilterPanel from './components/FilterPanel.vue';
import StickScrollButton from './components/StickScrollButton.vue';
import LivePulseChart from './components/LivePulseChart.vue';
import ThemeManager from './components/ThemeManager.vue';
import ToastNotification from './components/ToastNotification.vue';
import AgentSwimLaneContainer from './components/AgentSwimLaneContainer.vue';
import SessionOverviewCards from './components/SessionOverviewCards.vue';
import ToolAnalytics from './components/ToolAnalytics.vue';
import KpiRow from './components/KpiRow.vue';
import ClaudeHudCard from './components/ClaudeHudCard.vue';
import DockablePanel from './components/DockablePanel.vue';
import ExportMenu from './components/ExportMenu.vue';
import AgentTeamsPanel from './components/AgentTeamsPanel.vue';
import AgentOffice from './components/AgentOffice.vue';
import ToolkitPanel from './components/ToolkitPanel.vue';
import { WS_URL } from './config';

// WebSocket connection
const { events, isConnected, error, clearEvents } = useWebSocket(WS_URL);

// Theme management (sets up theme system)
useThemes();

// Event colors
const { getHexColorForApp } = useEventColors();

// Session tracking
const { sessions } = useSessionTracker(() => events.value);

// Tool analytics
const { analytics } = useToolAnalytics(() => events.value);

// KPI metrics
const { metrics: kpiMetrics } = useKpiData(
  () => events.value,
  () => analytics.value,
  () => sessions.value
);

// Team orchestration
const { tasks, teamAgents, messages, teamName, hasTeamActivity } = useTeamOrchestration(() => events.value);

// Panel management
const panelManager = usePanelManager();

// Panel definitions — order is the default, persisted order overrides
const panelDefs = [
  { id: 'sessions' },
  { id: 'agent-teams' },
  { id: 'swim-lanes' },
  { id: 'hud' },
  { id: 'analytics' },
  { id: 'toolkit' },
  { id: 'timeline' },
  { id: 'agent-office' },
];

const sortedPanelDefs = computed(() => {
  return [...panelDefs].sort((a, b) => {
    const pa = panelManager.getPanel(a.id);
    const pb = panelManager.getPanel(b.id);
    return (pa?.order ?? 999) - (pb?.order ?? 999);
  });
});

// Filters
const filters = ref({
  sourceApp: '',
  sessionId: '',
  eventType: ''
});

// UI state
const stickToBottom = ref(true);
const showThemeManager = ref(false);
const showFilters = ref(false);
const showPanelMenu = ref(false);
const uniqueAppNames = ref<string[]>([]); // Apps active in current time window
const allAppNames = ref<string[]>([]); // All apps ever seen in session
const selectedAgentLanes = ref<string[]>([]);
const currentTimeRange = ref<TimeRange>('1m'); // Current time range from LivePulseChart

// Toast notifications
interface Toast {
  id: number;
  agentName: string;
  agentColor: string;
}
const toasts = ref<Toast[]>([]);
let toastIdCounter = 0;
const seenAgents = new Set<string>();

// Watch for new agents and show toast
watch(uniqueAppNames, (newAppNames) => {
  // Find agents that are new (not in seenAgents set)
  newAppNames.forEach(appName => {
    if (!seenAgents.has(appName)) {
      seenAgents.add(appName);
      // Show toast for new agent
      const toast: Toast = {
        id: toastIdCounter++,
        agentName: appName,
        agentColor: getHexColorForApp(appName)
      };
      toasts.value.push(toast);
    }
  });
}, { deep: true });

const dismissToast = (id: number) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index !== -1) {
    toasts.value.splice(index, 1);
  }
};

// Handle agent tag clicks for swim lanes
const toggleAgentLane = (agentName: string) => {
  const index = selectedAgentLanes.value.indexOf(agentName);
  if (index >= 0) {
    // Remove from comparison
    selectedAgentLanes.value.splice(index, 1);
  } else {
    // Add to comparison
    selectedAgentLanes.value.push(agentName);
  }
};

// Handle clear button click
const handleClearClick = () => {
  clearEvents();
  selectedAgentLanes.value = [];
};

// Debug handler for theme manager
const handleThemeManagerClick = () => {
  console.log('Theme manager button clicked!');
  showThemeManager.value = true;
};

// Analytics filter handler (from chart clicks)
const handleAnalyticsFilter = (payload: { toolName?: string; eventType?: string }) => {
  if (payload.eventType) {
    filters.value = { ...filters.value, eventType: payload.eventType };
  }
  // toolName filter applied via event type filter matching tool name in payload
  showFilters.value = true;
};

// Export handlers
const handleExport = (type: 'events-csv' | 'sessions-csv' | 'analytics-csv' | 'json' | 'markdown' | 'pdf') => {
  switch (type) {
    case 'events-csv':
      exportEventsCSV(events.value);
      break;
    case 'sessions-csv':
      exportSessionsCSV(sessions.value);
      break;
    case 'analytics-csv':
      exportAnalyticsCSV(analytics.value);
      break;
    case 'json':
      exportJSON(events.value, sessions.value, analytics.value);
      break;
    case 'markdown':
      exportMarkdownReport(events.value, sessions.value, analytics.value);
      break;
    case 'pdf':
      exportPDF();
      break;
  }
};
</script>

<template>
  <div class="space-y-3 p-3">
    <!-- Team Header -->
    <div v-if="teamName" class="flex items-center gap-2 mb-1">
      <span class="text-xs font-bold uppercase tracking-wider text-purple-400">Team</span>
      <span class="text-sm font-bold text-[var(--theme-text-primary)] px-2 py-0.5 border border-purple-500/40 bg-purple-500/10">
        {{ teamName }}
      </span>
    </div>

    <!-- Section 1: Task Board -->
    <div class="space-y-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)]">Task Board</h3>
      <div class="grid grid-cols-3 gap-2 min-h-[80px]">
        <!-- Pending Column -->
        <div class="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] p-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending</span>
            <span class="text-[10px] font-mono text-gray-500">({{ pendingTasks.length }})</span>
          </div>
          <div class="space-y-1.5">
            <div
              v-for="task in pendingTasks"
              :key="task.id"
              class="task-card p-1.5 border-l-2 bg-[var(--theme-bg-primary)] border-gray-500 transition-all duration-300"
            >
              <div class="text-xs font-semibold text-[var(--theme-text-primary)] truncate">{{ task.subject }}</div>
              <div v-if="task.owner" class="text-[10px] text-[var(--theme-text-tertiary)] mt-0.5 truncate">{{ task.owner }}</div>
              <div v-if="task.blockedBy.length > 0" class="text-[10px] text-red-400 mt-0.5">blocked by #{{ task.blockedBy.join(', #') }}</div>
            </div>
            <div v-if="pendingTasks.length === 0" class="text-[10px] text-[var(--theme-text-tertiary)] italic text-center py-2">None</div>
          </div>
        </div>

        <!-- In Progress Column -->
        <div class="bg-[var(--theme-bg-tertiary)] border border-blue-500/30 p-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400">In Progress</span>
            <span class="text-[10px] font-mono text-blue-500">({{ inProgressTasks.length }})</span>
          </div>
          <div class="space-y-1.5">
            <div
              v-for="task in inProgressTasks"
              :key="task.id"
              class="task-card p-1.5 border-l-2 bg-[var(--theme-bg-primary)] border-blue-500 transition-all duration-300"
            >
              <div class="flex items-center gap-1">
                <span v-if="task.activeForm" class="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                <div class="text-xs font-semibold text-[var(--theme-text-primary)] truncate">{{ task.subject }}</div>
              </div>
              <div v-if="task.activeForm" class="text-[10px] text-blue-300 mt-0.5 truncate italic">{{ task.activeForm }}</div>
              <div v-if="task.owner" class="text-[10px] text-[var(--theme-text-tertiary)] mt-0.5 truncate">{{ task.owner }}</div>
            </div>
            <div v-if="inProgressTasks.length === 0" class="text-[10px] text-[var(--theme-text-tertiary)] italic text-center py-2">None</div>
          </div>
        </div>

        <!-- Completed Column -->
        <div class="bg-[var(--theme-bg-tertiary)] border border-green-500/30 p-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-green-400">Completed</span>
            <span class="text-[10px] font-mono text-green-500">({{ completedTasks.length }})</span>
          </div>
          <div class="space-y-1.5">
            <div
              v-for="task in completedTasks"
              :key="task.id"
              class="task-card p-1.5 border-l-2 bg-[var(--theme-bg-primary)] border-green-500 opacity-75 transition-all duration-300"
            >
              <div class="text-xs font-semibold text-[var(--theme-text-secondary)] truncate line-through">{{ task.subject }}</div>
              <div v-if="task.owner" class="text-[10px] text-[var(--theme-text-tertiary)] mt-0.5 truncate">{{ task.owner }}</div>
            </div>
            <div v-if="completedTasks.length === 0" class="text-[10px] text-[var(--theme-text-tertiary)] italic text-center py-2">None</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Agent Roster -->
    <div class="space-y-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)]">Agent Roster</h3>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="agent in agentList"
          :key="agent.agentId"
          class="flex items-center gap-1.5 px-2 py-1 border bg-[var(--theme-bg-primary)] cursor-pointer hover:border-[var(--theme-primary)] transition-all duration-200"
          :class="agent.status === 'running' ? 'border-[var(--theme-border-secondary)]' : 'border-[var(--theme-border-primary)] opacity-60'"
          :title="agentTooltip(agent)"
          @click="$emit('select-agent', agent.sourceApp)"
        >
          <!-- Status dot -->
          <span class="relative flex h-2 w-2">
            <span
              v-if="agent.status === 'running'"
              class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-green-400"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2"
              :class="agent.status === 'running' ? 'bg-green-400' : 'bg-gray-500'"
            ></span>
          </span>

          <!-- Agent type badge -->
          <span
            class="text-[10px] font-bold uppercase tracking-wider"
            :class="agentTypeColor(agent.agentType)"
          >
            {{ agent.agentType }}
          </span>

          <!-- Model name -->
          <span v-if="agent.model" class="text-[10px] text-[var(--theme-text-tertiary)]">
            {{ formatModelShort(agent.model) }}
          </span>

          <!-- Duration -->
          <span class="text-[10px] text-[var(--theme-text-tertiary)] font-mono">
            {{ agentDuration(agent) }}
          </span>
        </div>

        <div v-if="agentList.length === 0" class="text-[10px] text-[var(--theme-text-tertiary)] italic py-2">No agents detected</div>
      </div>
    </div>

    <!-- Section 3: Message Flow -->
    <div v-if="messages.length > 0" class="space-y-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)]">Message Flow</h3>
      <div class="max-h-[120px] overflow-y-auto bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] p-2 space-y-1" ref="messageContainer">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="flex items-center gap-1.5 text-[11px]"
        >
          <span class="text-[var(--theme-text-tertiary)] font-mono shrink-0">{{ formatTime(msg.timestamp) }}</span>
          <span class="font-semibold text-cyan-400 truncate shrink-0 max-w-[100px]">{{ msg.from }}</span>
          <span class="text-[var(--theme-text-tertiary)]">&rarr;</span>
          <span class="font-semibold text-yellow-400 truncate shrink-0 max-w-[100px]">{{ msg.to }}</span>
          <span class="text-[var(--theme-text-secondary)] truncate">{{ msg.summary }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import type { OrchestratedTask, TeamAgent, AgentMessage } from '../types';

const props = defineProps<{
  tasks: Map<string, OrchestratedTask>;
  teamAgents: Map<string, TeamAgent>;
  messages: AgentMessage[];
  teamName: string | null;
}>();

defineEmits<{
  (e: 'select-agent', agentName: string): void;
}>();

const messageContainer = ref<HTMLElement | null>(null);

// Derived task lists
const pendingTasks = computed(() =>
  Array.from(props.tasks.values()).filter(t => t.status === 'pending')
);

const inProgressTasks = computed(() =>
  Array.from(props.tasks.values()).filter(t => t.status === 'in_progress')
);

const completedTasks = computed(() =>
  Array.from(props.tasks.values()).filter(t => t.status === 'completed')
);

// Agent list sorted: running first, then by spawn time
const agentList = computed(() =>
  Array.from(props.teamAgents.values()).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'running' ? -1 : 1;
    return b.spawnedAt - a.spawnedAt;
  })
);

// Auto-scroll messages to bottom
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  });
});

const agentTypeColor = (type: string): string => {
  const lower = type.toLowerCase();
  if (lower.includes('build') || lower === 'code-architect') return 'text-cyan-400';
  if (lower.includes('valid') || lower === 'code-reviewer') return 'text-yellow-400';
  if (lower.includes('explore') || lower === 'explore') return 'text-green-400';
  if (lower.includes('plan')) return 'text-purple-400';
  if (lower === 'bash') return 'text-orange-400';
  return 'text-[var(--theme-text-secondary)]';
};

const formatModelShort = (model: string): string => {
  const parts = model.split('-');
  if (parts.length >= 3) return `${parts[1]}-${parts[2]}`;
  return model;
};

const agentDuration = (agent: TeamAgent): string => {
  const end = agent.stoppedAt || Date.now();
  const ms = end - agent.spawnedAt;
  if (ms < 1000) return '<1s';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
};

const agentTooltip = (agent: TeamAgent): string => {
  let tip = `${agent.agentType} (${agent.status})`;
  if (agent.description) tip += `\n${agent.description}`;
  if (agent.model) tip += `\nModel: ${agent.model}`;
  return tip;
};

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
</script>

<style scoped>
.task-card {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
</style>

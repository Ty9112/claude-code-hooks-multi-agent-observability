<template>
  <div
    class="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] transition-all duration-150 hover:translate-y-[-2px]"
    :style="{
      borderTopWidth: '2px',
      borderTopColor: appColor,
      boxShadow: session.status === 'active' ? `0 4px 20px ${appColor}22` : 'none'
    }"
  >
    <div class="p-3 mobile:p-2.5">
      <!-- Top row: project name + status -->
      <div class="flex items-center justify-between mb-2">
        <!-- Editable alias / agent name -->
        <div class="flex items-center gap-1 min-w-0 mr-2 flex-1">
          <template v-if="editingAlias">
            <input
              ref="aliasInput"
              v-model="aliasValue"
              class="font-label text-[12px] font-semibold tracking-wider uppercase bg-[var(--theme-bg-secondary)] border border-[var(--theme-primary)] px-1.5 py-0.5 text-[var(--theme-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] w-full max-w-[180px]"
              :style="{ color: appColor }"
              :placeholder="session.agentId"
              @keydown.enter="commitAlias"
              @keydown.escape="cancelAlias"
              @blur="commitAlias"
            />
          </template>
          <template v-else>
            <span
              class="font-label text-[12px] font-semibold tracking-wider uppercase truncate cursor-pointer hover:opacity-80"
              :style="{ color: appColor }"
              :title="`Click to rename ${session.agentId}`"
              @click="startEditAlias"
            >
              {{ displayName }}
            </span>
            <button
              class="shrink-0 w-4 h-4 flex items-center justify-center text-[9px] text-[var(--theme-text-quaternary)] hover:text-[var(--theme-primary)] transition-colors opacity-0 group-hover:opacity-100"
              style="opacity: 0.4;"
              title="Rename agent"
              @click.stop="startEditAlias"
            >
              &#9998;
            </button>
          </template>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <!-- Model badge -->
          <span
            v-if="session.modelName"
            class="font-mono-data text-[9px] px-1.5 py-0.5 border bg-[var(--theme-bg-secondary)] text-[var(--theme-text-quaternary)] border-[var(--theme-border-primary)]"
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
      <div class="font-mono-data text-[11px] text-[var(--theme-text-quaternary)] mb-3 cursor-pointer" @click="$emit('toggle-lane', session.agentId)">
        {{ session.sessionIdShort }}
      </div>

      <!-- Stats grid — monospace values -->
      <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 cursor-pointer" @click="$emit('toggle-lane', session.agentId)">
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

      <!-- Tasks Section -->
      <div class="mt-3 border-t border-[var(--theme-border-primary)] pt-2">
        <button
          class="flex items-center gap-1 text-[9px] font-label font-semibold uppercase tracking-widest text-[var(--theme-text-quaternary)] hover:text-[var(--theme-primary)] transition-colors w-full"
          @click="showTasks = !showTasks"
        >
          <span class="transition-transform duration-150 text-[8px]" :class="{ 'rotate-90': showTasks }">&#9654;</span>
          Tasks
          <span v-if="pendingCount > 0" class="ml-1 px-1 py-0 text-[8px] bg-[var(--theme-primary)] text-[var(--theme-bg-primary)]">{{ pendingCount }}</span>
        </button>

        <div v-if="showTasks" class="mt-1.5 space-y-1">
          <!-- Task list -->
          <div
            v-for="task in agentTasks"
            :key="task.id"
            class="flex items-center gap-1.5 group"
          >
            <button
              class="w-3.5 h-3.5 shrink-0 border flex items-center justify-center transition-colors text-[8px]"
              :class="task.done
                ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-[var(--theme-bg-primary)]'
                : 'border-[var(--theme-border-secondary)] hover:border-[var(--theme-primary)]'"
              @click="toggleTask(task.id)"
            >
              <span v-if="task.done">&#10003;</span>
            </button>
            <span
              class="font-mono-data text-[11px] flex-1 truncate"
              :class="task.done ? 'line-through text-[var(--theme-text-quaternary)]' : 'text-[var(--theme-text-secondary)]'"
            >
              {{ task.text }}
            </span>
            <button
              class="shrink-0 w-3.5 h-3.5 flex items-center justify-center text-[9px] text-[var(--theme-text-quaternary)] hover:text-[var(--theme-accent-error)] transition-colors opacity-0 group-hover:opacity-100"
              title="Remove task"
              @click="removeTask(task.id)"
            >
              &#10005;
            </button>
          </div>

          <!-- Add task input -->
          <div class="flex items-center gap-1">
            <input
              v-model="newTaskText"
              class="flex-1 px-1.5 py-0.5 text-[11px] font-mono-data bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-quaternary)] focus:outline-none focus:border-[var(--theme-primary)]"
              placeholder="Add task..."
              @keydown.enter="handleAddTask"
            />
            <button
              class="shrink-0 px-1.5 py-0.5 text-[9px] font-semibold uppercase bg-[var(--theme-primary)] text-[var(--theme-bg-primary)] hover:opacity-80 transition-opacity"
              @click="handleAddTask"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { SessionInfo } from '../types';
import { useAgentAliases } from '../composables/useAgentAliases';
import { useAgentTasks } from '../composables/useAgentTasks';

const props = defineProps<{
  session: SessionInfo;
  appColor: string;
}>();

defineEmits<{
  'toggle-lane': [agentId: string];
}>();

const { getDisplayName, setAlias, getAlias } = useAgentAliases();
const { getTasksForAgent, addTask, toggleTask, removeTask } = useAgentTasks();

// Alias editing
const editingAlias = ref(false);
const aliasValue = ref('');
const aliasInput = ref<HTMLInputElement>();

const displayName = computed(() => getDisplayName(props.session.agentId));

function startEditAlias() {
  aliasValue.value = getAlias(props.session.agentId) || '';
  editingAlias.value = true;
  nextTick(() => aliasInput.value?.focus());
}

function commitAlias() {
  setAlias(props.session.agentId, aliasValue.value);
  editingAlias.value = false;
}

function cancelAlias() {
  editingAlias.value = false;
}

// Tasks
const showTasks = ref(false);
const newTaskText = ref('');
const agentTasks = computed(() => getTasksForAgent(props.session.agentId).value);
const pendingCount = computed(() => agentTasks.value.filter(t => !t.done).length);

function handleAddTask() {
  if (newTaskText.value.trim()) {
    addTask(props.session.agentId, newTaskText.value);
    newTaskText.value = '';
  }
}

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

import { reactive, computed } from 'vue';

export interface AgentTask {
  id: string;
  agentId: string;
  text: string;
  done: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'agent-tasks';
const tasks = reactive<AgentTask[]>([]);
let loaded = false;
let nextId = 1;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AgentTask[];
      tasks.push(...parsed);
      nextId = parsed.reduce((max, t) => Math.max(max, parseInt(t.id, 10) || 0), 0) + 1;
    }
  } catch { /* ignore */ }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function useAgentTasks() {
  load();

  function getTasksForAgent(agentId: string) {
    return computed(() => tasks.filter(t => t.agentId === agentId));
  }

  function addTask(agentId: string, text: string) {
    if (!text.trim()) return;
    tasks.push({
      id: String(nextId++),
      agentId,
      text: text.trim(),
      done: false,
      createdAt: Date.now(),
    });
    save();
  }

  function toggleTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (task) { task.done = !task.done; save(); }
  }

  function removeTask(taskId: string) {
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx >= 0) { tasks.splice(idx, 1); save(); }
  }

  function getTaskCount(agentId: string): number {
    return tasks.filter(t => t.agentId === agentId && !t.done).length;
  }

  return { tasks, getTasksForAgent, addTask, toggleTask, removeTask, getTaskCount };
}

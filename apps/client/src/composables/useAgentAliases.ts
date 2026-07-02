import { reactive } from 'vue';

const STORAGE_KEY = 'agent-aliases';
const aliases = reactive<Map<string, string>>(new Map());
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed)) aliases.set(k, v);
    }
  } catch { /* ignore corrupt data */ }
}

function save() {
  const obj: Record<string, string> = {};
  aliases.forEach((v, k) => { obj[k] = v; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

export function useAgentAliases() {
  load();

  function getDisplayName(agentId: string): string {
    return aliases.get(agentId) || agentId;
  }

  function setAlias(agentId: string, alias: string) {
    if (alias.trim()) {
      aliases.set(agentId, alias.trim());
    } else {
      aliases.delete(agentId);
    }
    save();
  }

  function getAlias(agentId: string): string | undefined {
    return aliases.get(agentId);
  }

  return { aliases, getDisplayName, setAlias, getAlias };
}

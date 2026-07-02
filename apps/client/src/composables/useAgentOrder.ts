import { reactive } from 'vue';

const STORAGE_KEY = 'agent-office-order';
const orderMap = reactive<Map<string, number>>(new Map());
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, number>;
      for (const [k, v] of Object.entries(parsed)) orderMap.set(k, v);
    }
  } catch { /* ignore */ }
}

function save() {
  const obj: Record<string, number> = {};
  orderMap.forEach((v, k) => { obj[k] = v; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

export function useAgentOrder() {
  load();

  function getOrderedAgents<T extends { agentId: string }>(agents: T[]): T[] {
    return [...agents].sort((a, b) => {
      const oa = orderMap.get(a.agentId) ?? Infinity;
      const ob = orderMap.get(b.agentId) ?? Infinity;
      if (oa === ob) return 0;
      return oa - ob;
    });
  }

  function setOrder(agentIds: string[]) {
    orderMap.clear();
    agentIds.forEach((id, i) => orderMap.set(id, i));
    save();
  }

  function moveAgent(agentId: string, fromIndex: number, toIndex: number, currentIds: string[]) {
    const ids = [...currentIds];
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, agentId);
    setOrder(ids);
  }

  return { getOrderedAgents, setOrder, moveAgent };
}

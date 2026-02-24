// Fetch + subscribe to Claude HUD usage data
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { HudData } from '../types';
import { API_BASE_URL } from '../config';

const MAX_HISTORY = 1440; // 24h at 1/min

export function useHudData() {
  const current = ref<HudData | null>(null);
  const history = ref<HudData[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const fiveHourStatus = computed<'ok' | 'warning' | 'critical'>(() => {
    const pct = current.value?.fiveHour;
    if (pct == null) return 'ok';
    if (pct >= 90) return 'critical';
    if (pct >= 70) return 'warning';
    return 'ok';
  });

  const sevenDayStatus = computed<'ok' | 'warning' | 'critical'>(() => {
    const pct = current.value?.sevenDay;
    if (pct == null) return 'ok';
    if (pct >= 90) return 'critical';
    if (pct >= 70) return 'warning';
    return 'ok';
  });

  function formatCountdown(resetAt: number | null): string {
    if (!resetAt) return '--';
    const diff = resetAt - Date.now();
    if (diff <= 0) return 'now';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }

  const fiveHourCountdown = computed(() => formatCountdown(current.value?.fiveHourResetAt ?? null));
  const sevenDayCountdown = computed(() => formatCountdown(current.value?.sevenDayResetAt ?? null));

  async function fetchCurrent() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/hud/current`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          current.value = data;
        }
      }
    } catch {
      // Silent fail — HUD is optional
    }
  }

  async function fetchHistory() {
    try {
      const since = Date.now() - 24 * 60 * 60 * 1000;
      const res = await fetch(`${API_BASE_URL}/api/hud/history?since=${since}`);
      if (res.ok) {
        history.value = await res.json();
      }
    } catch {
      // Silent fail
    }
  }

  function handleUpdate(data: HudData) {
    current.value = data;
    history.value.push(data);
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(-MAX_HISTORY);
    }
  }

  onMounted(async () => {
    loading.value = true;
    await Promise.all([fetchCurrent(), fetchHistory()]);
    loading.value = false;

    // Poll every 60s
    pollInterval = setInterval(async () => {
      await fetchCurrent();
      if (current.value) {
        history.value.push({ ...current.value });
        if (history.value.length > MAX_HISTORY) {
          history.value = history.value.slice(-MAX_HISTORY);
        }
      }
    }, 60_000);
  });

  onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval);
  });

  return {
    current,
    history,
    loading,
    error,
    fiveHourStatus,
    sevenDayStatus,
    fiveHourCountdown,
    sevenDayCountdown,
    handleUpdate,
  };
}

import { computed, ref, watch } from 'vue';
import type { HookEvent, ToolStat, EventTypeDistribution, SessionRanking, ToolAnalyticsData } from '../types';
import { API_BASE_URL } from '../config';

export function useToolAnalytics(events: () => HookEvent[]) {
  const serverData = ref<any>(null);
  const lastFetchTime = ref(0);
  const FETCH_INTERVAL = 10_000; // Refresh server data every 10s

  // Fetch from server for full-dataset analytics
  async function fetchServerAnalytics() {
    const now = Date.now();
    if (now - lastFetchTime.value < FETCH_INTERVAL) return;
    lastFetchTime.value = now;

    try {
      const res = await fetch(`${API_BASE_URL}/events/analytics`);
      if (res.ok) serverData.value = await res.json();
    } catch {
      // Fallback to client-side computation
    }
  }

  // Client-side computation from the 300-event window
  const analytics = computed<ToolAnalyticsData>(() => {
    const evts = events();

    // Tool stats
    const toolMap = new Map<string, { pre: number; post: number; fail: number }>();
    for (const e of evts) {
      const toolName = e.payload?.tool_name;
      if (!toolName) continue;
      let entry = toolMap.get(toolName);
      if (!entry) {
        entry = { pre: 0, post: 0, fail: 0 };
        toolMap.set(toolName, entry);
      }
      if (e.hook_event_type === 'PreToolUse') entry.pre++;
      else if (e.hook_event_type === 'PostToolUse') entry.post++;
      else if (e.hook_event_type === 'PostToolUseFailure') entry.fail++;
    }

    const toolStats: ToolStat[] = Array.from(toolMap.entries())
      .map(([toolName, counts]) => ({
        toolName,
        preToolUseCount: counts.pre,
        postToolUseCount: counts.post,
        postToolUseFailureCount: counts.fail,
        successRate: counts.post + counts.fail > 0
          ? counts.post / (counts.post + counts.fail)
          : 1
      }))
      .sort((a, b) => b.preToolUseCount - a.preToolUseCount);

    // Event distribution
    const eventMap = new Map<string, number>();
    for (const e of evts) {
      eventMap.set(e.hook_event_type, (eventMap.get(e.hook_event_type) || 0) + 1);
    }
    const total = evts.length;
    const eventDistribution: EventTypeDistribution[] = Array.from(eventMap.entries())
      .map(([eventType, count]) => ({
        eventType,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Session rankings
    const sessionMap = new Map<string, { sourceApp: string; eventCount: number; toolCount: number }>();
    for (const e of evts) {
      const agentId = `${e.source_app}:${e.session_id.slice(0, 8)}`;
      let entry = sessionMap.get(agentId);
      if (!entry) {
        entry = { sourceApp: e.source_app, eventCount: 0, toolCount: 0 };
        sessionMap.set(agentId, entry);
      }
      entry.eventCount++;
      if (e.hook_event_type === 'PreToolUse') entry.toolCount++;
    }
    const sessionRankings: SessionRanking[] = Array.from(sessionMap.entries())
      .map(([agentId, data]) => ({ agentId, ...data }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 5);

    // Events per minute (1-minute buckets over last 30 minutes)
    const now = Date.now();
    const thirtyMinAgo = now - 30 * 60 * 1000;
    const minuteMap = new Map<number, number>();
    for (const e of evts) {
      if (!e.timestamp || e.timestamp < thirtyMinAgo) continue;
      const bucket = Math.floor(e.timestamp / 60_000) * 60_000;
      minuteMap.set(bucket, (minuteMap.get(bucket) || 0) + 1);
    }
    const eventsPerMinute = Array.from(minuteMap.entries())
      .map(([timestamp, count]) => ({ timestamp, rate: count }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return { toolStats, eventDistribution, sessionRankings, eventsPerMinute };
  });

  // Trigger server fetch when events change (debounced via the interval check)
  watch(() => events().length, () => {
    fetchServerAnalytics();
  }, { immediate: true });

  return { analytics, fetchServerAnalytics };
}

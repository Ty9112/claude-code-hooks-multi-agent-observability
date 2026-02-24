// Derives KPI values from events, analytics, and sessions
import { computed } from 'vue';
import type { HookEvent, ToolAnalyticsData, SessionInfo } from '../types';

export interface KpiMetrics {
  totalEvents: number;
  activeAgents: number;
  totalAgents: number;
  toolCalls: number;
  successRate: number;
  eventsPerMinute: number;
  topTool: string | null;
  errorCount: number;
}

export function useKpiData(
  events: () => HookEvent[],
  analytics: () => ToolAnalyticsData,
  sessions: () => SessionInfo[]
) {
  const metrics = computed<KpiMetrics>(() => {
    const evts = events();
    const a = analytics();
    const sess = sessions();

    const totalEvents = evts.length;
    const activeAgents = sess.filter(s => s.status === 'active').length;
    const totalAgents = sess.length;

    const toolCalls = a.toolStats.reduce((sum, t) => sum + t.preToolUseCount, 0);

    const totalOutcomes = a.toolStats.reduce((sum, t) => sum + t.postToolUseCount + t.postToolUseFailureCount, 0);
    const totalSuccess = a.toolStats.reduce((sum, t) => sum + t.postToolUseCount, 0);
    const successRate = totalOutcomes > 0 ? Math.round((totalSuccess / totalOutcomes) * 100) : 100;

    // Events per minute over the last 5 minutes
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const recentCount = evts.filter(e => e.timestamp && e.timestamp >= fiveMinAgo).length;
    const eventsPerMinute = Math.round((recentCount / 5) * 10) / 10;

    const topTool = a.toolStats.length > 0 ? a.toolStats[0].toolName : null;

    const errorCount = a.toolStats.reduce((sum, t) => sum + t.postToolUseFailureCount, 0);

    return {
      totalEvents,
      activeAgents,
      totalAgents,
      toolCalls,
      successRate,
      eventsPerMinute,
      topTool,
      errorCount,
    };
  });

  return { metrics };
}

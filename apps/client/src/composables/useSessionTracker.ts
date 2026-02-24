import { computed } from 'vue';
import type { HookEvent, SessionInfo } from '../types';

const IDLE_THRESHOLD_MS = 30_000; // 30 seconds without events = idle

export function useSessionTracker(events: () => HookEvent[]) {
  const sessions = computed<SessionInfo[]>(() => {
    const now = Date.now();
    const sessionMap = new Map<string, SessionInfo>();

    for (const event of events()) {
      if (!event.timestamp) continue;

      const sessionIdShort = event.session_id.slice(0, 8);
      const agentId = `${event.source_app}:${sessionIdShort}`;

      let session = sessionMap.get(agentId);
      if (!session) {
        session = {
          agentId,
          sourceApp: event.source_app,
          sessionId: event.session_id,
          sessionIdShort,
          modelName: event.model_name || null,
          status: 'idle',
          firstEventTime: event.timestamp,
          lastEventTime: event.timestamp,
          eventCount: 0,
          lastToolUsed: null,
          toolCount: 0,
          eventTypes: {},
        };
        sessionMap.set(agentId, session);
      }

      session.eventCount++;
      session.eventTypes[event.hook_event_type] = (session.eventTypes[event.hook_event_type] || 0) + 1;

      if (event.timestamp < session.firstEventTime) {
        session.firstEventTime = event.timestamp;
      }
      if (event.timestamp > session.lastEventTime) {
        session.lastEventTime = event.timestamp;
      }

      // Track model name from latest event
      if (event.model_name) {
        session.modelName = event.model_name;
      }

      // Track tool usage
      if (event.payload?.tool_name) {
        if (event.hook_event_type === 'PreToolUse') {
          session.toolCount++;
        }
        session.lastToolUsed = event.payload.tool_name;
      }
    }

    // Determine active/idle status
    for (const session of sessionMap.values()) {
      session.status = (now - session.lastEventTime) < IDLE_THRESHOLD_MS ? 'active' : 'idle';
    }

    // Sort: active first, then by last event time descending
    return Array.from(sessionMap.values()).sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return b.lastEventTime - a.lastEventTime;
    });
  });

  return { sessions };
}

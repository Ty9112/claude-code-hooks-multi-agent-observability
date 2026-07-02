import { ref, watch, onUnmounted } from 'vue';
import type { HookEvent, SessionInfo } from '../types';

const IDLE_THRESHOLD_MS = 30_000; // 30 seconds without events = idle

export function useSessionTracker(events: () => HookEvent[]) {
  // Persistent state — survives across recomputations
  const sessionMap = new Map<string, SessionInfo>();
  let lastProcessedCount = 0;

  const sessions = ref<SessionInfo[]>([]);
  let debounceTimer: number | null = null;
  const SESSION_DEBOUNCE = 100; // ms

  function flushSessions() {
    const now = Date.now();
    for (const session of sessionMap.values()) {
      session.status = (now - session.lastEventTime) < IDLE_THRESHOLD_MS ? 'active' : 'idle';
    }
    sessions.value = Array.from(sessionMap.values()).sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return b.lastEventTime - a.lastEventTime;
    });
    debounceTimer = null;
  }

  watch(() => events().length, () => {
    const evts = events();

    // Detect reset (events array shrank — user cleared events)
    if (evts.length < lastProcessedCount) {
      sessionMap.clear();
      lastProcessedCount = 0;
    }

    // Only process NEW events (incremental)
    for (let i = lastProcessedCount; i < evts.length; i++) {
      const event = evts[i];
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
          agentType: null,
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

      if (event.hook_event_type === 'SubagentStart' && event.payload?.agent_type) {
        session.agentType = event.payload.agent_type;
      }

      session.eventCount++;
      session.eventTypes[event.hook_event_type] = (session.eventTypes[event.hook_event_type] || 0) + 1;

      if (event.timestamp < session.firstEventTime) {
        session.firstEventTime = event.timestamp;
      }
      if (event.timestamp > session.lastEventTime) {
        session.lastEventTime = event.timestamp;
      }

      if (event.model_name) {
        session.modelName = event.model_name;
      }

      if (event.payload?.tool_name) {
        if (event.hook_event_type === 'PreToolUse') {
          session.toolCount++;
        }
        session.lastToolUsed = event.payload.tool_name;
      }
    }

    lastProcessedCount = evts.length;

    // Debounce the output ref update (sort + status check)
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(flushSessions, SESSION_DEBOUNCE);
  }, { immediate: true });

  onUnmounted(() => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  });

  return { sessions };
}

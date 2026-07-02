import { computed } from 'vue';
import type { HookEvent, OrchestratedTask, TeamAgent, AgentMessage } from '../types';

// Tool names that indicate team orchestration activity
const TEAM_TOOL_NAMES = new Set([
  'TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList',
  'Task', 'TaskOutput', 'TaskStop',
  'SendMessage', 'TeamCreate', 'TeamDelete',
]);

const TEAM_EVENT_TYPES = new Set(['SubagentStart', 'SubagentStop']);

export function useTeamOrchestration(events: () => HookEvent[]) {
  const tasks = computed<Map<string, OrchestratedTask>>(() => {
    const map = new Map<string, OrchestratedTask>();
    let autoId = 0;

    for (const event of events()) {
      if (!event.timestamp) continue;
      const toolName = event.payload?.tool_name;
      const input = event.payload?.tool_input;

      if (event.hook_event_type === 'PreToolUse' && toolName === 'TaskCreate' && input) {
        autoId++;
        const id = String(autoId);
        map.set(id, {
          id,
          subject: input.subject || 'Untitled task',
          status: 'pending',
          owner: null,
          blockedBy: [],
          activeForm: input.activeForm || null,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        });
      }

      if (event.hook_event_type === 'PreToolUse' && toolName === 'TaskUpdate' && input?.taskId) {
        const task = map.get(input.taskId);
        if (task) {
          if (input.status && ['pending', 'in_progress', 'completed'].includes(input.status)) {
            task.status = input.status as OrchestratedTask['status'];
          }
          if (input.owner !== undefined) {
            task.owner = input.owner;
          }
          if (input.subject) {
            task.subject = input.subject;
          }
          if (input.activeForm) {
            task.activeForm = input.activeForm;
          }
          if (input.addBlockedBy) {
            task.blockedBy = [...new Set([...task.blockedBy, ...input.addBlockedBy])];
          }
          if (input.status === 'deleted') {
            map.delete(input.taskId);
            continue;
          }
          task.updatedAt = event.timestamp;
        }
      }
    }

    return map;
  });

  const teamAgents = computed<Map<string, TeamAgent>>(() => {
    const map = new Map<string, TeamAgent>();

    for (const event of events()) {
      if (!event.timestamp) continue;

      // SubagentStart — agent spawned
      if (event.hook_event_type === 'SubagentStart') {
        const agentId = event.payload?.agent_id || `${event.source_app}:${event.session_id.slice(0, 8)}`;
        map.set(agentId, {
          agentId,
          agentType: event.payload?.agent_type || 'unknown',
          sourceApp: event.source_app,
          sessionId: event.session_id,
          status: 'running',
          spawnedAt: event.timestamp,
          stoppedAt: null,
          description: null,
          model: event.model_name || null,
        });
      }

      // SubagentStop — agent finished
      if (event.hook_event_type === 'SubagentStop') {
        const agentId = event.payload?.agent_id || `${event.source_app}:${event.session_id.slice(0, 8)}`;
        const agent = map.get(agentId);
        if (agent) {
          agent.status = 'stopped';
          agent.stoppedAt = event.timestamp;
        }
      }

      // Task tool (launch subagent) — captures description, subagent_type, model
      if (event.hook_event_type === 'PreToolUse' && event.payload?.tool_name === 'Task') {
        const input = event.payload?.tool_input;
        if (input?.subagent_type) {
          // Create a provisional agent entry keyed by description (will be matched later if SubagentStart arrives)
          const provisionalId = `task:${event.source_app}:${event.session_id.slice(0, 8)}:${event.timestamp}`;
          if (!map.has(provisionalId)) {
            map.set(provisionalId, {
              agentId: provisionalId,
              agentType: input.subagent_type,
              sourceApp: event.source_app,
              sessionId: event.session_id,
              status: 'running',
              spawnedAt: event.timestamp,
              stoppedAt: null,
              description: input.description || null,
              model: input.model || event.model_name || null,
            });
          }
        }
      }
    }

    return map;
  });

  const messages = computed<AgentMessage[]>(() => {
    const msgs: AgentMessage[] = [];

    for (const event of events()) {
      if (!event.timestamp) continue;

      if (event.hook_event_type === 'PreToolUse' && event.payload?.tool_name === 'SendMessage') {
        const input = event.payload?.tool_input;
        if (input?.recipient) {
          msgs.push({
            from: `${event.source_app}:${event.session_id.slice(0, 8)}`,
            to: input.recipient,
            summary: input.summary || input.subject || '',
            timestamp: event.timestamp,
          });
        }
      }
    }

    return msgs.sort((a, b) => a.timestamp - b.timestamp);
  });

  const teamName = computed<string | null>(() => {
    for (const event of events()) {
      if (
        event.hook_event_type === 'PreToolUse' &&
        event.payload?.tool_name === 'TeamCreate' &&
        event.payload?.tool_input?.team_name
      ) {
        return event.payload.tool_input.team_name;
      }
    }
    return null;
  });

  const hasTeamActivity = computed<boolean>(() => {
    return events().some((event) => {
      if (TEAM_EVENT_TYPES.has(event.hook_event_type)) return true;
      if (
        (event.hook_event_type === 'PreToolUse' || event.hook_event_type === 'PostToolUse') &&
        event.payload?.tool_name &&
        TEAM_TOOL_NAMES.has(event.payload.tool_name)
      ) {
        return true;
      }
      return false;
    });
  });

  return { tasks, teamAgents, messages, teamName, hasTeamActivity };
}

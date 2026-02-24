// New interface for human-in-the-loop requests
export interface HumanInTheLoop {
  question: string;
  responseWebSocketUrl: string;
  type: 'question' | 'permission' | 'choice';
  choices?: string[]; // For multiple choice questions
  timeout?: number; // Optional timeout in seconds
  requiresResponse?: boolean; // Whether response is required or optional
}

// Response interface
export interface HumanInTheLoopResponse {
  response?: string;
  permission?: boolean;
  choice?: string; // Selected choice from options
  hookEvent: HookEvent;
  respondedAt: number;
  respondedBy?: string; // Optional user identifier
}

// Status tracking interface
export interface HumanInTheLoopStatus {
  status: 'pending' | 'responded' | 'timeout' | 'error';
  respondedAt?: number;
  response?: HumanInTheLoopResponse;
}

export interface HookEvent {
  id?: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, any>;
  chat?: any[];
  summary?: string;
  timestamp?: number;
  model_name?: string;

  // NEW: Optional HITL data
  humanInTheLoop?: HumanInTheLoop;
  humanInTheLoopStatus?: HumanInTheLoopStatus;
}

export interface FilterOptions {
  source_apps: string[];
  session_ids: string[];
  hook_event_types: string[];
}

export interface WebSocketMessage {
  type: 'initial' | 'event' | 'hitl_response' | 'hud_update';
  data: HookEvent | HookEvent[] | HumanInTheLoopResponse | HudData;
}

export type TimeRange = '1m' | '3m' | '5m' | '10m';

export interface ChartDataPoint {
  timestamp: number;
  count: number;
  eventTypes: Record<string, number>; // event type -> count
  toolEvents?: Record<string, number>; // "EventType:ToolName" -> count (e.g., "PreToolUse:Bash" -> 3)
  sessions: Record<string, number>; // session id -> count
}

export interface ChartConfig {
  maxDataPoints: number;
  animationDuration: number;
  barWidth: number;
  barGap: number;
  colors: {
    primary: string;
    glow: string;
    axis: string;
    text: string;
  };
}

// Session tracking
export interface SessionInfo {
  agentId: string;           // "source_app:session_id[0:8]"
  sourceApp: string;         // e.g., "FabricationSample"
  sessionId: string;
  sessionIdShort: string;    // first 8 chars
  modelName: string | null;  // e.g., "claude-opus-4-6"
  status: 'active' | 'idle';
  firstEventTime: number;
  lastEventTime: number;
  eventCount: number;
  lastToolUsed: string | null;
  toolCount: number;
  eventTypes: Record<string, number>;
}

// Tool analytics
export interface ToolStat {
  toolName: string;
  preToolUseCount: number;
  postToolUseCount: number;
  postToolUseFailureCount: number;
  successRate: number;
}

export interface EventTypeDistribution {
  eventType: string;
  count: number;
  percentage: number;
}

export interface SessionRanking {
  agentId: string;
  sourceApp: string;
  eventCount: number;
  toolCount: number;
}

export interface ToolAnalyticsData {
  toolStats: ToolStat[];
  eventDistribution: EventTypeDistribution[];
  sessionRankings: SessionRanking[];
  eventsPerMinute: { timestamp: number; rate: number }[];
}

// Claude HUD data
export interface HudData {
  planName: string | null;
  fiveHour: number | null;
  sevenDay: number | null;
  fiveHourResetAt: number | null;
  sevenDayResetAt: number | null;
  timestamp: number;
}
import type { HookEvent, SessionInfo, ToolAnalyticsData } from '../types';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// --- CSV Exports ---

export function exportEventsCSV(events: HookEvent[]) {
  const headers = ['ID', 'Timestamp', 'Source App', 'Session ID', 'Event Type', 'Tool Name', 'Model', 'Summary'];
  const rows = events.map(e => [
    String(e.id || ''),
    e.timestamp ? new Date(e.timestamp).toISOString() : '',
    e.source_app,
    e.session_id,
    e.hook_event_type,
    e.payload?.tool_name || '',
    e.model_name || '',
    (e.summary || '').replace(/\n/g, ' '),
  ].map(v => escapeCSV(String(v))).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `events_${timestamp()}.csv`, 'text/csv;charset=utf-8;');
}

export function exportSessionsCSV(sessions: SessionInfo[]) {
  const headers = ['Agent ID', 'Source App', 'Session ID', 'Status', 'Model', 'Events', 'Tools', 'Last Tool', 'First Event', 'Last Event', 'Duration (s)'];
  const rows = sessions.map(s => [
    s.agentId,
    s.sourceApp,
    s.sessionId,
    s.status,
    s.modelName || '',
    String(s.eventCount),
    String(s.toolCount),
    s.lastToolUsed || '',
    new Date(s.firstEventTime).toISOString(),
    new Date(s.lastEventTime).toISOString(),
    String(Math.round((s.lastEventTime - s.firstEventTime) / 1000)),
  ].map(v => escapeCSV(String(v))).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `sessions_${timestamp()}.csv`, 'text/csv;charset=utf-8;');
}

export function exportAnalyticsCSV(analytics: ToolAnalyticsData) {
  // Tool stats sheet
  const toolHeaders = ['Tool Name', 'Pre-Tool Uses', 'Post-Tool Uses', 'Failures', 'Success Rate (%)'];
  const toolRows = analytics.toolStats.map(t => [
    t.toolName,
    String(t.preToolUseCount),
    String(t.postToolUseCount),
    String(t.postToolUseFailureCount),
    String(Math.round(t.successRate * 100)),
  ].map(v => escapeCSV(String(v))).join(','));

  // Event distribution section
  const distHeaders = ['Event Type', 'Count', 'Percentage (%)'];
  const distRows = analytics.eventDistribution.map(d => [
    d.eventType,
    String(d.count),
    String(Math.round(d.percentage * 100) / 100),
  ].map(v => escapeCSV(String(v))).join(','));

  // Session rankings
  const sessHeaders = ['Agent ID', 'Source App', 'Events', 'Tools'];
  const sessRows = analytics.sessionRankings.map(s => [
    s.agentId,
    s.sourceApp,
    String(s.eventCount),
    String(s.toolCount),
  ].map(v => escapeCSV(String(v))).join(','));

  const sections = [
    '--- Tool Statistics ---',
    toolHeaders.join(','),
    ...toolRows,
    '',
    '--- Event Type Distribution ---',
    distHeaders.join(','),
    ...distRows,
    '',
    '--- Session Rankings ---',
    sessHeaders.join(','),
    ...sessRows,
  ];

  downloadFile(sections.join('\n'), `analytics_${timestamp()}.csv`, 'text/csv;charset=utf-8;');
}

// --- JSON Export ---

export function exportJSON(events: HookEvent[], sessions: SessionInfo[], analytics: ToolAnalyticsData) {
  const data = {
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    sessionCount: sessions.length,
    events,
    sessions,
    analytics,
  };
  downloadFile(JSON.stringify(data, null, 2), `mission_control_${timestamp()}.json`, 'application/json');
}

// --- PDF Export (browser print) ---

export function exportPDF() {
  // Create a print-friendly version
  const style = document.createElement('style');
  style.id = 'print-override';
  style.textContent = `
    @media print {
      body { background: white !important; color: black !important; }
      * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
    }
  `;
  document.head.appendChild(style);
  window.print();
  // Clean up after print dialog
  setTimeout(() => {
    const el = document.getElementById('print-override');
    if (el) el.remove();
  }, 1000);
}

// --- Markdown Report ---

export function exportMarkdownReport(events: HookEvent[], sessions: SessionInfo[], analytics: ToolAnalyticsData) {
  const lines: string[] = [
    '# Harris Mission Control Report',
    `**Generated**: ${new Date().toISOString()}`,
    `**Events**: ${events.length} | **Sessions**: ${sessions.length}`,
    '',
    '## Sessions',
    '',
    '| Agent ID | App | Status | Model | Events | Tools | Duration |',
    '|----------|-----|--------|-------|--------|-------|----------|',
  ];

  for (const s of sessions) {
    const dur = Math.round((s.lastEventTime - s.firstEventTime) / 1000);
    const durStr = dur < 60 ? `${dur}s` : `${Math.floor(dur / 60)}m ${dur % 60}s`;
    lines.push(`| ${s.agentId} | ${s.sourceApp} | ${s.status} | ${s.modelName || '-'} | ${s.eventCount} | ${s.toolCount} | ${durStr} |`);
  }

  lines.push('', '## Tool Statistics', '');
  lines.push('| Tool | Uses | Success | Failures | Rate |');
  lines.push('|------|------|---------|----------|------|');
  for (const t of analytics.toolStats.slice(0, 15)) {
    lines.push(`| ${t.toolName} | ${t.preToolUseCount} | ${t.postToolUseCount} | ${t.postToolUseFailureCount} | ${Math.round(t.successRate * 100)}% |`);
  }

  lines.push('', '## Event Type Distribution', '');
  lines.push('| Event Type | Count | % |');
  lines.push('|------------|-------|---|');
  for (const d of analytics.eventDistribution) {
    lines.push(`| ${d.eventType} | ${d.count} | ${Math.round(d.percentage * 100) / 100}% |`);
  }

  lines.push('', '---', '*Report generated by Harris Mission Control*');

  downloadFile(lines.join('\n'), `mission_control_report_${timestamp()}.md`, 'text/markdown;charset=utf-8;');
}

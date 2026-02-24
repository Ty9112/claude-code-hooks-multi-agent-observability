// Canvas rendering utilities for analytics charts
// Follows the same DPR-aware pattern as chartRenderer.ts
// All renderers return HitRegion[] for interactivity

import type { HitRegion } from './canvasInteraction';

export interface AnalyticsTheme {
  bg: string;
  text: string;
  textSecondary: string;
  grid: string;
  accent: string;
}

function getThemeColors(): AnalyticsTheme {
  const style = getComputedStyle(document.documentElement);
  return {
    bg: style.getPropertyValue('--theme-bg-tertiary').trim() || '#141a20',
    text: style.getPropertyValue('--theme-text-primary').trim() || '#e8f4ff',
    textSecondary: style.getPropertyValue('--theme-text-tertiary').trim() || '#3d5568',
    grid: 'rgba(255,255,255,0.06)',
    accent: style.getPropertyValue('--theme-primary').trim() || '#29ADE4',
  };
}

const FONT_LABEL = "'Barlow Condensed', 'Barlow', sans-serif";
const FONT_MONO = "'Share Tech Mono', monospace";

function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return ctx;
}

// Horizontal bar chart (Tool Frequency, Most Active Sessions)
export function renderHorizontalBars(
  canvas: HTMLCanvasElement,
  items: { label: string; value: number; color: string }[],
  title: string,
  highlightId?: string | null
): HitRegion[] {
  const ctx = setupCanvas(canvas);
  const theme = getThemeColors();
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const regions: HitRegion[] = [];

  ctx.clearRect(0, 0, w, h);

  if (items.length === 0) {
    ctx.fillStyle = theme.textSecondary;
    ctx.font = `13px ${FONT_LABEL}`;
    ctx.textAlign = 'center';
    ctx.fillText('No data', w / 2, h / 2);
    return regions;
  }

  const maxVal = Math.max(...items.map(i => i.value), 1);
  const padding = { top: 8, right: 50, bottom: 8, left: 100 };
  const barHeight = Math.min(24, (h - padding.top - padding.bottom) / items.length - 4);
  const gap = 4;

  items.forEach((item, i) => {
    const id = `bar-${title}-${i}`;
    const y = padding.top + i * (barHeight + gap);
    const barWidth = ((w - padding.left - padding.right) * item.value) / maxVal;
    const isHighlighted = highlightId === id;

    // Label
    ctx.fillStyle = isHighlighted ? theme.text : theme.textSecondary;
    ctx.font = `11px ${FONT_MONO}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      item.label.length > 14 ? item.label.slice(0, 13) + '...' : item.label,
      padding.left - 8,
      y + barHeight / 2
    );

    // Bar — 3px radius for Harris sharp corners
    ctx.fillStyle = item.color;
    ctx.beginPath();
    roundRect(ctx, padding.left, y, Math.max(barWidth, 2), barHeight, 3);
    ctx.fill();

    // Highlight glow
    if (isHighlighted) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      roundRect(ctx, padding.left, y, Math.max(barWidth, 2), barHeight, 3);
      ctx.stroke();
    }

    // Value
    ctx.fillStyle = theme.text;
    ctx.font = `11px ${FONT_MONO}`;
    ctx.textAlign = 'left';
    ctx.fillText(String(item.value), padding.left + barWidth + 6, y + barHeight / 2);

    // Hit region for the full bar row
    regions.push({
      id,
      bounds: { x: padding.left, y, w: Math.max(barWidth, 2), h: barHeight },
      label: item.label,
      value: item.value,
      color: item.color,
      data: { total: maxVal, percentage: (item.value / maxVal) * 100 },
    });
  });

  return regions;
}

// Stacked bar chart (Success/Failure rates)
export function renderStackedBars(
  canvas: HTMLCanvasElement,
  items: { label: string; success: number; failure: number; color: string }[],
  highlightId?: string | null
): HitRegion[] {
  const ctx = setupCanvas(canvas);
  const theme = getThemeColors();
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const regions: HitRegion[] = [];

  ctx.clearRect(0, 0, w, h);

  if (items.length === 0) {
    ctx.fillStyle = theme.textSecondary;
    ctx.font = `13px ${FONT_LABEL}`;
    ctx.textAlign = 'center';
    ctx.fillText('No data', w / 2, h / 2);
    return regions;
  }

  const maxVal = Math.max(...items.map(i => i.success + i.failure), 1);
  const padding = { top: 8, right: 50, bottom: 8, left: 100 };
  const barHeight = Math.min(24, (h - padding.top - padding.bottom) / items.length - 4);
  const gap = 4;

  items.forEach((item, i) => {
    const y = padding.top + i * (barHeight + gap);
    const totalWidth = (w - padding.left - padding.right);
    const successWidth = (totalWidth * item.success) / maxVal;
    const failWidth = (totalWidth * item.failure) / maxVal;
    const total = item.success + item.failure;
    const pct = total > 0 ? Math.round((item.success / total) * 100) : 100;

    const isSuccessHighlighted = highlightId === `stacked-success-${i}`;
    const isFailHighlighted = highlightId === `stacked-fail-${i}`;

    // Label
    ctx.fillStyle = (isSuccessHighlighted || isFailHighlighted) ? theme.text : theme.textSecondary;
    ctx.font = `11px ${FONT_MONO}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      item.label.length > 14 ? item.label.slice(0, 13) + '...' : item.label,
      padding.left - 8,
      y + barHeight / 2
    );

    // Success bar — Harris green
    if (item.success > 0) {
      ctx.fillStyle = '#00e57a';
      ctx.beginPath();
      roundRect(ctx, padding.left, y, Math.max(successWidth, 2), barHeight, 3);
      ctx.fill();

      if (isSuccessHighlighted) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        roundRect(ctx, padding.left, y, Math.max(successWidth, 2), barHeight, 3);
        ctx.stroke();
      }

      regions.push({
        id: `stacked-success-${i}`,
        bounds: { x: padding.left, y, w: Math.max(successWidth, 2), h: barHeight },
        label: `${item.label} (success)`,
        value: item.success,
        color: '#00e57a',
        data: { toolName: item.label, type: 'success', percentage: pct },
      });
    }

    // Failure bar — Harris red
    if (item.failure > 0) {
      ctx.fillStyle = '#ff3f5a';
      ctx.beginPath();
      roundRect(ctx, padding.left + successWidth, y, Math.max(failWidth, 2), barHeight, 3);
      ctx.fill();

      if (isFailHighlighted) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        roundRect(ctx, padding.left + successWidth, y, Math.max(failWidth, 2), barHeight, 3);
        ctx.stroke();
      }

      regions.push({
        id: `stacked-fail-${i}`,
        bounds: { x: padding.left + successWidth, y, w: Math.max(failWidth, 2), h: barHeight },
        label: `${item.label} (failure)`,
        value: item.failure,
        color: '#ff3f5a',
        data: { toolName: item.label, type: 'failure', percentage: 100 - pct },
      });
    }

    // Percentage
    ctx.fillStyle = theme.text;
    ctx.font = `11px ${FONT_MONO}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${pct}%`, padding.left + successWidth + failWidth + 6, y + barHeight / 2);
  });

  return regions;
}

// Donut chart (Event Type Distribution)
export function renderDonut(
  canvas: HTMLCanvasElement,
  items: { label: string; value: number; color: string }[],
  highlightId?: string | null
): HitRegion[] {
  const ctx = setupCanvas(canvas);
  const theme = getThemeColors();
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const regions: HitRegion[] = [];

  ctx.clearRect(0, 0, w, h);

  if (items.length === 0) {
    ctx.fillStyle = theme.textSecondary;
    ctx.font = `13px ${FONT_LABEL}`;
    ctx.textAlign = 'center';
    ctx.fillText('No data', w / 2, h / 2);
    return regions;
  }

  const total = items.reduce((sum, i) => sum + i.value, 0);
  const cx = w * 0.35;
  const cy = h / 2;
  const outerR = Math.min(cx - 10, cy - 10);
  const innerR = outerR * 0.55;

  let startAngle = -Math.PI / 2;
  items.forEach((item, i) => {
    const id = `donut-${i}`;
    const sliceAngle = (item.value / total) * Math.PI * 2;
    const isHighlighted = highlightId === id;

    ctx.beginPath();
    ctx.arc(cx, cy, isHighlighted ? outerR + 3 : outerR, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();

    if (isHighlighted) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    regions.push({
      id,
      bounds: { x: cx - outerR, y: cy - outerR, w: outerR * 2, h: outerR * 2 },
      label: item.label,
      value: item.value,
      color: item.color,
      data: {
        type: 'arc',
        cx,
        cy,
        innerR,
        outerR: outerR + 3,
        startAngle,
        endAngle: startAngle + sliceAngle,
        percentage: (item.value / total) * 100,
      },
    });

    startAngle += sliceAngle;
  });

  // Center label
  ctx.fillStyle = theme.text;
  ctx.font = `bold 16px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy);

  // Legend (right side)
  const legendX = w * 0.62;
  const legendItemHeight = Math.min(18, (h - 16) / items.length);
  const legendStartY = Math.max(8, (h - items.length * legendItemHeight) / 2);

  items.slice(0, 8).forEach((item, i) => {
    const y = legendStartY + i * legendItemHeight;
    const isHighlighted = highlightId === `donut-${i}`;

    // Color dot
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legendX, y + legendItemHeight / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = isHighlighted ? theme.text : theme.textSecondary;
    ctx.font = `10px ${FONT_MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const pct = Math.round((item.value / total) * 100);
    const label = item.label.length > 16 ? item.label.slice(0, 15) + '...' : item.label;
    ctx.fillText(`${label} (${pct}%)`, legendX + 10, y + legendItemHeight / 2);
  });

  return regions;
}

// Sparkline chart (Events/Min)
export function renderSparkline(
  canvas: HTMLCanvasElement,
  points: { timestamp: number; rate: number }[],
  accentColor: string,
  highlightId?: string | null
): HitRegion[] {
  const ctx = setupCanvas(canvas);
  const theme = getThemeColors();
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const regions: HitRegion[] = [];

  ctx.clearRect(0, 0, w, h);

  if (points.length < 2) {
    ctx.fillStyle = theme.textSecondary;
    ctx.font = `13px ${FONT_LABEL}`;
    ctx.textAlign = 'center';
    ctx.fillText('Collecting data...', w / 2, h / 2);
    return regions;
  }

  const padding = { top: 12, right: 12, bottom: 24, left: 40 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const maxRate = Math.max(...points.map(p => p.rate), 1);
  const minTime = points[0].timestamp;
  const maxTime = points[points.length - 1].timestamp;
  const timeRange = maxTime - minTime || 1;

  // Grid lines
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = padding.top + (chartH * i) / 3;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    const val = Math.round(maxRate * (1 - i / 3));
    ctx.fillStyle = theme.textSecondary;
    ctx.font = `10px ${FONT_MONO}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), padding.left - 6, y);
  }

  // Fill gradient
  const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
  gradient.addColorStop(0, accentColor + '44');
  gradient.addColorStop(1, accentColor + '08');

  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + chartH);
  points.forEach((p, i) => {
    const x = padding.left + ((p.timestamp - minTime) / timeRange) * chartW;
    const y = padding.top + chartH - (p.rate / maxRate) * chartH;
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(padding.left + ((points[points.length - 1].timestamp - minTime) / timeRange) * chartW, padding.top + chartH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  points.forEach((p, i) => {
    const x = padding.left + ((p.timestamp - minTime) / timeRange) * chartW;
    const y = padding.top + chartH - (p.rate / maxRate) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots + hit regions for all points
  points.forEach((p, i) => {
    const x = padding.left + ((p.timestamp - minTime) / timeRange) * chartW;
    const y = padding.top + chartH - (p.rate / maxRate) * chartH;
    const id = `spark-${i}`;
    const isHighlighted = highlightId === id;
    const dotR = isHighlighted ? 5 : (i >= points.length - 5 ? 3 : 0);

    if (dotR > 0) {
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
      if (isHighlighted) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Hit region — wider target for easier hovering
    const time = new Date(p.timestamp);
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    regions.push({
      id,
      bounds: { x: x - 8, y: y - 8, w: 16, h: 16 },
      label: timeStr,
      value: p.rate,
      color: accentColor,
      data: { timestamp: p.timestamp },
    });
  });

  // X-axis label
  ctx.fillStyle = theme.textSecondary;
  ctx.font = `10px ${FONT_LABEL}`;
  ctx.textAlign = 'center';
  ctx.fillText('EVENTS / MIN', w / 2, h - 4);

  return regions;
}

// Usage bar for HUD card (single horizontal progress bar)
export function renderUsageBar(
  canvas: HTMLCanvasElement,
  percentage: number,
  status: 'ok' | 'warning' | 'critical',
  label: string
): void {
  const ctx = setupCanvas(canvas);
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);

  const colors = {
    ok: '#00e57a',
    warning: '#ffaa00',
    critical: '#ff3f5a',
  };
  const barColor = colors[status];
  const barH = Math.min(h - 4, 14);
  const barY = (h - barH) / 2;
  const barW = Math.max((w * Math.min(percentage, 100)) / 100, 2);

  // Background track
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  roundRect(ctx, 0, barY, w, barH, 3);
  ctx.fill();

  // Fill
  ctx.fillStyle = barColor;
  ctx.beginPath();
  roundRect(ctx, 0, barY, barW, barH, 3);
  ctx.fill();

  // Glow for warning/critical
  if (status !== 'ok') {
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    roundRect(ctx, 0, barY, barW, barH, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// Multi-line time-series chart (Tool Timeline)
export interface TimeSeriesLine {
  label: string;
  color: string;
  points: { timestamp: number; value: number }[];
}

export function renderMultiLineChart(
  canvas: HTMLCanvasElement,
  lines: TimeSeriesLine[],
  hoveredSeries?: string | null
): HitRegion[] {
  const ctx = setupCanvas(canvas);
  const theme = getThemeColors();
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const regions: HitRegion[] = [];

  ctx.clearRect(0, 0, w, h);

  if (lines.length === 0 || lines.every(l => l.points.length < 2)) {
    ctx.fillStyle = theme.textSecondary;
    ctx.font = `13px ${FONT_LABEL}`;
    ctx.textAlign = 'center';
    ctx.fillText('Collecting data...', w / 2, h / 2);
    return regions;
  }

  const padding = { top: 12, right: 110, bottom: 24, left: 40 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Compute global time/value ranges
  let minTime = Infinity, maxTime = -Infinity, maxVal = 0;
  for (const line of lines) {
    for (const p of line.points) {
      if (p.timestamp < minTime) minTime = p.timestamp;
      if (p.timestamp > maxTime) maxTime = p.timestamp;
      if (p.value > maxVal) maxVal = p.value;
    }
  }
  maxVal = Math.max(maxVal, 1);
  const timeRange = maxTime - minTime || 1;

  // Grid lines
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = padding.top + (chartH * i) / 3;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();

    const val = Math.round(maxVal * (1 - i / 3));
    ctx.fillStyle = theme.textSecondary;
    ctx.font = `10px ${FONT_MONO}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), padding.left - 6, y);
  }

  // Draw lines
  for (const line of lines) {
    if (line.points.length < 2) continue;
    const isHovered = hoveredSeries === line.label;
    const isOther = hoveredSeries != null && !isHovered;

    ctx.beginPath();
    ctx.strokeStyle = isOther ? line.color + '44' : line.color;
    ctx.lineWidth = isHovered ? 3 : 1.5;
    ctx.lineJoin = 'round';

    line.points.forEach((p, i) => {
      const x = padding.left + ((p.timestamp - minTime) / timeRange) * chartW;
      const y = padding.top + chartH - (p.value / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Hit regions for points
    line.points.forEach((p, i) => {
      const x = padding.left + ((p.timestamp - minTime) / timeRange) * chartW;
      const y = padding.top + chartH - (p.value / maxVal) * chartH;
      regions.push({
        id: `timeline-${line.label}-${i}`,
        bounds: { x: x - 6, y: y - 6, w: 12, h: 12 },
        label: line.label,
        value: p.value,
        color: line.color,
        data: { series: line.label, timestamp: p.timestamp },
      });
    });
  }

  // Legend (right side)
  const legendX = padding.left + chartW + 12;
  lines.forEach((line, i) => {
    const y = padding.top + i * 18;
    const isHovered = hoveredSeries === line.label;

    ctx.fillStyle = line.color;
    ctx.beginPath();
    ctx.arc(legendX + 4, y + 8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isHovered ? theme.text : theme.textSecondary;
    ctx.font = `10px ${FONT_MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const lbl = line.label.length > 12 ? line.label.slice(0, 11) + '...' : line.label;
    ctx.fillText(lbl, legendX + 14, y + 8);

    // Legend hit region
    regions.push({
      id: `timeline-legend-${line.label}`,
      bounds: { x: legendX, y, w: 90, h: 16 },
      label: line.label,
      value: line.points.reduce((s, p) => s + p.value, 0),
      color: line.color,
      data: { series: line.label, legendItem: true },
    });
  });

  return regions;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

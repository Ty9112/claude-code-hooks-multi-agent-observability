/**
 * officeRenderer.ts — 8-bit retro pixel art office canvas renderer
 * Draws agents at desks: active agents type, idle agents sleep.
 */

export interface OfficeAgent {
  agentId: string;
  sourceApp: string;
  status: 'active' | 'idle';
  color: string;
  lastToolEmoji: string;
  lastToolName: string;
  eventCount: number;
  name: string;
}

// Pixel scale — all sprites drawn at P×P blocks
const P = 3;

// Colors
const FLOOR_LIGHT = '#1a1a2e';
const FLOOR_DARK = '#16162a';
const DESK_TOP = '#5c4033';
const DESK_FRONT = '#4a3228';
const DESK_LEG = '#3d2920';
const MONITOR_BEZEL = '#2a2a3a';
const MONITOR_IDLE = '#1a1a24';
const CHAIR_SEAT = '#3a3a50';
const CHAIR_BACK = '#30304a';
const SKIN = '#f0c8a0';
const ZZZ_COLOR = '#6688aa';

// Character body sprite (8 wide × 12 tall, row-major)
// 0=transparent, 1=hair, 2=skin, 3=shirt, 4=pants
const CHAR_SPRITE = [
  0,0,1,1,1,1,0,0,
  0,1,1,1,1,1,1,0,
  0,1,2,2,2,2,1,0,
  0,0,2,2,2,2,0,0,
  0,0,0,3,3,0,0,0,
  0,0,3,3,3,3,0,0,
  0,3,3,3,3,3,3,0,
  0,0,3,3,3,3,0,0,
  0,0,3,3,3,3,0,0,
  0,0,4,4,4,4,0,0,
  0,0,4,0,0,4,0,0,
  0,0,4,0,0,4,0,0,
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const d = 1 - amount;
  return `#${Math.round(r*d).toString(16).padStart(2,'0')}${Math.round(g*d).toString(16).padStart(2,'0')}${Math.round(b*d).toString(16).padStart(2,'0')}`;
}

interface DeskCell {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class OfficeRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private agents: OfficeAgent[] = [];
  private frameCount = 0;
  private animationId: number | null = null;
  private running = false;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas 2d context');
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.setupCanvas(canvas);
  }

  private setupCanvas(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = this.width * dpr;
    canvas.height = this.height * dpr;
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    // Crisp pixel art
    this.ctx.imageSmoothingEnabled = false;
  }

  setAgents(agents: OfficeAgent[]) {
    this.agents = agents;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const targetInterval = 1000 / 15; // 15 FPS
    let lastTime = 0;

    const loop = (time: number) => {
      if (!this.running) return;
      const delta = time - lastTime;
      if (delta >= targetInterval) {
        this.frameCount++;
        this.renderFrame();
        lastTime = time - (delta % targetInterval);
      }
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.setupCanvas(this.ctx.canvas);
  }

  destroy() {
    this.stop();
  }

  private calculateLayout(): DeskCell[] {
    const minCellW = 120;
    const minCellH = 140;
    const count = this.agents.length;
    if (count === 0) return [];

    const cols = Math.max(1, Math.floor(this.width / minCellW));
    const rows = Math.ceil(count / cols);
    const cellW = this.width / cols;
    const cellH = Math.min(this.height / rows, this.height);

    const cells: DeskCell[] = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      cells.push({
        x: col * cellW,
        y: row * cellH,
        width: cellW,
        height: Math.max(cellH, minCellH),
      });
    }
    return cells;
  }

  private renderFrame() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    // Draw checkered floor
    this.drawFloor();

    // Draw each agent at their desk
    const cells = this.calculateLayout();
    for (let i = 0; i < this.agents.length; i++) {
      if (i < cells.length) {
        this.drawAgentDesk(this.agents[i], cells[i]);
      }
    }
  }

  private drawFloor() {
    const tileSize = P * 8;
    const cols = Math.ceil(this.width / tileSize);
    const rows = Math.ceil(this.height / tileSize);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.ctx.fillStyle = (r + c) % 2 === 0 ? FLOOR_LIGHT : FLOOR_DARK;
        this.ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
      }
    }
  }

  private drawAgentDesk(agent: OfficeAgent, cell: DeskCell) {
    const cx = cell.x + cell.width / 2;
    const baseY = cell.y + cell.height * 0.85;

    // Desk
    this.drawDesk(cx, baseY);

    // Chair
    this.drawChair(cx, baseY);

    // Character sitting in chair
    this.drawCharacter(agent, cx, baseY);

    // Monitor on desk
    this.drawMonitor(agent, cx, baseY);

    // Animations
    if (agent.status === 'active') {
      this.drawTypingHands(cx, baseY);
      this.drawThoughtBubble(agent, cx, baseY);
    } else {
      this.drawZzz(cx, baseY);
    }

    // Name label
    this.drawNameLabel(agent, cx, cell.y + cell.height - 4);
  }

  private drawDesk(cx: number, baseY: number) {
    const { ctx } = this;
    const deskW = 26 * P;
    const deskH = 3 * P;
    const deskTop = baseY - 20 * P;

    // Desk top
    ctx.fillStyle = DESK_TOP;
    ctx.fillRect(cx - deskW / 2, deskTop, deskW, deskH);

    // Desk front panel
    ctx.fillStyle = DESK_FRONT;
    ctx.fillRect(cx - deskW / 2 + P, deskTop + deskH, deskW - 2 * P, 8 * P);

    // Desk legs
    ctx.fillStyle = DESK_LEG;
    ctx.fillRect(cx - deskW / 2 + P, deskTop + deskH, 2 * P, 10 * P);
    ctx.fillRect(cx + deskW / 2 - 3 * P, deskTop + deskH, 2 * P, 10 * P);
  }

  private drawChair(cx: number, baseY: number) {
    const { ctx } = this;
    const chairY = baseY - 14 * P;

    // Seat
    ctx.fillStyle = CHAIR_SEAT;
    ctx.fillRect(cx - 7 * P, chairY, 14 * P, 3 * P);

    // Back
    ctx.fillStyle = CHAIR_BACK;
    ctx.fillRect(cx - 6 * P, chairY - 8 * P, 12 * P, 8 * P);

    // Chair legs
    ctx.fillStyle = DESK_LEG;
    ctx.fillRect(cx - 5 * P, chairY + 3 * P, 2 * P, 4 * P);
    ctx.fillRect(cx + 3 * P, chairY + 3 * P, 2 * P, 4 * P);
  }

  private drawCharacter(agent: OfficeAgent, cx: number, baseY: number) {
    const { ctx } = this;
    const charX = cx - 4 * P;
    const charY = baseY - 25 * P;

    // Parse agent color for shirt
    let shirtColor = agent.color;
    let hairColor: string;
    let pantsColor: string;

    // Derive hair and pants from agent color
    try {
      hairColor = darkenHex(shirtColor, 0.6);
      pantsColor = darkenHex(shirtColor, 0.4);
    } catch {
      hairColor = '#333344';
      pantsColor = '#2a2a3a';
      shirtColor = '#4488cc';
    }

    const palette: Record<number, string> = {
      1: hairColor,
      2: SKIN,
      3: shirtColor,
      4: pantsColor,
    };

    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 8; col++) {
        const idx = CHAR_SPRITE[row * 8 + col];
        if (idx === 0) continue;
        ctx.fillStyle = palette[idx];
        ctx.fillRect(charX + col * P, charY + row * P, P, P);
      }
    }
  }

  private drawMonitor(agent: OfficeAgent, cx: number, baseY: number) {
    const { ctx, frameCount } = this;
    const monX = cx - 8 * P;
    const monY = baseY - 32 * P;
    const monW = 16 * P;
    const monH = 10 * P;

    // Bezel
    ctx.fillStyle = MONITOR_BEZEL;
    ctx.fillRect(monX, monY, monW, monH);

    // Screen
    const screenPad = P;
    const screenX = monX + screenPad;
    const screenY = monY + screenPad;
    const screenW = monW - 2 * screenPad;
    const screenH = monH - 2 * screenPad;

    if (agent.status === 'active') {
      // Glowing green screen with sine pulse
      const pulse = 0.7 + 0.3 * Math.sin(frameCount * 0.1);
      const g = Math.round(58 + 40 * pulse);
      ctx.fillStyle = `rgb(10, ${g}, 10)`;
      ctx.fillRect(screenX, screenY, screenW, screenH);

      // Scrolling "code lines"
      const lineH = P;
      const lineGap = P;
      const numLines = Math.floor(screenH / (lineH + lineGap));
      for (let i = 0; i < numLines; i++) {
        const ly = screenY + i * (lineH + lineGap);
        // Pseudo-random line width based on frame + index
        const seed = (frameCount + i * 7) % 13;
        const lineW = screenW * (0.3 + (seed / 13) * 0.6);
        const scrollOffset = ((frameCount * 2 + i * 3) % (screenH + 10)) - 5;
        const actualY = ly + (scrollOffset % (lineH + lineGap));
        if (actualY >= screenY && actualY + lineH <= screenY + screenH) {
          ctx.fillStyle = `rgba(0, 255, 60, ${0.3 + (seed / 13) * 0.4})`;
          ctx.fillRect(screenX + P, actualY, lineW - 2 * P, lineH);
        }
      }
    } else {
      // Dim gray idle screen
      ctx.fillStyle = MONITOR_IDLE;
      ctx.fillRect(screenX, screenY, screenW, screenH);
    }

    // Monitor stand
    ctx.fillStyle = MONITOR_BEZEL;
    ctx.fillRect(cx - 2 * P, monY + monH, 4 * P, 3 * P);
    ctx.fillRect(cx - 4 * P, monY + monH + 3 * P, 8 * P, P);
  }

  private drawTypingHands(cx: number, baseY: number) {
    const { ctx, frameCount } = this;
    // Alternate hand position every 8 frames
    const phase = Math.floor(frameCount / 8) % 2;
    const handY = baseY - 20 * P - P;

    ctx.fillStyle = SKIN;
    if (phase === 0) {
      // Left hand forward, right back
      ctx.fillRect(cx - 6 * P, handY, 2 * P, P);
      ctx.fillRect(cx + 3 * P, handY - P, 2 * P, P);
    } else {
      // Right hand forward, left back
      ctx.fillRect(cx - 6 * P, handY - P, 2 * P, P);
      ctx.fillRect(cx + 3 * P, handY, 2 * P, P);
    }
  }

  private drawThoughtBubble(agent: OfficeAgent, cx: number, baseY: number) {
    const { ctx } = this;

    // Measure text to size the bubble
    const toolLabel = agent.lastToolName || 'thinking...';
    const evtLabel = `${agent.eventCount} events`;
    ctx.font = `bold ${3 * P}px monospace`;
    const toolW = ctx.measureText(toolLabel).width;
    ctx.font = `${2.5 * P}px monospace`;
    const evtW = ctx.measureText(evtLabel).width;
    const textW = Math.max(toolW, evtW);

    const emojiSize = 4 * P;
    const padX = 4 * P;
    const padY = 3 * P;
    const bw = emojiSize + textW + padX * 2 + 3 * P;
    const bh = emojiSize + padY * 2;
    const bubbleX = cx + 10 * P;
    const bubbleY = baseY - 40 * P;

    // Small dots leading to bubble
    ctx.fillStyle = '#ffffff44';
    ctx.beginPath();
    ctx.arc(cx + 5 * P, baseY - 32 * P, P, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 7 * P, baseY - 35 * P, P * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Bubble background
    ctx.fillStyle = '#181828ee';
    ctx.strokeStyle = agent.color + '66';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bw, bh, 3 * P);
    ctx.fill();
    ctx.stroke();

    // Emoji on the left
    if (agent.lastToolEmoji) {
      ctx.font = `${emojiSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(agent.lastToolEmoji, bubbleX + padX + emojiSize / 2, bubbleY + bh / 2);
    }

    // Tool name — bold top line
    const textX = bubbleX + padX + emojiSize + 3 * P;
    ctx.font = `bold ${3 * P}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#e0e0ff';
    ctx.fillText(toolLabel, textX, bubbleY + padY);

    // Event count — dimmer bottom line
    ctx.font = `${2.5 * P}px monospace`;
    ctx.fillStyle = '#8888aa';
    ctx.fillText(evtLabel, textX, bubbleY + padY + 3.5 * P);
  }

  private drawZzz(cx: number, baseY: number) {
    const { ctx, frameCount } = this;
    const zCount = 3;

    for (let i = 0; i < zCount; i++) {
      const phase = (frameCount * 0.03 + i * 0.8) % 3;
      const floatY = baseY - (32 + phase * 8) * P;
      const wobbleX = cx + (8 + i * 4) * P + Math.sin(frameCount * 0.08 + i * 2) * 3 * P;
      const alpha = Math.max(0, 1 - phase / 3);
      const size = 6 + i * 2;

      ctx.font = `bold ${size * P * 0.4}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ZZZ_COLOR + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.fillText('Z', wobbleX, floatY);
    }
  }

  private drawNameLabel(agent: OfficeAgent, cx: number, y: number) {
    const { ctx } = this;
    const label = agent.name.length > 14 ? agent.name.substring(0, 12) + '..' : agent.name;

    ctx.font = `bold ${3 * P}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Background
    const metrics = ctx.measureText(label);
    const padX = 4;
    const padY = 2;
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(
      cx - metrics.width / 2 - padX,
      y - 3 * P - padY,
      metrics.width + padX * 2,
      3 * P + padY * 2
    );

    // Text
    ctx.fillStyle = agent.color;
    ctx.fillText(label, cx, y);

    // Status dot
    const dotRadius = P;
    ctx.beginPath();
    ctx.arc(cx - metrics.width / 2 - padX - dotRadius * 2, y - 3 * P / 2, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = agent.status === 'active' ? '#00e57a' : '#ff3f5a';
    ctx.fill();
  }
}

export function createOfficeRenderer(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): OfficeRenderer {
  return new OfficeRenderer(canvas, width, height);
}

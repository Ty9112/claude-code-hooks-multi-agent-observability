// Hit region manager for canvas chart interactivity
// DPR-aware coordinate translation matching setupCanvas pattern from analyticsRenderer.ts

export interface HitRegion {
  id: string;
  bounds: { x: number; y: number; w: number; h: number };
  label: string;
  value: number;
  color: string;
  data?: Record<string, any>;
}

export interface ArcRegion extends HitRegion {
  data: {
    type: 'arc';
    cx: number;
    cy: number;
    innerR: number;
    outerR: number;
    startAngle: number;
    endAngle: number;
    percentage: number;
  };
}

export type HoverCallback = (region: HitRegion | null, x: number, y: number) => void;
export type ClickCallback = (region: HitRegion) => void;

export class CanvasInteractionManager {
  private canvas: HTMLCanvasElement;
  private regions: HitRegion[] = [];
  private onHover: HoverCallback;
  private onClick: ClickCallback;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseLeave: () => void;
  private boundClick: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement, onHover: HoverCallback, onClick: ClickCallback) {
    this.canvas = canvas;
    this.onHover = onHover;
    this.onClick = onClick;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseLeave = this.handleMouseLeave.bind(this);
    this.boundClick = this.handleClick.bind(this);

    canvas.addEventListener('mousemove', this.boundMouseMove);
    canvas.addEventListener('mouseleave', this.boundMouseLeave);
    canvas.addEventListener('click', this.boundClick);
    canvas.style.cursor = 'default';
  }

  setRegions(regions: HitRegion[]) {
    this.regions = regions;
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private hitTest(x: number, y: number): HitRegion | null {
    // Reverse iterate so topmost regions match first
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];

      // Arc/donut region
      if (r.data?.type === 'arc') {
        const arc = r.data as ArcRegion['data'];
        const dx = x - arc.cx;
        const dy = y - arc.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < arc.innerR || dist > arc.outerR) continue;

        let angle = Math.atan2(dy, dx);
        // Normalize angles for comparison
        const normStart = ((arc.startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const normEnd = ((arc.endAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const normAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        if (normStart <= normEnd) {
          if (normAngle >= normStart && normAngle <= normEnd) return r;
        } else {
          // Wraps around 0
          if (normAngle >= normStart || normAngle <= normEnd) return r;
        }
        continue;
      }

      // Rect region
      const b = r.bounds;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return r;
      }
    }
    return null;
  }

  private handleMouseMove(e: MouseEvent) {
    const { x, y } = this.getCanvasCoords(e);
    const region = this.hitTest(x, y);
    this.canvas.style.cursor = region ? 'pointer' : 'default';
    this.onHover(region, e.clientX, e.clientY);
  }

  private handleMouseLeave() {
    this.canvas.style.cursor = 'default';
    this.onHover(null, 0, 0);
  }

  private handleClick(e: MouseEvent) {
    const { x, y } = this.getCanvasCoords(e);
    const region = this.hitTest(x, y);
    if (region) this.onClick(region);
  }

  destroy() {
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseleave', this.boundMouseLeave);
    this.canvas.removeEventListener('click', this.boundClick);
  }
}

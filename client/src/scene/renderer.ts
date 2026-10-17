// The rear-view coastal road. A small pseudo-3D canvas renderer:
// banded poster sky, Mediterranean on the right (we're driving south),
// dunes and a growing city on the left, and Tel Aviv rising at the
// vanishing point as distance increases.
import type { Tier } from '../../../shared/types';

export interface JourneyOptions {
  /** Where the road/van sit horizontally (0..1 of the canvas). */
  focusX: number;
  /** Horizon height as a fraction of canvas height. */
  horizon: number;
  /** Van width relative to min(W, H*1.4). */
  vanScale: number;
  reducedMotion: boolean;
  /** Fireworks + city lights at the finale. */
  party: boolean;
}

const DEST_KM = 300;
const Z_FAR = 46;
const SEG = 1.6;

const C = {
  navy: '#13213F',
  ink: '#0B1530',
  van: '#2F5BEA',
  vanDark: '#2147C4',
  cream: '#FFF6E3',
  sand: '#F2DDB0',
  sun: '#FFC93C',
  coral: '#F2674A',
  sea: '#1C7FB8',
  palm: '#2E7D5B',
  palmDark: '#1F5E44',
  trunk: '#8A5A3B',
  asphalt: '#373C4E',
  asphalt2: '#3D4357',
  plate: '#F7C600',
};

const SKY_DAY = ['#3C72B4', '#5B8FC7', '#86AFD4', '#B5CFE0', '#E3DCC4', '#F4E4B8'];
const SKY_DUSK = ['#1E2A5C', '#3A3E7C', '#87507F', '#DD6A5A', '#F49B4E', '#FFD37C'];
const BAND_STOPS = [0, 0.3, 0.52, 0.7, 0.84, 0.94, 1];

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(x[0] + (y[0] - x[0]) * k)},${Math.round(x[1] + (y[1] - x[1]) * k)},${Math.round(x[2] + (y[2] - x[2]) * k)})`;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

type ObjKind = 'palm' | 'lamp' | 'sign' | 'grass' | 'umbrella' | 'lifeguard' | 'block' | 'tower' | 'bush';
interface RoadObj {
  kind: ObjKind;
  x: number; // world lateral (road half-width = 1)
  z: number;
  seed: number;
  label?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  spin: number;
  kind: 'confetti' | 'puff' | 'spark';
}

interface Building {
  x: number; // -1..1 relative to skyline half width
  w: number;
  h: number; // relative to skyline height unit
  kind: 'slab' | 'round' | 'tri' | 'square' | 'spire' | 'stack' | 'bauhaus' | 'chimney' | 'crane' | 'hotel' | 'tapered';
  row: 0 | 1; // 0 = far, 1 = nearer (appears later)
  appear?: number; // min progress to show
}

// Tel Aviv-inspired silhouettes (not to scale): Azrieli-style round /
// triangle / square trio, tall tapered towers, white Bauhaus blocks,
// beachfront hotels and a striped power-station chimney near the coast.
const SKYLINE: Building[] = [
  { x: -0.98, w: 0.07, h: 0.18, kind: 'bauhaus', row: 0 },
  { x: -0.9, w: 0.06, h: 0.42, kind: 'slab', row: 0 },
  { x: -0.82, w: 0.05, h: 0.62, kind: 'spire', row: 0 },
  { x: -0.74, w: 0.08, h: 0.24, kind: 'bauhaus', row: 0 },
  { x: -0.64, w: 0.07, h: 0.55, kind: 'stack', row: 0 },
  { x: -0.55, w: 0.05, h: 0.33, kind: 'slab', row: 0 },
  { x: -0.46, w: 0.065, h: 0.78, kind: 'round', row: 0 },
  { x: -0.37, w: 0.065, h: 0.74, kind: 'tri', row: 0 },
  { x: -0.28, w: 0.065, h: 0.7, kind: 'square', row: 0 },
  { x: -0.18, w: 0.06, h: 1.0, kind: 'tapered', row: 0 },
  { x: -0.09, w: 0.05, h: 0.5, kind: 'slab', row: 0 },
  { x: -0.01, w: 0.07, h: 0.86, kind: 'stack', row: 0 },
  { x: 0.09, w: 0.045, h: 0.58, kind: 'slab', row: 0 },
  { x: 0.17, w: 0.06, h: 0.66, kind: 'spire', row: 0 },
  { x: 0.27, w: 0.09, h: 0.3, kind: 'hotel', row: 0 },
  { x: 0.38, w: 0.08, h: 0.36, kind: 'hotel', row: 0 },
  { x: 0.48, w: 0.07, h: 0.27, kind: 'hotel', row: 0 },
  { x: 0.57, w: 0.018, h: 0.72, kind: 'chimney', row: 0 },
  { x: -0.6, w: 0.12, h: 0.92, kind: 'crane', row: 0, appear: 0.35 },
  { x: 0.05, w: 0.1, h: 1.08, kind: 'crane', row: 0, appear: 0.5 },
  // nearer row: appears as you approach
  { x: -0.86, w: 0.12, h: 0.2, kind: 'bauhaus', row: 1, appear: 0.45 },
  { x: -0.69, w: 0.1, h: 0.28, kind: 'slab', row: 1, appear: 0.55 },
  { x: -0.5, w: 0.13, h: 0.17, kind: 'bauhaus', row: 1, appear: 0.5 },
  { x: -0.3, w: 0.1, h: 0.34, kind: 'slab', row: 1, appear: 0.62 },
  { x: -0.13, w: 0.12, h: 0.22, kind: 'bauhaus', row: 1, appear: 0.58 },
  { x: 0.1, w: 0.11, h: 0.3, kind: 'hotel', row: 1, appear: 0.66 },
  { x: 0.31, w: 0.12, h: 0.21, kind: 'hotel', row: 1, appear: 0.6 },
];

function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export class JourneyRenderer {
  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private raf = 0;
  private last = 0;
  private time = 0;
  private travel = 0;
  private speed = 0;
  private displayKm = 0;
  private fromKm = 0;
  private toKm = 0;
  private animStart = 0;
  private animDur = 0;
  private objects: RoadObj[] = [];
  private particles: Particle[] = [];
  private flare = 0;
  private fireworkTimer = 0;
  private resizeObs: ResizeObserver;
  private running = false;
  opts: JourneyOptions;

  constructor(private canvas: HTMLCanvasElement, opts: Partial<JourneyOptions> = {}) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.opts = { focusX: 0.5, horizon: 0.5, vanScale: 1, reducedMotion: false, party: false, ...opts };
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.resize();
    this.seedObjects();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
  }

  setOptions(o: Partial<JourneyOptions>) {
    Object.assign(this.opts, o);
    if (!this.running) this.drawFrame();
  }

  /** Jump without animation (initial render, restored sessions). */
  setKmInstant(km: number) {
    this.displayKm = this.fromKm = this.toKm = km;
    this.animDur = 0;
    if (!this.running) this.drawFrame();
  }

  /** Animate forward: bigger awards travel longer and faster. */
  driveTo(km: number) {
    if (km === this.toKm) return;
    if (km < this.toKm) return this.setKmInstant(km);
    const delta = km - this.displayKm;
    this.fromKm = this.displayKm;
    this.toKm = km;
    this.animStart = performance.now();
    this.animDur = this.opts.reducedMotion ? 350 : 900 + Math.min(delta, 60) * 34;
  }

  celebrate(tier: Tier | null) {
    if (!tier || this.opts.reducedMotion) return;
    if (tier === 'rare' || tier === 'gem') this.burst(tier === 'gem' ? 140 : 70);
    if (tier === 'gem') this.flare = 1;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.update(dt, t);
      this.drawFrame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
    this.W = Math.max(1, rect.width);
    this.H = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    if (!this.running) this.drawFrame();
  }

  // ── simulation ─────────────────────────────────────────────
  private seedObjects() {
    this.objects = [];
    for (let z = 2; z < Z_FAR; z += 2.2) this.objects.push(this.makeObj(z, Math.random() * 1000));
  }

  private makeObj(z: number, seed: number): RoadObj {
    const p = this.progress();
    const r = rand(seed);
    const r2 = rand(seed + 7.1);
    const city = p > 0.55;
    // right side = beach between road and sea; left side = land / city
    if (r < 0.42) {
      // right (beach)
      if (p > 0.3 && r2 < 0.18) return { kind: 'lifeguard', x: 2.5 + r2 * 2, z, seed };
      if (p > 0.18 && r2 < 0.45) return { kind: 'umbrella', x: 2.2 + r2 * 2.5, z, seed };
      return { kind: 'palm', x: 1.6 + r2 * 0.8, z, seed };
    }
    if (r < 0.52) {
      const left = Math.max(0, Math.round(DEST_KM - this.toKm));
      return { kind: 'sign', x: -1.5, z, seed, label: left > 0 ? String(left) : '0' };
    }
    if (city && r2 < 0.6) return { kind: r2 < 0.3 ? 'tower' : 'block', x: -3.2 - r2 * 3, z, seed };
    if (p > 0.15 && r2 < 0.35) return { kind: 'lamp', x: -1.35, z, seed };
    if (r2 < 0.6) return { kind: 'palm', x: -1.7 - r2 * 1.2, z, seed };
    return { kind: r2 < 0.8 ? 'grass' : 'bush', x: -2 - r2 * 3, z, seed };
  }

  private progress() {
    return clamp01(this.displayKm / DEST_KM);
  }

  private update(dt: number, now: number) {
    this.time += dt;
    let kmRate = 0;
    if (this.animDur > 0) {
      const t = clamp01((now - this.animStart) / this.animDur);
      const prev = this.displayKm;
      this.displayKm = lerp(this.fromKm, this.toKm, easeInOut(t));
      kmRate = dt > 0 ? (this.displayKm - prev) / dt : 0;
      if (t >= 1) {
        this.animDur = 0;
        this.displayKm = this.toKm;
      }
    }
    const idle = this.opts.reducedMotion ? 0 : 5;
    const target = idle + (this.opts.reducedMotion ? 0 : kmRate * 2.1);
    this.speed += (target - this.speed) * Math.min(1, dt * 4);
    this.travel += this.speed * dt;

    // recycle roadside objects
    for (const o of this.objects) {
      o.z -= this.speed * dt * 0.5;
      if (o.z < 0.55) Object.assign(o, this.makeObj(o.z + Z_FAR - 2, Math.random() * 1000));
    }

    // exhaust
    if (!this.opts.reducedMotion && Math.random() < dt * (3 + this.speed * 0.15)) this.puff();

    // particles
    for (const pt of this.particles) {
      pt.life += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.kind === 'confetti') {
        pt.vy += 520 * dt;
        pt.vx *= 0.985;
      } else if (pt.kind === 'spark') {
        pt.vy += 60 * dt;
        pt.vx *= 0.97;
        pt.vy *= 0.97;
      } else {
        pt.vy -= 8 * dt;
        pt.size += dt * 18;
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    this.flare = Math.max(0, this.flare - dt * 0.45);

    if (this.opts.party && !this.opts.reducedMotion) {
      this.fireworkTimer -= dt;
      if (this.fireworkTimer <= 0) {
        this.firework();
        this.fireworkTimer = 0.45 + Math.random() * 0.6;
      }
    }
  }

  private burst(n: number) {
    const { vx, vy } = this.vanBox();
    const colors = [C.sun, C.coral, C.cream, '#7FD1F0', C.van, '#FF9EC4'];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const s = 380 + Math.random() * 520;
      this.particles.push({
        x: vx + (Math.random() - 0.5) * 40,
        y: vy - 10,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0,
        max: 1.6 + Math.random() * 0.8,
        color: colors[i % colors.length],
        size: 5 + Math.random() * 6,
        spin: Math.random() * 10,
        kind: 'confetti',
      });
    }
  }

  private firework() {
    const L = this.layout();
    const { hy, vpX, skyHalf } = L;
    const cx = vpX + (Math.random() - 0.5) * skyHalf * 1.6;
    const cy = hy - (0.25 + Math.random() * 0.45) * hy;
    const colors = [C.sun, C.coral, C.cream, '#7FD1F0', '#FF9EC4'];
    const col = colors[Math.floor(Math.random() * colors.length)];
    const n = 48;
    const power = Math.min(L.W, L.H) * 0.22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = power * (0.75 + Math.random() * 0.5);
      this.particles.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 1.3, color: col, size: 2.6, spin: 0, kind: 'spark' });
    }
  }

  private puff() {
    const { vx, vy, vw } = this.vanBox();
    this.particles.push({
      x: vx - vw * 0.3,
      y: vy - vw * 0.03,
      vx: -10 - Math.random() * 20,
      vy: 10 + Math.random() * 10,
      life: 0,
      max: 0.9,
      color: 'rgba(255,246,227,0.55)',
      size: vw * 0.02,
      spin: 0,
      kind: 'puff',
    });
  }

  // ── geometry ───────────────────────────────────────────────
  private layout() {
    const { W, H } = this;
    const hy = H * this.opts.horizon;
    const roadHalf = Math.min(W * 0.5, H * 0.95) * 0.62;
    const curve = this.opts.reducedMotion ? 0 : Math.sin(this.travel * 0.006) * 0.35;
    const baseX = W * this.opts.focusX;
    const vpX = baseX + curve * roadHalf;
    const p = this.progress();
    const e = easeOut(p);
    const grow = Math.pow(p, 1.25);
    const skyHalf = lerp(0.06, 0.44, grow) * Math.min(W, H * 1.9) * (W < 600 ? 1.05 : 0.8);
    return { W, H, hy, roadHalf, curve, baseX, vpX, p, e, skyHalf };
  }

  /** Project a world point (x lateral, z depth) to the screen. */
  private project(x: number, z: number, L: ReturnType<JourneyRenderer['layout']>) {
    const s = 1 / z;
    const y = L.hy + (L.H - L.hy) * s;
    const bend = L.curve * Math.pow(1 - s, 2) * L.roadHalf;
    const sx = L.baseX + bend + x * L.roadHalf * s;
    return { x: sx, y, s };
  }

  private vanBox() {
    const L = this.layout();
    const vw = Math.min(L.W * 0.25, L.H * 0.36) * this.opts.vanScale;
    const lane = this.project(0.36, 1.25, L);
    const bob = this.opts.reducedMotion ? 0 : Math.sin(this.time * 11) * (0.6 + this.speed * 0.03) + Math.sin(this.time * 2.3) * 0.8;
    const surge = this.opts.reducedMotion ? 0 : Math.min(1, this.speed / 60);
    return { vx: lane.x, vy: L.H - L.H * 0.04 + bob - surge * L.H * 0.025, vw: vw * (1 - surge * 0.06), surge };
  }

  // ── drawing ────────────────────────────────────────────────
  private drawFrame() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const L = this.layout();
    this.drawSky(L);
    this.drawSun(L);
    this.drawClouds(L);
    this.drawSkyline(L);
    this.drawGround(L);
    this.drawRoad(L);
    this.drawObjects(L);
    this.drawSpeedLines(L);
    this.drawParticles('puff');
    this.drawVan();
    this.drawParticles('confetti');
    this.drawParticles('spark');
    if (this.flare > 0) this.drawFlare(L);
  }

  private drawSky(L: ReturnType<JourneyRenderer['layout']>) {
    const ctx = this.ctx;
    const t = L.p * 0.85 + (this.opts.party ? 0.15 : 0);
    for (let i = 0; i < SKY_DAY.length; i++) {
      const y0 = BAND_STOPS[i] * L.hy;
      const y1 = BAND_STOPS[i + 1] * L.hy;
      ctx.fillStyle = mix(SKY_DAY[i], SKY_DUSK[i], t);
      ctx.fillRect(0, y0, L.W, y1 - y0 + 1);
    }
  }

  private sunPos(L: ReturnType<JourneyRenderer['layout']>) {
    const r = Math.min(L.W, L.H) * 0.085;
    const x = Math.min(L.W - r * 1.4, L.vpX + Math.min(L.W * 0.14, L.roadHalf * 0.55));
    const y = L.hy - lerp(L.hy * 0.62, r * 0.35, easeOut(L.p));
    return { x, y, r };
  }

  private drawSun(L: ReturnType<JourneyRenderer['layout']>) {
    const ctx = this.ctx;
    const { x, y, r } = this.sunPos(L);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, L.W, L.hy);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,233,170,0.18)';
    ctx.beginPath();
    ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,233,170,0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mix('#FFF1C1', '#FFE08A', L.p);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawClouds(L: ReturnType<JourneyRenderer['layout']>) {
    const ctx = this.ctx;
    const drift = this.time * 4 + this.travel * 0.2;
    ctx.fillStyle = mix('#FFFFFF', '#FFD9B0', L.p);
    ctx.globalAlpha = 0.55;
    const clouds = [
      [0.12, 0.2, 0.2],
      [0.55, 0.12, 0.26],
      [0.85, 0.3, 0.16],
      [0.35, 0.36, 0.12],
    ];
    for (const [cx, cy, w] of clouds) {
      const span = L.W * 1.3;
      const x = (((cx * L.W + drift) % span) + span) % span - L.W * 0.15;
      const y = cy * L.hy;
      const cw = w * L.W;
      const ch = Math.max(5, cw * 0.06);
      this.roundRect(x, y, cw, ch, ch / 2);
      ctx.fill();
      this.roundRect(x + cw * 0.18, y - ch * 0.9, cw * 0.5, ch, ch / 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // gulls
    ctx.strokeStyle = 'rgba(19,33,63,0.55)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const gx = ((this.time * 18 + i * 140) % (L.W + 200)) - 100;
      const gy = L.hy * (0.28 + i * 0.07) + Math.sin(this.time * 2 + i) * 4;
      const s = 6 + i * 1.5;
      const flap = Math.sin(this.time * 7 + i * 2) * 2;
      ctx.beginPath();
      ctx.moveTo(gx - s, gy - flap);
      ctx.quadraticCurveTo(gx - s / 2, gy - s / 2, gx, gy);
      ctx.quadraticCurveTo(gx + s / 2, gy - s / 2, gx + s, gy - flap);
      ctx.stroke();
    }
  }

  private drawSkyline(L: ReturnType<JourneyRenderer['layout']>) {
    const ctx = this.ctx;
    const { p, skyHalf, hy } = L;
    const unit = Math.min(skyHalf * 0.56, hy * 0.62);
    const cx = L.vpX - skyHalf * 0.18;
    const haze = mix(SKY_DAY[5], SKY_DUSK[5], p);
    const clarity = 0.18 + 0.72 * Math.pow(p, 0.9);

    // far hills (left)
    ctx.fillStyle = mix(haze, '#7E7AA6', 0.45);
    ctx.beginPath();
    ctx.moveTo(0, hy);
    for (let x = 0; x <= L.vpX; x += 12) {
      const h = (Math.sin(x * 0.012) * 0.5 + Math.sin(x * 0.031 + 1) * 0.3 + 0.9) * L.H * 0.022;
      ctx.lineTo(x, hy - h);
    }
    ctx.lineTo(L.vpX, hy);
    ctx.closePath();
    ctx.fill();

    for (const row of [0, 1] as const) {
      const rowScale = row === 0 ? 1 : 1.08;
      const base = row === 0 ? mix(haze, '#3B4A7A', clarity) : mix(haze, '#2A3765', Math.min(1, clarity + 0.1));
      for (const b of SKYLINE) {
        if (b.row !== row) continue;
        const appear = b.appear ?? 0;
        if (p < appear) continue;
        const grow = clamp01((p - appear) / 0.12);
        const bx = cx + b.x * skyHalf * rowScale;
        const bw = Math.max(1.5, b.w * skyHalf);
        const bh = b.h * unit * (row === 1 ? 0.9 : 1) * (b.appear ? grow : 1);
        this.drawBuilding(b, bx, hy, bw, bh, base, p, clarity);
      }
    }
  }

  private drawBuilding(b: Building, x: number, base: number, w: number, h: number, color: string, p: number, clarity: number) {
    const ctx = this.ctx;
    const top = base - h;
    const light = mix(color, '#FFF6E3', 0.22);
    const windows = p > 0.42 && w > 7;
    const lit = this.opts.party || p > 0.8;
    ctx.fillStyle = color;
    switch (b.kind) {
      case 'round': {
        this.roundRect(x - w / 2, top, w, h, Math.min(w / 2, 6));
        ctx.fill();
        ctx.fillStyle = light;
        ctx.fillRect(x - w * 0.12, top + 3, w * 0.12, h - 3);
        break;
      }
      case 'tri': {
        ctx.fillRect(x - w / 2, top, w, h);
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + w / 2, top + w * 0.15);
        ctx.lineTo(x + w / 2, base);
        ctx.lineTo(x, base);
        ctx.closePath();
        ctx.globalAlpha = 0.35;
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'square':
        ctx.fillRect(x - w / 2, top, w, h);
        ctx.fillRect(x - w * 0.2, top - h * 0.05, w * 0.4, h * 0.05);
        break;
      case 'spire':
        ctx.fillRect(x - w / 2, top + h * 0.08, w, h * 0.92);
        ctx.fillRect(x - 1, top - h * 0.06, 2, h * 0.16);
        break;
      case 'tapered':
        ctx.beginPath();
        ctx.moveTo(x - w / 2, base);
        ctx.lineTo(x - w * 0.36, top);
        ctx.lineTo(x + w * 0.36, top + w * 0.25);
        ctx.lineTo(x + w / 2, base);
        ctx.closePath();
        ctx.fill();
        break;
      case 'stack': {
        const n = 4;
        for (let i = 0; i < n; i++) {
          const segH = h / n;
          const off = (i % 2 === 0 ? -1 : 1) * w * 0.12;
          ctx.fillRect(x - w / 2 + off * (i / n), base - segH * (i + 1), w * (1 - i * 0.06), segH + 1);
        }
        break;
      }
      case 'bauhaus': {
        ctx.fillStyle = mix(color, '#FFF6E3', 0.55 * clarity + 0.1);
        this.roundRect(x - w / 2, top, w, h, Math.min(4, w * 0.2));
        ctx.fill();
        if (w > 10) {
          ctx.fillStyle = mix(color, '#13213F', 0.2);
          const bands = Math.max(1, Math.floor(h / 6));
          for (let i = 1; i <= bands; i++) ctx.fillRect(x - w / 2 + 2, top + (i * h) / (bands + 1), w - 4, Math.max(1, h * 0.04));
        }
        return;
      }
      case 'hotel':
        ctx.fillRect(x - w / 2, top, w, h);
        ctx.fillStyle = light;
        ctx.fillRect(x - w / 2, top, w, Math.max(1, h * 0.06));
        break;
      case 'chimney': {
        ctx.fillStyle = mix(color, '#E9E2D2', clarity * 0.7);
        ctx.fillRect(x - w / 2, top, w, h);
        ctx.fillStyle = mix(color, '#D9473B', clarity * 0.9);
        for (let i = 0; i < 4; i++) ctx.fillRect(x - w / 2, top + (i * h) / 7, w, h / 14);
        return;
      }
      case 'crane': {
        ctx.strokeStyle = mix(color, '#F2B33D', clarity * 0.8);
        ctx.lineWidth = Math.max(1, w * 0.05);
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.lineTo(x, top);
        ctx.moveTo(x - w * 0.35, top + 2);
        ctx.lineTo(x + w * 0.65, top + 2);
        ctx.moveTo(x + w * 0.5, top + 2);
        ctx.lineTo(x + w * 0.5, top + h * 0.22 + Math.sin(this.time) * 2);
        ctx.stroke();
        return;
      }
      default:
        ctx.fillRect(x - w / 2, top, w, h);
    }
    if (windows) {
      ctx.fillStyle = lit ? 'rgba(255,214,120,0.85)' : 'rgba(255,246,227,0.28)';
      const cols = Math.max(1, Math.floor(w / 6));
      const rows = Math.max(1, Math.floor(h / 8));
      for (let r = 1; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rand(b.x * 100 + r * 7 + c) < (lit ? 0.45 : 0.3)) continue;
          ctx.fillRect(x - w / 2 + 2 + c * ((w - 4) / cols), top + r * (h / rows), Math.max(1, (w - 4) / cols - 2), Math.max(1, h / rows / 3));
        }
      }
    }
  }

  private drawGround(L: ReturnType<JourneyRenderer['layout']>) {
    const ctx = this.ctx;
    const { W, H, hy, p } = L;
    // land on the left
    ctx.fillStyle = mix('#E3C890', '#D7AE78', p);
    ctx.fillRect(0, hy, W, H - hy);
    // dune bands with perspective
    // soft dune mounds that scroll toward the camera
    ctx.fillStyle = mix('#D9BC82', '#C99A63', p);
    for (let i = 0; i < 5; i++) {
      const z = ((i * 9.3 - this.travel * 0.5) % 46 + 46) % 46 + 3;
      const base = this.project(-2.2 - (i % 3) * 2.5, z, L);
      const w = L.roadHalf * (3.2 + (i % 2) * 2) / z;
      const h = w * 0.16;
      if (base.x + w < 0) continue;
      ctx.beginPath();
      ctx.ellipse(base.x - w * 0.4, base.y, w, h, 0, Math.PI, 0);
      ctx.fill();
    }

    // beach + sea on the right
    const seaCol = mix('#1E86C0', '#235E96', p);
    const beachCol = mix('#F4E1B5', '#EBC793', p);
    const steps = 28;
    const ptsShore: { x: number; y: number }[] = [];
    const ptsRoad: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const z = 1 + Math.pow(i / steps, 2.2) * (Z_FAR * 3);
      ptsShore.push(this.project(3.6, z, L));
      ptsRoad.push(this.project(1.15, z, L));
    }
    // sea: everything right of the shoreline
    ctx.fillStyle = seaCol;
    ctx.beginPath();
    ctx.moveTo(W, hy);
    ctx.lineTo(L.vpX, hy);
    for (let i = steps; i >= 0; i--) ctx.lineTo(ptsShore[i].x, ptsShore[i].y);
    ctx.lineTo(W + 10, H);
    ctx.closePath();
    ctx.fill();
    // beach strip
    ctx.fillStyle = beachCol;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) ctx.lineTo(ptsShore[i].x, ptsShore[i].y);
    for (let i = steps; i >= 0; i--) ctx.lineTo(ptsRoad[i].x, ptsRoad[i].y);
    ctx.closePath();
    ctx.fill();
    // foam line
    ctx.strokeStyle = 'rgba(255,246,227,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const pnt = ptsShore[i];
      const wob = Math.sin(this.time * 2 + i * 0.9) * 3 * (pnt.y - hy) / (H - hy);
      ctx.lineTo(pnt.x + wob, pnt.y);
    }
    ctx.stroke();
    // sun reflection + glints on the water
    const sun = this.sunPos(L);
    ctx.fillStyle = mix('#FFE7A3', '#FFC36B', p);
    for (let i = 0; i < 9; i++) {
      const yy = hy + 3 + i * i * 2.4 + ((this.time * 6) % 3);
      const ww = sun.r * (1.4 - i * 0.12) * (0.8 + 0.2 * Math.sin(this.time * 3 + i));
      if (yy > H) break;
      ctx.globalAlpha = 0.75 - i * 0.07;
      ctx.fillRect(sun.x - ww / 2, yy, ww, 2 + i * 0.3);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,246,227,0.5)';
    for (let i = 0; i < 18; i++) {
      const z = ((rand(i) * 40 - this.travel * 0.5) % 40 + 40) % 40 + 1.5;
      const pt = this.project(4.5 + rand(i + 3) * 18, z, L);
      if (pt.x > W) continue;
      const ww = Math.max(2, 30 * pt.s);
      ctx.fillRect(pt.x, pt.y, ww, Math.max(1, 3 * pt.s));
    }
  }

  private drawRoad(L: ReturnType<JourneyRenderer['layout']>) {
    const ctx = this.ctx;
    const segs: number[] = [];
    const offset = (this.travel * 0.5) % (SEG * 2);
    for (let z = 1 - offset; z < Z_FAR * 2.5; z += SEG) segs.push(z);
    // asphalt base
    const nearL = this.project(-1.1, 0.95, L);
    const nearR = this.project(1.1, 0.95, L);
    ctx.fillStyle = C.asphalt;
    ctx.beginPath();
    ctx.moveTo(nearL.x, L.H);
    ctx.lineTo(L.vpX - 0.5, L.hy);
    ctx.lineTo(L.vpX + 0.5, L.hy);
    ctx.lineTo(nearR.x, L.H);
    ctx.closePath();
    ctx.fill();
    // banding, curbs and lane dashes
    for (let i = 0; i < segs.length - 1; i++) {
      const z1 = segs[i + 1];
      if (z1 <= 0.9) continue; // behind the camera
      const z0 = Math.max(0.85, segs[i]);
      const even = Math.round((segs[i] + offset) / SEG) % 2 === 0;
      const a0 = this.project(-1.1, z0, L);
      const b0 = this.project(1.1, z0, L);
      const a1 = this.project(-1.1, z1, L);
      const b1 = this.project(1.1, z1, L);
      if (even) {
        ctx.fillStyle = C.asphalt2;
        this.quad(a0, b0, b1, a1);
      }
      // curbs
      const c0 = this.project(-1.22, z0, L);
      const c1 = this.project(-1.22, z1, L);
      const d0 = this.project(1.22, z0, L);
      const d1 = this.project(1.22, z1, L);
      ctx.fillStyle = even ? C.cream : C.navy;
      this.quad(c0, a0, a1, c1);
      this.quad(b0, d0, d1, b1);
      // edge lines
      ctx.fillStyle = C.sun;
      const e0 = this.project(-1.0, z0, L);
      const e1 = this.project(-1.0, z1, L);
      const f0 = this.project(-0.95, z0, L);
      const f1 = this.project(-0.95, z1, L);
      this.quad(e0, f0, f1, e1);
      ctx.fillStyle = C.cream;
      const g0 = this.project(0.95, z0, L);
      const g1 = this.project(0.95, z1, L);
      const h0 = this.project(1.0, z0, L);
      const h1 = this.project(1.0, z1, L);
      this.quad(g0, h0, h1, g1);
      if (even) {
        const m0 = this.project(-0.03, z0, L);
        const n0 = this.project(0.03, z0, L);
        const m1 = this.project(-0.03, Math.max(z0 + 0.05, segs[i] + SEG * 0.55), L);
        const n1 = this.project(0.03, Math.max(z0 + 0.05, segs[i] + SEG * 0.55), L);
        this.quad(m0, n0, n1, m1);
      }
    }
  }

  private quad(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }

  private drawObjects(L: ReturnType<JourneyRenderer['layout']>) {
    const sorted = [...this.objects].sort((a, b) => b.z - a.z);
    for (const o of sorted) {
      const pt = this.project(o.x, o.z, L);
      if (pt.y < L.hy) continue;
      const k = pt.s * L.roadHalf; // pixels per world unit at this depth
      const fade = clamp01((Z_FAR - o.z) / 8);
      this.ctx.globalAlpha = fade;
      switch (o.kind) {
        case 'palm':
          this.drawPalm(pt.x, pt.y, k, o.seed);
          break;
        case 'lamp':
          this.drawLamp(pt.x, pt.y, k);
          break;
        case 'sign':
          this.drawSign(pt.x, pt.y, k, o.label ?? '');
          break;
        case 'umbrella':
          this.drawUmbrella(pt.x, pt.y, k, o.seed);
          break;
        case 'lifeguard':
          this.drawLifeguard(pt.x, pt.y, k);
          break;
        case 'block':
        case 'tower':
          this.drawRoadsideBuilding(pt.x, pt.y, k, o.kind === 'tower', o.seed, L.p);
          break;
        case 'grass':
        case 'bush':
          this.drawGrass(pt.x, pt.y, k, o.kind === 'bush');
          break;
      }
      this.ctx.globalAlpha = 1;
    }
  }

  private drawPalm(x: number, y: number, k: number, seed: number) {
    const ctx = this.ctx;
    const h = k * (2.4 + rand(seed) * 0.8);
    const lean = (rand(seed + 1) - 0.5) * k * 0.6;
    const sway = this.opts.reducedMotion ? 0 : Math.sin(this.time * 1.4 + seed) * k * 0.05;
    const topX = x + lean + sway;
    const topY = y - h;
    ctx.strokeStyle = C.trunk;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, k * 0.11);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.2, y - h * 0.5, topX, topY);
    ctx.stroke();
    // trunk rings
    if (k > 30) {
      ctx.strokeStyle = 'rgba(19,33,63,0.25)';
      ctx.lineWidth = Math.max(1, k * 0.02);
      for (let i = 1; i < 7; i++) {
        const t = i / 7;
        const px = x + (topX - x) * t;
        const py = y + (topY - y) * t;
        ctx.beginPath();
        ctx.moveTo(px - k * 0.05, py);
        ctx.lineTo(px + k * 0.05, py);
        ctx.stroke();
      }
    }
    // fronds
    const fronds = 7;
    for (let i = 0; i < fronds; i++) {
      const a = Math.PI + (i / (fronds - 1)) * Math.PI + (rand(seed + i) - 0.5) * 0.3;
      const len = k * (0.95 + rand(seed + i * 3) * 0.35);
      const ex = topX + Math.cos(a) * len;
      const ey = topY + Math.sin(a) * len * 0.55 + len * 0.35;
      ctx.fillStyle = i % 2 ? C.palm : C.palmDark;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.5, topY + Math.sin(a) * len * 0.6 - len * 0.25, ex, ey);
      ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.45, topY + Math.sin(a) * len * 0.4 - len * 0.05, topX, topY);
      ctx.fill();
    }
    ctx.fillStyle = '#6B4A2F';
    ctx.beginPath();
    ctx.arc(topX, topY + k * 0.04, Math.max(1, k * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLamp(x: number, y: number, k: number) {
    const ctx = this.ctx;
    const h = k * 2.2;
    ctx.strokeStyle = '#4A5068';
    ctx.lineWidth = Math.max(1, k * 0.05);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + k * 0.45, y - h);
    ctx.stroke();
    ctx.fillStyle = this.progress() > 0.75 || this.opts.party ? '#FFE08A' : '#D8D2C2';
    ctx.fillRect(x + k * 0.35, y - h, k * 0.18, k * 0.07);
  }

  private drawSign(x: number, y: number, k: number, label: string) {
    const ctx = this.ctx;
    const w = k * 1.9;
    const h = k * 1.05;
    const top = y - k * 2.3;
    ctx.fillStyle = '#5B6178';
    ctx.fillRect(x - w * 0.36, top + h, Math.max(1, k * 0.06), y - top - h);
    ctx.fillRect(x + w * 0.3, top + h, Math.max(1, k * 0.06), y - top - h);
    ctx.fillStyle = '#1B5FA8';
    this.roundRect(x - w / 2, top, w, h, k * 0.08);
    ctx.fill();
    ctx.strokeStyle = C.cream;
    ctx.lineWidth = Math.max(1, k * 0.035);
    this.roundRect(x - w / 2 + k * 0.06, top + k * 0.06, w - k * 0.12, h - k * 0.12, k * 0.05);
    ctx.stroke();
    if (k > 14) {
      ctx.fillStyle = C.cream;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${k * 0.2}px Rubik, system-ui, sans-serif`;
      ctx.fillText('תל אביב-יפו', x - w / 2 + k * 0.16, top + h * 0.26);
      ctx.font = `700 ${k * 0.24}px Overpass, system-ui, sans-serif`;
      ctx.fillText('Tel Aviv–Yafo', x - w / 2 + k * 0.16, top + h * 0.52);
      ctx.textAlign = 'right';
      ctx.font = `800 ${k * 0.3}px Overpass, system-ui, sans-serif`;
      ctx.fillStyle = C.sun;
      ctx.fillText(label, x + w / 2 - k * 0.16, top + h * 0.78);
      ctx.textAlign = 'left';
      ctx.fillStyle = C.cream;
      ctx.font = `600 ${k * 0.17}px Overpass, system-ui, sans-serif`;
      ctx.fillText('game km ⟶', x - w / 2 + k * 0.16, top + h * 0.8);
    }
  }

  private drawUmbrella(x: number, y: number, k: number, seed: number) {
    const ctx = this.ctx;
    const colors = [C.coral, C.sun, '#2F5BEA', '#FF9EC4'];
    const col = colors[Math.floor(rand(seed) * colors.length)];
    ctx.strokeStyle = '#6B5A4A';
    ctx.lineWidth = Math.max(1, k * 0.04);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - k * 0.9);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - k * 0.55, y - k * 0.75);
    ctx.quadraticCurveTo(x, y - k * 1.25, x + k * 0.55, y - k * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.cream;
    ctx.beginPath();
    ctx.moveTo(x - k * 0.18, y - k * 0.8);
    ctx.quadraticCurveTo(x, y - k * 1.2, x + k * 0.18, y - k * 0.8);
    ctx.closePath();
    ctx.fill();
  }

  private drawLifeguard(x: number, y: number, k: number) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#7A6A58';
    ctx.lineWidth = Math.max(1, k * 0.05);
    ctx.beginPath();
    ctx.moveTo(x - k * 0.35, y);
    ctx.lineTo(x - k * 0.25, y - k * 0.9);
    ctx.moveTo(x + k * 0.35, y);
    ctx.lineTo(x + k * 0.25, y - k * 0.9);
    ctx.stroke();
    ctx.fillStyle = C.cream;
    ctx.fillRect(x - k * 0.45, y - k * 1.45, k * 0.9, k * 0.6);
    ctx.fillStyle = C.coral;
    ctx.fillRect(x - k * 0.45, y - k * 1.45, k * 0.9, k * 0.14);
    ctx.fillStyle = C.navy;
    ctx.fillRect(x - k * 0.3, y - k * 1.22, k * 0.6, k * 0.18);
    ctx.fillStyle = C.coral;
    ctx.beginPath();
    ctx.moveTo(x - k * 0.55, y - k * 1.45);
    ctx.lineTo(x, y - k * 1.75);
    ctx.lineTo(x + k * 0.55, y - k * 1.45);
    ctx.closePath();
    ctx.fill();
  }

  private drawRoadsideBuilding(x: number, y: number, k: number, tall: boolean, seed: number, p: number) {
    const ctx = this.ctx;
    const w = k * (1.6 + rand(seed) * 1.4);
    const h = k * (tall ? 3.6 + rand(seed + 2) * 2.4 : 1.4 + rand(seed + 2));
    ctx.fillStyle = tall ? mix('#9AA7C7', '#6A76A0', p) : mix('#FFF6E3', '#F3E3C3', rand(seed + 4));
    this.roundRect(x - w, y - h, w, h, Math.min(6, k * 0.1));
    ctx.fill();
    ctx.fillStyle = tall ? 'rgba(255,246,227,0.4)' : 'rgba(19,33,63,0.18)';
    const rows = Math.max(1, Math.floor(h / (k * 0.45)));
    for (let r = 0; r < rows; r++) {
      const yy = y - h + (r + 0.5) * (h / rows);
      ctx.fillRect(x - w + k * 0.12, yy, w - k * 0.24, Math.max(1, k * 0.08));
    }
  }

  private drawGrass(x: number, y: number, k: number, bush: boolean) {
    const ctx = this.ctx;
    ctx.fillStyle = bush ? '#7E9B5A' : '#A2A65F';
    if (bush) {
      ctx.fillStyle = '#5E7F4A';
      ctx.beginPath();
      ctx.arc(x - k * 0.14, y - k * 0.12, k * 0.14, 0, Math.PI * 2);
      ctx.arc(x + k * 0.12, y - k * 0.1, k * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7E9B5A';
      ctx.beginPath();
      ctx.arc(x, y - k * 0.2, k * 0.15, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(x + i * k * 0.05, y);
      ctx.lineTo(x + i * k * 0.12, y - k * (0.35 + Math.abs(3 - Math.abs(i)) * 0.06));
      ctx.lineTo(x + i * k * 0.05 + k * 0.03, y);
    }
    ctx.fill();
  }

  private drawSpeedLines(L: ReturnType<JourneyRenderer['layout']>) {
    if (this.opts.reducedMotion || this.speed < 18) return;
    const ctx = this.ctx;
    const a = clamp01((this.speed - 18) / 50);
    ctx.strokeStyle = `rgba(255,246,227,${0.45 * a})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const ang = rand(i) * Math.PI - Math.PI;
      const r0 = (((this.time * 900 + rand(i + 9) * 800) % 900) / 900) * L.W * 0.7 + L.W * 0.1;
      const len = 40 + 90 * a;
      const ox = L.vpX + Math.cos(ang) * r0;
      const oy = L.hy + Math.abs(Math.sin(ang)) * r0 * 0.6 * (i % 2 ? 1 : -0.4);
      const dx = Math.cos(ang);
      const dy = (oy - L.hy) / Math.max(1, r0);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + dx * len, oy + dy * len);
      ctx.stroke();
    }
  }

  private drawParticles(kind: Particle['kind']) {
    const ctx = this.ctx;
    for (const p of this.particles) {
      if (p.kind !== kind) continue;
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = p.color;
      if (kind === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin * p.life * 3);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawFlare(L: ReturnType<JourneyRenderer['layout']>) {
    const ctx = this.ctx;
    const { x, y, r } = this.sunPos(L);
    ctx.save();
    ctx.globalAlpha = this.flare * 0.5;
    ctx.fillStyle = '#FFE7A3';
    ctx.translate(x, y);
    ctx.rotate(this.time * 0.6);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.4);
      ctx.lineTo(L.W, -r * 0.15);
      ctx.lineTo(L.W, r * 0.15);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawVan() {
    const ctx = this.ctx;
    const { vx, vy, vw } = this.vanBox();
    const w = vw;
    const h = w * 0.86;
    const x = vx - w / 2;
    const y = vy - h; // top of body
    const lean = this.opts.reducedMotion ? 0 : Math.sin(this.travel * 0.006) * -0.025;

    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate(lean);
    ctx.translate(-vx, -vy);

    // shadow
    ctx.fillStyle = 'rgba(11,21,48,0.35)';
    ctx.beginPath();
    ctx.ellipse(vx, vy + 2, w * 0.56, w * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    // tyres
    ctx.fillStyle = C.ink;
    this.roundRect(x + w * 0.04, vy - w * 0.12, w * 0.17, w * 0.13, w * 0.03);
    ctx.fill();
    this.roundRect(x + w * 0.79, vy - w * 0.12, w * 0.17, w * 0.13, w * 0.03);
    ctx.fill();

    // roof rack cargo: surfboard + suitcase
    const roofY = y + h * 0.02;
    ctx.fillStyle = C.sun;
    this.roundRect(x + w * 0.02, roofY - w * 0.075, w * 0.96, w * 0.06, w * 0.03);
    ctx.fill();
    ctx.fillStyle = C.coral;
    ctx.fillRect(x + w * 0.2, roofY - w * 0.075, w * 0.03, w * 0.06);
    ctx.fillRect(x + w * 0.77, roofY - w * 0.075, w * 0.03, w * 0.06);
    // suitcase
    ctx.fillStyle = '#C9733F';
    this.roundRect(x + w * 0.52, roofY - w * 0.2, w * 0.3, w * 0.13, w * 0.025);
    ctx.fill();
    ctx.fillStyle = C.cream;
    ctx.beginPath();
    ctx.arc(x + w * 0.6, roofY - w * 0.135, w * 0.028, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.van;
    ctx.fillRect(x + w * 0.69, roofY - w * 0.175, w * 0.07, w * 0.08);
    ctx.fillStyle = '#9E5530';
    ctx.fillRect(x + w * 0.63, roofY - w * 0.225, w * 0.08, w * 0.03);
    // duffel
    ctx.fillStyle = '#2E7D5B';
    this.roundRect(x + w * 0.2, roofY - w * 0.16, w * 0.26, w * 0.09, w * 0.045);
    ctx.fill();
    // rack rails
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + w * 0.08, roofY - w * 0.018, w * 0.84, w * 0.022);

    // body: cream top, cobalt bottom
    ctx.fillStyle = C.cream;
    this.roundRect(x, y, w, h * 0.92, w * 0.16);
    ctx.fill();
    ctx.fillStyle = C.van;
    ctx.save();
    this.roundRect(x, y, w, h * 0.92, w * 0.16);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.5);
    ctx.lineTo(x + w * 0.5, y + h * 0.43);
    ctx.lineTo(x + w, y + h * 0.5);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    // side shading
    ctx.fillStyle = C.vanDark;
    ctx.fillRect(x, y, w * 0.05, h);
    ctx.fillRect(x + w * 0.95, y, w * 0.05, h);
    ctx.restore();
    // body outline
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(1.5, w * 0.012);
    this.roundRect(x, y, w, h * 0.92, w * 0.16);
    ctx.stroke();

    // rear window with sky reflection
    const wx = x + w * 0.14;
    const wy = y + h * 0.1;
    const ww = w * 0.72;
    const wh = h * 0.28;
    ctx.fillStyle = '#1A2A55';
    this.roundRect(wx, wy, ww, wh, w * 0.06);
    ctx.fill();
    ctx.save();
    this.roundRect(wx, wy, ww, wh, w * 0.06);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,214,140,0.35)';
    ctx.beginPath();
    ctx.moveTo(wx + ww * 0.12, wy + wh);
    ctx.lineTo(wx + ww * 0.3, wy);
    ctx.lineTo(wx + ww * 0.42, wy);
    ctx.lineTo(wx + ww * 0.24, wy + wh);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,214,140,0.2)';
    ctx.beginPath();
    ctx.moveTo(wx + ww * 0.5, wy + wh);
    ctx.lineTo(wx + ww * 0.62, wy);
    ctx.lineTo(wx + ww * 0.67, wy);
    ctx.lineTo(wx + ww * 0.55, wy + wh);
    ctx.fill();
    // passengers' heads silhouettes
    ctx.fillStyle = '#0D1733';
    for (const hx of [0.28, 0.72]) {
      ctx.beginPath();
      ctx.arc(wx + ww * hx, wy + wh * 0.85, wh * 0.3, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = C.ink;
    this.roundRect(wx, wy, ww, wh, w * 0.06);
    ctx.stroke();

    // spare wheel cover with sun badge
    const sx = x + w * 0.5;
    const sy = y + h * 0.6;
    const sr = w * 0.12;
    ctx.fillStyle = C.sand;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.arc(sx, sy + sr * 0.15, sr * 0.45, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = C.sea;
    ctx.fillRect(sx - sr * 0.62, sy + sr * 0.18, sr * 1.24, sr * 0.14);
    ctx.fillRect(sx - sr * 0.45, sy + sr * 0.38, sr * 0.9, sr * 0.1);

    // tail lights
    const glow = 0.55 + Math.min(0.45, this.speed / 80);
    for (const tx of [x + w * 0.045, x + w * 0.885]) {
      ctx.fillStyle = `rgba(242,70,60,${glow})`;
      this.roundRect(tx, y + h * 0.5, w * 0.07, h * 0.16, w * 0.02);
      ctx.fill();
      ctx.fillStyle = C.sun;
      this.roundRect(tx, y + h * 0.67, w * 0.07, h * 0.05, w * 0.015);
      ctx.fill();
    }

    // bumper + Israeli-yellow plate
    ctx.fillStyle = C.navy;
    this.roundRect(x - w * 0.02, y + h * 0.8, w * 1.04, h * 0.12, w * 0.04);
    ctx.fill();
    const pw = w * 0.3;
    const ph = h * 0.09;
    ctx.fillStyle = C.plate;
    this.roundRect(vx - pw / 2, y + h * 0.815, pw, ph, w * 0.012);
    ctx.fill();
    ctx.fillStyle = '#1A3FA0';
    ctx.fillRect(vx - pw / 2, y + h * 0.815, pw * 0.13, ph);
    ctx.fillStyle = C.ink;
    ctx.font = `800 ${ph * 0.7}px Overpass, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NXT·STP', vx + pw * 0.06, y + h * 0.815 + ph * 0.56);

    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx;
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /** For tests / debugging: what the scene is currently showing. */
  debugState() {
    const L = this.layout();
    return { displayKm: this.displayKm, speed: this.speed, skylineHalfWidth: L.skyHalf, van: this.vanBox(), W: this.W, H: this.H };
  }
}

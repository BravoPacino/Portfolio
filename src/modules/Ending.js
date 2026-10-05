import Module from '../core/Module.js';
import Light, { hex } from '../core/Light.js';
import { pinProgress, seg } from '../core/pin.js';

const BEAT = {
  paper: [0.00, 0.14],
  print: [0.08, 0.62],
  notes: [0.26, 0.70],
  drain: [0.74, 1.00],
};

const lerp = (a, b, t) => a + (b - a) * t;
const mixRgb = (a, b, t) => [0, 1, 2].map((i) => lerp(a[i], b[i], t));
const css255 = (c) => `rgb(${c.map((v) => Math.round(v * 255)).join(' ')})`;

export default class Ending extends Module {
  init() {
    this.stage = this.$one('stage');
    this.sheet = this.el.querySelector('.c-end__sheet');
    this.notes = this.$('note');
    this.light = Light.get();

    const cs = getComputedStyle(document.documentElement);
    const C = (n) => hex(cs.getPropertyValue(n));
    this.night = C('--c-bg');
    this.pal = {
      bg:      C('--p-paper'),
      cold:    C('--p-line'),
      hot:     C('--p-lit'),
      glowCol: C('--p-paper'),
    };

    this.bindCopy();
    this.bindParts();
    this.fitSheet();

    if (this.stage && this.light.gl) {
      this.observe(new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) this.light.attach(this.stage, { fit: 'contain' }); },
        { rootMargin: '80% 0px' },
      )).observe(this.stage);
    }
    this.raf(() => this.render());
  }

  fitSheet() {
    if (!this.sheet) return;
    const apply = () => {
      const h = this.sheet.scrollHeight;
      this.el.style.setProperty('--sheet-h', `${Math.ceil(h)}px`);
      this.light.measure();
    };
    this.observe(new ResizeObserver(apply)).observe(this.sheet);
    apply();
  }

  bindCopy() {
    const btn = this.$one('copy');
    if (!btn) return;
    this.on(btn, 'click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.endingCopy);
        btn.dataset.state = 'done';
        clearTimeout(this.copyT);
        this.copyT = setTimeout(() => { btn.dataset.state = ''; }, 1800);
      } catch {
        btn.dataset.state = 'fail';
      }
    });
  }

  bindParts() {
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const x = this.$one('x');
    const hot = (name, on) => {
      this.el.querySelectorAll(`[data-part="${name}"]`).forEach(el => el.classList.toggle('is-hot', on));
    };
    const partOf = (e) => e.target.closest('[data-part]')?.dataset.part;
    this.on(this.el, 'pointerover', (e) => { const n = partOf(e); if (n) hot(n, true); });
    this.on(this.el, 'pointerout',  (e) => { const n = partOf(e); if (n) hot(n, false); });
    this.on(this.el, 'focusin',  (e) => { const n = partOf(e); if (n) hot(n, true); });
    this.on(this.el, 'focusout', (e) => { const n = partOf(e); if (n) hot(n, false); });

    this.on(this.el, 'click', (e) => {
      const btn = e.target.closest('[data-ending-go]');
      const part = !btn && x?.contains(e.target) ? partOf(e) : null;
      const go = btn?.dataset.endingGo
        ?? this.el.querySelector(`.c-end__part[data-part="${part}"] [data-ending-go]`)?.dataset.endingGo;
      if (!go) return;
      this.goTo(go);
    });
  }

  goTo(where) {
    let y = 0;
    if (where !== 'hero') {
      const rail = document.querySelector('.c-rail');
      if (!rail) return;
      y = rail.getBoundingClientRect().top + window.scrollY;
      if (where === 'rail-2') {
        const slide = rail.querySelectorAll('.c-rail__slide')[1];
        y = matchMedia('(min-width: 900px)').matches
          ? y + window.innerHeight
          : (slide?.getBoundingClientRect().top ?? 0) + window.scrollY;
      }
    }
    const lenis = this.app?.lenis;
    if (lenis && !this.reduce) lenis.scrollTo(y, { duration: 1.8 });
    else window.scrollTo({ top: y, behavior: this.reduce ? 'auto' : 'smooth' });
  }

  render() {
    if (this.paused) return;
    let p = pinProgress(this.el);
    if (p === null) {
      const r = this.el.getBoundingClientRect();
      p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    }

    const t = seg(p, ...BEAT.paper);
    const bg = mixRgb(this.night, this.pal.bg, t);
    this.el.style.setProperty('--end-bg', css255(bg));
    const paper = t > 0.55;
    this.el.classList.toggle('is-paper', paper);
    document.documentElement.classList.toggle('is-paper-ground', paper);

    const n = this.notes.length;
    const np = seg(p, ...BEAT.notes);
    this.notes.forEach((el, i) => {
      el.classList.toggle('is-in', np > (i / n) * 0.85);
    });
    const ex = this.reduce ? 1 : 1 - Math.pow(1 - np, 3);
    if (ex !== this.lastEx) { this.lastEx = ex; this.el.style.setProperty('--explode', ex.toFixed(3)); }

    if (!this.light.owns(this.stage)) return;

    const fwd   = 0.06 + seg(p, ...BEAT.print) * 1.32;
    const drain = seg(p, ...BEAT.drain);
    const wave  = drain > 0 ? lerp(fwd, 0.02, drain) : fwd;

    this.light.draw({
      ...this.pal,
      bg,
      srcX: 0.30, srcY: 0.62,
      wave,
      width: lerp(0.05, 0.008, drain),
      trail: 0.46,
      rest: lerp(1.0, 0.0, drain),
      glowAmt: 0,
      grid: 0,
      base: lerp(0.07, 0.02, drain),
    });
  }

  pause()  { this.paused = true; }
  resume() { this.paused = false; }

  destroy() { clearTimeout(this.copyT); super.destroy(); }
}

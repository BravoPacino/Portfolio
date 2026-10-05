import Module from '../core/Module.js';

const MIN_MS = 1100;
const TAU_MS = 260;
const MAX_MS = 6000;

export default class Preloader extends Module {
  init() {
    this.count = this.$one('count');
    this.line  = this.$one('line');
    if (!this.count || !this.line) return;

    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.t0 = this.last = performance.now();
    this.p = 0;
    this.done = false;

    this.halfW = this.line.clientWidth / 2;
    this.on(window, 'resize', () => { this.halfW = this.line.clientWidth / 2; });

    document.documentElement.classList.add('is-loading');

    if (this.reduce) { this.finish(); return; }

    const ready = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise(r => this.on(window, 'load', r, { once: true })),
    ]);
    ready.then(() => { this.ready = true; });
    this.timeout = setTimeout(() => { this.ready = true; }, MAX_MS);

    this.raf(() => this.tick());
  }

  tick() {
    if (this.done) return;
    const now = performance.now();
    const dt = Math.min(64, now - this.last);
    this.last = now;
    const elapsed = now - this.t0;

    const target = (this.ready && elapsed >= MIN_MS) ? 1 : 0.92;

    this.p += (target - this.p) * (1 - Math.exp(-dt / TAU_MS));

    this.count.textContent = String(Math.round(this.p * 100)).padStart(2, '0');
    this.sweep(0.06 + this.p * 0.94);

    if (this.p > 0.99) this.finish();
  }

  sweep(s) {
    this.el.style.setProperty('--pre-p', s.toFixed(4));
    this.el.style.setProperty('--pre-x', `${(this.halfW * s).toFixed(1)}px`);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    clearTimeout(this.timeout);

    this.count.textContent = '100';
    this.sweep(1);
    this.el.classList.add('is-done');

    const clear = () => {
      this.el.hidden = true;
      document.documentElement.classList.remove('is-loading');
      this.app.call('enter');
    };
    if (this.reduce) { clear(); return; }
    this.on(this.el, 'transitionend', (e) => {
      if (e.propertyName === 'opacity' && e.target === this.el) clear();
    });
    this.fallback = setTimeout(clear, 1400);
  }

  destroy() {
    clearTimeout(this.timeout);
    clearTimeout(this.fallback);
    document.documentElement.classList.remove('is-loading');
    super.destroy();
  }
}

import Module from '../core/Module.js';

const TAU = 55;
const HOT = 'a, button, [data-case-open], [data-cursor-hot]';
const TEXT = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

export default class Cursor extends Module {
  init() {
    this.ring = this.$one('ring');
    this.dot  = this.$one('dot');
    if (!this.ring || !this.dot) return;

    if (!matchMedia('(pointer: fine)').matches) return;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const root = document.documentElement;
    this.root = root;

    this.x = this.y = this.rx = this.ry = -100;
    this.last = performance.now();
    this.dirty = true;

    this.on(document, 'pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.x = e.clientX; this.y = e.clientY;
      this.dirty = true;
      if (!this.awake) { this.awake = true; root.classList.add('has-cursor'); }
    }, { passive: true });

    this.on(document, 'pointerover', (e) => {
      const t = e.target;
      root.classList.toggle('is-hot', !!t.closest?.(HOT));
      if (t.closest?.(TEXT)) this.off(true);
      else if (!this.selecting) this.off(false);
    }, { passive: true });

    this.on(document, 'selectionchange', () => {
      const s = getSelection();
      this.selecting = !!s && !s.isCollapsed;
      this.off(this.selecting);
    });

    this.on(document, 'pointerleave', () => root.classList.remove('has-cursor'), { passive: true });
    this.on(document, 'pointerenter', () => { if (this.awake) root.classList.add('has-cursor'); }, { passive: true });

    this.raf(() => this.render());
  }

  off(on) { this.root.classList.toggle('cursor-off', on); }

  render() {
    if (this.paused || !this.root) return;

    const now = performance.now();
    const dt = Math.min(64, now - this.last);
    this.last = now;

    const k = this.reduce ? 1 : 1 - Math.exp(-dt / TAU);
    this.rx += (this.x - this.rx) * k;
    this.ry += (this.y - this.ry) * k;

    const settled = Math.abs(this.x - this.rx) < 0.1 && Math.abs(this.y - this.ry) < 0.1;
    if (settled && !this.dirty) return;
    this.dirty = false;

    this.dot.style.translate  = `${this.x.toFixed(1)}px ${this.y.toFixed(1)}px`;
    this.ring.style.translate = `${this.rx.toFixed(1)}px ${this.ry.toFixed(1)}px`;
  }

  pause()  { this.paused = true; }
  resume() { this.paused = false; this.last = performance.now(); }

  destroy() {
    this.root?.classList.remove('has-cursor', 'is-hot', 'cursor-off');
    super.destroy();
  }
}

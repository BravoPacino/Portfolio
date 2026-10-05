import Module from '../core/Module.js';
import { pinProgress, seg } from '../core/pin.js';

const HOLD   = 0.58;
const SPREAD = 0.50;

export default class Rolodex extends Module {
  init() {
    this.box   = this.$one('box');
    this.faces = this.$('face');
    if (!this.box || this.faces.length < 2) return;

    this.n = this.faces.length;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.el.classList.add('is-flat');

    this.build();
    if (!this.chars.length) return;

    let t = 0;
    this.on(window, 'resize', () => {
      clearTimeout(t);
      t = setTimeout(() => this.layout(), 120);
    });
    this.layout();

    document.fonts?.ready?.then(() => { if (this.el.isConnected) this.layout(); });

    if (this.reduce) { this.rest(); return; }
    this.raf(() => this.render());
  }

  build() {
    const texts = this.faces.map((f) => f.textContent.trim());
    this.el.setAttribute('aria-label', texts.join(' '));
    this.box.remove();

    this.lines = [];
    this.chars = [];
    texts.forEach((text, line) => {
      const layer = document.createElement('span');
      layer.className = 'c-roll__line';
      layer.setAttribute('aria-hidden', 'true');

      const items = [];
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') continue;
        const el = document.createElement('span');
        el.className = 'c-roll__ch';
        el.textContent = text[i];
        layer.appendChild(el);
        const rec = { el, line, index: i, x: 0, w: 0, delay: 0, last: '' };
        items.push(rec);
        this.chars.push(rec);
      }
      this.el.appendChild(layer);
      this.lines.push({ text, layer, items });
    });
  }

  measure() {
    const probe = document.createElement('span');
    probe.className = 'c-roll__line';
    probe.style.visibility = 'hidden';
    this.el.appendChild(probe);

    const range = document.createRange();
    let widest = 0;

    for (const line of this.lines) {
      const tn = document.createTextNode(line.text);
      probe.replaceChildren(tn);
      const base = probe.getBoundingClientRect();

      for (const c of line.items) {
        range.setStart(tn, c.index);
        range.setEnd(tn, c.index + 1);
        const r = range.getBoundingClientRect();
        c.x = r.left - base.left;
        c.w = r.width;
        c.el.style.left  = c.x.toFixed(2) + 'px';
        c.el.style.width = c.w.toFixed(2) + 'px';
      }

      range.setStart(tn, 0);
      range.setEnd(tn, line.text.length);
      widest = Math.max(widest, range.getBoundingClientRect().width);
    }
    probe.remove();

    this.span = widest || 1;
    for (const c of this.chars) {
      c.delay = SPREAD * Math.min(1, (c.x + c.w / 2) / this.span);
    }
  }

  layout() {
    const h = this.el.offsetHeight;
    this.r = this.n === 2 ? 0 : (h / 2) / Math.tan(Math.PI / this.n);

    this.measure();
    for (const c of this.chars) {
      c.el.hidden = false;
      c.el.style.visibility = '';
      c.el.style.transform = '';
      c.last = '';
    }
    if (this.reduce) this.rest();
  }

  rest() {
    for (const c of this.chars) {
      c.el.hidden = c.line !== this.n - 1;
      if (!c.el.hidden) c.el.style.transform = 'none';
    }
  }

  render() {
    if (this.paused) return;

    let p = pinProgress(this.el);
    if (p === null) {
      const r = this.el.getBoundingClientRect();
      p = Math.min(1, Math.max(0, (-r.top + innerHeight * 0.35) / (innerHeight * 0.75)));
    } else {
      p = seg(p, 0.04, 0.88);
    }

    const n = this.n, span = 1 / (n - 1);
    const i = Math.min(n - 2, Math.floor(p / span));
    const t = (p - i * span) / span;
    const u = t < HOLD ? 0 : (t - HOLD) / (1 - HOLD);

    const step = 360 / n, RAD = Math.PI / 180, denom = 1 - SPREAD;

    for (const c of this.chars) {
      const uj = Math.min(1, Math.max(0, (u - c.delay) / denom));
      const k = 1 - Math.pow(1 - uj, 3);
      const th = ((i + k) * step - c.line * step) * RAD;
      const cos = Math.cos(th);

      const v = cos <= 0.002
        ? 'hidden'
        : `translateY(${(-this.r * Math.sin(th)).toFixed(2)}px) scaleY(${cos.toFixed(4)})`;

      if (c.last === v) continue;
      c.last = v;
      if (v === 'hidden') c.el.style.visibility = 'hidden';
      else { c.el.style.visibility = 'visible'; c.el.style.transform = v; }
    }
  }

  pause()  { this.paused = true; }
  resume() { this.paused = false; }
}

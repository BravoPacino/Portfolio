import Module from '../core/Module.js';

const FRAME  = 16.7;
const BEFORE = { ms: 20.0, what: 'The grain overlay, by itself.' };
const AFTER  = { ms: 0.09, what: 'The louvre hero: CSS, no shader.' };

export default class Budget extends Module {
  init() {
    this.fill   = this.$one('fill');
    this.num    = this.$one('num');
    this.what   = this.$one('what');
    this.toggle = this.$one('toggle');
    if (!this.fill || !this.toggle) return;

    this.after = false;
    this.on(this.toggle, 'click', () => this.set(!this.after));
    this.set(false);
  }

  set(after) {
    this.after = after;
    const { ms, what } = after ? AFTER : BEFORE;
    const pct = ms / FRAME * 100;
    this.fill.style.width = pct + '%';
    this.fill.classList.toggle('is-over', ms > FRAME);
    this.num.textContent  = ms.toFixed(ms < 1 ? 2 : 1);
    this.what.textContent = what;
    this.toggle.setAttribute('aria-pressed', String(after));
  }
}

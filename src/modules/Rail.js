import Module from '../core/Module.js';
import { seg } from '../core/pin.js';

export default class Rail extends Module {
  init() {
    this.track  = this.$one('track');
    this.panel  = this.$one('panel');
    this.panelIn = this.panel?.querySelector('.c-panel__inner');
    this.slides = Array.from(this.track?.children || []);
    this.snapHandles = [];

    const last = this.slides[this.slides.length - 1];
    this.fig  = last?.querySelector('.c-slide__figure');
    this.meta = last?.querySelector('.c-slide__meta');

    this.mq = matchMedia('(min-width: 901px)');
    this.on(this.mq, 'change', () => this.setup());
    this.on(window, 'resize', () => {
      this.measure(); this.measurePanel(); this.bindSnap(this.snap);
    });

    this.setup();
  }

  setup() {
    this.teardownSnap();

    if (!this.mq.matches || this.slides.length < 2) {
      this.el.style.height = '';
      if (this.track) this.track.style.transform = '';
      this.resetPanel();
      this.active = false;
      return;
    }
    this.active = true;
    if (this.fig)  this.fig.style.willChange  = 'transform';
    if (this.meta) this.meta.style.willChange = 'transform, opacity';
    this.measure();
    this.measurePanel();
    this.raf(() => this.render());
  }

  measure() {
    if (!this.active) return;
    const h = (this.slides.length + 1) * 100;
    this.el.style.height = `${h}vh`;
    this.el.style.height = `${h}svh`;
  }

  measurePanel() {
    if (!this.active || !this.fig) return;

    this.fig.style.transform = '';
    const slide = this.fig.closest('.c-rail__slide');
    const s = slide.getBoundingClientRect();
    const f = this.fig.getBoundingClientRect();
    if (!f.width || !s.width) { this.figK = 1; this.figDx = 0; return; }

    const pw    = parseFloat(getComputedStyle(this.el).getPropertyValue('--panel-w')) || 60;
    const areaW = s.width * (1 - pw / 100);
    const pad   = parseFloat(getComputedStyle(slide).paddingLeft) || 24;

    this.figK  = Math.min(1, (areaW - pad * 2) / f.width);
    this.figDx = areaW / 2 - ((f.left - s.left) + f.width / 2);
  }

  bindSnap(snap) {
    this.snap = snap;
    this.teardownSnap();
    if (!this.active || !snap) return;

    const top = this.el.getBoundingClientRect().top + window.scrollY;
    for (let i = 0; i <= this.slides.length; i++) {
      this.snapHandles.push(snap.add(Math.round(top + i * window.innerHeight)));
    }
  }

  teardownSnap() {
    for (const remove of this.snapHandles) remove?.();
    this.snapHandles.length = 0;
  }

  resetPanel() {
    if (this.panel)   this.panel.style.transform = '';
    if (this.panelIn) this.panelIn.style.opacity = '';
    if (this.fig)   { this.fig.style.transform = ''; this.fig.style.willChange = ''; }
    if (this.meta)  {
      this.meta.style.opacity = ''; this.meta.style.transform = '';
      this.meta.style.willChange = '';
    }
  }

  render() {
    if (!this.active) return;
    const rect  = this.el.getBoundingClientRect();
    const total = this.el.offsetHeight - window.innerHeight;
    const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;

    const n = this.slides.length;
    const cut = (n - 1) / n;

    const x = -seg(p, 0, cut) * (n - 1) * 100;
    this.track.style.transform = `translate3d(${x}vw, 0, 0)`;

    if (!this.panel) return;
    const t0 = seg(p, cut, 1);
    const t  = t0 * t0 * (3 - 2 * t0);

    this.panel.style.transform = `translate3d(${((1 - t) * 100).toFixed(2)}%, 0, 0)`;

    if (this.panelIn) this.panelIn.style.opacity = seg(t, 0.4, 0.95).toFixed(3);

    if (this.fig) {
      const k = 1 + (this.figK - 1) * t;
      this.fig.style.transform =
        `translate3d(${(this.figDx * t).toFixed(1)}px, 0, 0) scale(${k.toFixed(4)})`;
    }
    if (this.meta) {
      this.meta.style.opacity = (1 - Math.min(1, t * 1.6)).toFixed(3);
      this.meta.style.transform = `translate3d(${(t * 40).toFixed(1)}px, 0, 0)`;
    }
  }

  destroy() {
    this.teardownSnap();
    this.resetPanel();
    super.destroy();
  }
}

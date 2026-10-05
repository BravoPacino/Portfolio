import Module from '../core/Module.js';
import Light, { hex } from '../core/Light.js';
import { pinProgress, seg } from '../core/pin.js';

export default class HeroLight extends Module {
  init() {
    this.light = Light.get();
    if (!this.light.gl) return;

    const cs = getComputedStyle(document.documentElement);
    this.pal = {
      bg:   hex(cs.getPropertyValue('--c-bg')),
      cold: hex(cs.getPropertyValue('--c-line')),
      hot:  hex(cs.getPropertyValue('--c-lit')),
      glowCol: hex(cs.getPropertyValue('--c-glow')),
    };

    this.observe(new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) this.light.attach(this.el); },
      { rootMargin: '80% 0px' },
    )).observe(this.el);

    this.light.attach(this.el);
    this.raf(() => this.render());
  }

  progress() {
    const p = pinProgress(this.el);
    if (p === null) {
      const r = this.el.getBoundingClientRect();
      return Math.min(1.45, Math.max(0, -r.top / innerHeight * 0.9 + 0.12));
    }
    return 0.10 + seg(p, 0.0, 0.80) * 1.28;
  }

  render() {
    if (this.paused || !this.light.owns(this.el)) return;
    this.light.draw({
      ...this.pal,
      srcX: 0.22, srcY: 0.06,
      wave: this.progress(),
      width: 0.085, trail: 0.42, rest: 0.30, glowAmt: 1.1, base: 0.30,
      grid: 1,
    });
  }

  pause()  { this.paused = true; }
  resume() { this.paused = false; }
}

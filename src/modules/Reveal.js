import Module from '../core/Module.js';

export default class Reveal extends Module {
  init() {
    const items = this.$('item').length ? this.$('item') : [this.el];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });

    items.forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${i * 70}ms`);
      io.observe(el);
    });
    this.observe(io);
  }
}

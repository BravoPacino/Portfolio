import Module from '../core/Module.js';

const DUR = 520;

export default class Case extends Module {
  init() {
    this.layer = this.$one('layer');
    if (!this.layer) return;

    this.reduce  = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.current = null;

    this.on(document, 'click', (e) => this.onClick(e));
    this.on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.current) this.requestClose();
    });
    this.on(window, 'popstate', () => { if (this.current) this.close(); });

    const id = new URLSearchParams(location.search).get('case');
    if (id) this.open(id, null, { push: false });
  }

  onClick(e) {
    if (e.target.closest('[data-case-close]')) { this.requestClose(); return; }

    const t = e.target.closest('[data-case-open]');
    if (!t) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();

    const slide = t.closest('.c-rail__slide') || document;
    this.open(t.dataset.caseOpen, slide.querySelector?.('.c-slide__figure') || null);

    if (this.current) this.lastFocus = t;
  }

  open(id, fromEl, { push = true } = {}) {
    const tpl = this.el.querySelector(`[data-case-tpl="${id}"]`);
    if (!tpl || this.current) return;

    if (this.timer) { clearTimeout(this.timer); this.timer = null; this.teardown(); }

    this.current = id;
    this.trigger = fromEl;

    if (fromEl) fromEl.style.visibility = 'hidden';

    this.layer.innerHTML = '';
    this.layer.appendChild(tpl.content.cloneNode(true));
    this.layer.hidden = false;
    this.layer.scrollTop = 0;

    this.lockBackground(true);
    this.app.call('pause');
    this.app.mount(this.layer);

    const doc  = this.layer.querySelector('[data-case-doc]');
    const hero = this.layer.querySelector('[data-case-hero]');

    if (hero && fromEl && !this.reduce) this.flip(fromEl, hero, false);

    requestAnimationFrame(() => this.layer.classList.add('is-open'));

    doc?.focus({ preventScroll: true });

    if (push) {
      try {
        history.pushState({ case: id }, '', `?case=${encodeURIComponent(id)}`);
        this.pushed = true;
      } catch { this.pushed = false; }
    } else {
      this.pushed = false;
    }
  }

  requestClose() {
    if (this.pushed) history.back();
    else this.close();
  }

  close() {
    if (!this.current) return;
    const hero = this.layer.querySelector('[data-case-hero]');
    const back = hero && this.trigger && !this.reduce;

    if (back) this.flip(this.trigger, hero, true);
    this.layer.classList.remove('is-open');

    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.teardown(), back ? DUR : 240);
    this.current = null;
  }

  flip(box, hero, rev) {
    hero.style.transition = 'none';
    if (rev) hero.style.transform = '';
    const a = box.getBoundingClientRect();
    const b = hero.getBoundingClientRect();
    if (!a.width || !b.width) return;

    const to = `translate(${(a.left - b.left).toFixed(1)}px, ${(a.top - b.top).toFixed(1)}px)` +
               ` scale(${(a.width / b.width).toFixed(4)}, ${(a.height / b.height).toFixed(4)})`;

    hero.style.transformOrigin = '0 0';
    hero.style.willChange = 'transform';
    hero.style.transform = rev ? '' : to;

    hero.getBoundingClientRect();

    hero.style.transition = `transform ${DUR}ms cubic-bezier(.16,1,.3,1)`;
    hero.style.transform = rev ? to : '';
  }

  teardown() {
    this.app.unmount(this.layer);
    this.layer.innerHTML = '';
    this.layer.hidden = true;
    this.lockBackground(false);
    this.app.call('resume');

    if (this.trigger) { this.trigger.style.visibility = ''; this.trigger = null; }
    this.lastFocus?.focus({ preventScroll: true });
    this.lastFocus = null;
  }

  lockBackground(on) {
    const html = document.documentElement;

    if (on) html.style.setProperty('--sb-comp', `${innerWidth - html.clientWidth}px`);

    this.app.lenis?.[on ? 'stop' : 'start']();
    html.classList.toggle('is-case', on);

    if (!('inert' in HTMLElement.prototype)) return;
    for (const n of document.body.children) {
      if (n !== this.el) n.inert = on;
    }
  }

  destroy() {
    clearTimeout(this.timer);
    if (this.current) this.teardown();
    super.destroy();
  }
}

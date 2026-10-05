export default class Module {
  constructor({ el, name, app }) {
    this.el = el;
    this.name = name;
    this.app = app;

    this._listeners = [];
    this._rafId = null;
    this._observers = [];
  }

  $(childName) {
    return Array.from(this.el.querySelectorAll(`[data-${this.name}-${childName}]`));
  }

  $one(childName) {
    return this.el.querySelector(`[data-${this.name}-${childName}]`);
  }

  getData(key, el = this.el) {
    return el.getAttribute(`data-${this.name}-${key}`);
  }

  getNumber(key, fallback) {
    const raw = this.getData(key);
    const n = raw === null ? NaN : parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._listeners.push([target, type, handler, options]);
    return handler;
  }

  raf(callback) {
    const loop = () => {
      callback();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  observe(observer) {
    this._observers.push(observer);
    return observer;
  }

  init() {}

  destroy() {
    for (const [target, type, handler, options] of this._listeners) {
      target.removeEventListener(type, handler, options);
    }
    this._listeners.length = 0;

    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    this._rafId = null;

    for (const o of this._observers) o.disconnect?.();
    this._observers.length = 0;
  }
}

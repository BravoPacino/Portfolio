export function pinProgress(el) {
  const scroller = el.closest('[data-pin-scroller]');
  if (!scroller) return null;
  const total = scroller.offsetHeight - window.innerHeight;
  if (total <= 0) return null;
  const p = -scroller.getBoundingClientRect().top / total;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

export function seg(p, a, b) {
  const t = (p - a) / (b - a);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

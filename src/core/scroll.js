import Lenis from 'lenis';
import Snap from 'lenis/snap';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScroll() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: !reduce,
    touchMultiplier: 1.6,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const snap = new Snap(lenis, {
    type: 'proximity',
    distanceThreshold: '50%',
    duration: 0.6,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    debounce: 380,
  });

  if (reduce) snap.stop();

  return { lenis, snap };
}

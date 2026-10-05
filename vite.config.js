import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Portfolio/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap'))  return 'gsap';
          if (id.includes('node_modules/lenis')) return 'lenis';
        },
      },
    },
  },
});

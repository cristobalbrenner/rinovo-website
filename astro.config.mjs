import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://rinovo.com',
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Keep Three.js and GSAP as separate chunks for better caching
          manualChunks: {
            three: ['three'],
            gsap: ['gsap'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['three', 'gsap', 'lenis', 'howler'],
    },
  },
});

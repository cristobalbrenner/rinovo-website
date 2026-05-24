/**
 * RINOVO — Scroll System
 * Lenis smooth scroll + GSAP ScrollTrigger animations
 */

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis;

export function initScroll() {
  // ── Lenis smooth scroll ────────────────────────────────────
  lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothTouch: false, // native iOS momentum
  });

  // Connect Lenis to GSAP ticker
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // ── Section transitions (light ↔ dark) ───────────────────
  setupSectionTransitions();

  // ── Text reveal animations ────────────────────────────────
  setupTextReveals();

  // ── Pencil divider draws ──────────────────────────────────
  setupDividerDraws();

  // ── Process phase reveals ─────────────────────────────────
  setupProcessReveals();
}

// ============================================================
// SECTION BACKGROUND TRANSITIONS
// ============================================================
function setupSectionTransitions() {
  // Hero → Philosophy (dark → light)
  gsap.to('body', {
    backgroundColor: '#F5F0E8',
    scrollTrigger: {
      trigger: '#philosophy',
      start: 'top 70%',
      end: 'top 30%',
      scrub: 1.2,
    },
  });

  // Philosophy → Process (cream → off-white)
  gsap.to('body', {
    backgroundColor: '#FAFAF7',
    scrollTrigger: {
      trigger: '#process',
      start: 'top 70%',
      end: 'top 30%',
      scrub: 1.2,
    },
  });

  // Process → Portfolio (off-white → charcoal)
  gsap.to('body', {
    backgroundColor: '#1A1814',
    scrollTrigger: {
      trigger: '#portfolio',
      start: 'top 60%',
      end: 'top 20%',
      scrub: 1.2,
    },
  });

  // Portfolio → Contact (charcoal → cream)
  gsap.to('body', {
    backgroundColor: '#F5F0E8',
    scrollTrigger: {
      trigger: '#contact',
      start: 'top 70%',
      end: 'top 30%',
      scrub: 1.2,
    },
  });

  // Nav text color transitions
  const nav = document.querySelector('.nav');
  if (nav) {
    // Dark sections → cream text
    ScrollTrigger.create({
      trigger: '#portfolio',
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => nav.classList.add('nav--light'),
      onLeave: () => nav.classList.remove('nav--light'),
      onEnterBack: () => nav.classList.add('nav--light'),
      onLeaveBack: () => nav.classList.remove('nav--light'),
    });
  }
}

// ============================================================
// TEXT REVEALS (word by word)
// ============================================================
function setupTextReveals() {
  // Hero wordmark
  const heroWord = document.querySelector('.hero__wordmark .reveal-word');
  if (heroWord) {
    gsap.from(heroWord, {
      opacity: 0,
      yPercent: 110,
      duration: 1.2,
      ease: 'power3.out',
      delay: 0.3,
    });
  }

  // Hero tagline — each span
  const taglineWords = document.querySelectorAll('.hero__tagline .reveal-word');
  taglineWords.forEach((word, i) => {
    gsap.from(word, {
      opacity: 0,
      yPercent: 110,
      duration: 0.9,
      ease: 'power3.out',
      delay: 0.8 + i * 0.15,
    });
  });

  // Philosophy heading words
  const philWords = document.querySelectorAll('.philosophy__heading .reveal-word');
  philWords.forEach((word, i) => {
    gsap.from(word, {
      opacity: 0,
      yPercent: 110,
      rotationX: -12,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.07,
      scrollTrigger: {
        trigger: '#philosophy',
        start: 'top 75%',
      },
    });
  });

  // Philosophy body
  document.querySelectorAll('.philosophy__body').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0,
      y: 28,
      duration: 0.9,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
      },
      delay: i * 0.15,
    });
  });

  // Portfolio title
  const portfolioTitle = document.querySelector('.portfolio__title');
  if (portfolioTitle) {
    gsap.from(portfolioTitle, {
      opacity: 0,
      y: 32,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#portfolio',
        start: 'top 70%',
      },
    });
  }

  // Contact heading
  const contactHeading = document.querySelector('.contact__heading');
  if (contactHeading) {
    gsap.from(contactHeading, {
      opacity: 0,
      y: 28,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#contact',
        start: 'top 75%',
      },
    });
  }

  // All .reveal-fade elements
  document.querySelectorAll('.reveal-fade').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      y: 28,
      duration: 0.85,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
      },
    });
  });
}

// ============================================================
// PENCIL DIVIDERS (animated stroke-dashoffset)
// ============================================================
function setupDividerDraws() {
  document.querySelectorAll('.pencil-divider').forEach(divider => {
    const path = divider.querySelector('path');
    if (!path) return;

    const length = path.getTotalLength?.() || 2000;
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;

    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 0.9,
      ease: 'power2.inOut',
      scrollTrigger: {
        trigger: divider,
        start: 'top 85%',
      },
    });
  });

  // Portfolio brushstroke
  const brushPath = document.querySelector('.portfolio__brushstroke path');
  if (brushPath) {
    gsap.to(brushPath, {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: 'power2.inOut',
      scrollTrigger: {
        trigger: '#portfolio',
        start: 'top 70%',
      },
    });
  }

  // Philosophy underline
  const underlinePath = document.querySelector('.philosophy__underline-word path');
  if (underlinePath) {
    gsap.to(underlinePath, {
      strokeDashoffset: 0,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.philosophy__underline-word',
        start: 'top 80%',
      },
    });
  }
}

// ============================================================
// PROCESS PHASES — staggered reveal
// ============================================================
function setupProcessReveals() {
  const phases = document.querySelectorAll('.process__phase');

  phases.forEach((phase, i) => {
    // Phase card reveal
    gsap.from(phase, {
      opacity: 0,
      y: 40,
      duration: 0.9,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#process',
        start: 'top 65%',
      },
      delay: i * 0.15,
    });

    // Connector draw
    const connector = phase.querySelector('.process__connector path');
    if (connector) {
      gsap.to(connector, {
        strokeDashoffset: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: '#process',
          start: 'top 60%',
        },
        delay: 0.3 + i * 0.2,
      });
    }

    // Annotation fade in
    const annotation = phase.querySelector('.process__annotation');
    if (annotation) {
      gsap.from(annotation, {
        opacity: 0,
        x: 10,
        duration: 0.7,
        ease: 'power1.out',
        scrollTrigger: {
          trigger: '#process',
          start: 'top 55%',
        },
        delay: 0.6 + i * 0.18,
      });
    }
  });
}

// ============================================================
// PORTFOLIO CARD PARALLAX
// ============================================================
export function setupPortfolioParallax() {
  const cards = document.querySelectorAll('.project-card');
  cards.forEach((card, i) => {
    gsap.fromTo(card, {
      yPercent: 8,
    }, {
      yPercent: -8,
      ease: 'none',
      scrollTrigger: {
        trigger: card,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
      },
    });
  });
}

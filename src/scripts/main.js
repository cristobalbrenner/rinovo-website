/**
 * RINOVO — Main Experience Script
 * The weaverbird never leaves.
 */

import { initScene } from './scene.js';
import { initScroll } from './scroll.js';
import { initCursor } from './cursor.js';
import { initPortfolio } from './portfolio.js';
import { initSound } from './sound.js';

// ============================================================
// BOOT SEQUENCE
// ============================================================
async function boot() {
  // 1. Handle loading screen
  const loadingScreen = document.getElementById('loading-screen');

  // 2. Initialize all systems in parallel
  await Promise.all([
    initScene(),        // Three.js canvas + bird
    initCursor(),       // Custom cursor
    initSound(),        // Howler.js audio
  ]);

  // 3. Handle opening video
  handleOpeningVideo();

  // 4. Initialize portfolio interactions
  initPortfolio();
}

// ============================================================
// OPENING VIDEO SEQUENCE
// ============================================================
function handleOpeningVideo() {
  const container = document.getElementById('opening-video-container');
  const video = document.getElementById('opening-video');
  const loadingScreen = document.getElementById('loading-screen');

  if (!video) {
    // No video file yet — skip straight to hero
    dismissLoadingAndVideo();
    return;
  }

  // Dismiss loading screen once video can play
  video.addEventListener('canplay', () => {
    loadingScreen?.classList.add('is-complete');
    setTimeout(() => loadingScreen?.remove(), 900);
  }, { once: true });

  // Fallback: if video never loads, dismiss everything after 2s
  const fallbackTimer = setTimeout(() => {
    dismissLoadingAndVideo();
  }, 2000);

  // When video ends (or after 12s max), trigger transformation
  const triggerTransformation = () => {
    clearTimeout(fallbackTimer);
    container?.classList.add('is-hidden');

    // Start bird transformation (morph from organic to origami)
    window._rinovo?.bird?.beginTransformation?.();

    // Begin scroll-driven experience
    setTimeout(() => {
      initScroll();
      container?.remove();
    }, 1800); // Wait for mist transition to complete
  };

  video.addEventListener('ended', triggerTransformation, { once: true });

  // Safety timeout: 13 seconds max
  setTimeout(triggerTransformation, 13000);

  // If video src is missing / load fails, skip gracefully
  video.addEventListener('error', () => {
    clearTimeout(fallbackTimer);
    dismissLoadingAndVideo();
  }, { once: true });

  // Also listen for error on source elements (Chrome/Safari difference)
  video.querySelectorAll('source').forEach(source => {
    source.addEventListener('error', () => {
      clearTimeout(fallbackTimer);
      dismissLoadingAndVideo();
    }, { once: true });
  });
}

function dismissLoadingAndVideo() {
  const loadingScreen = document.getElementById('loading-screen');
  const container = document.getElementById('opening-video-container');

  loadingScreen?.classList.add('is-complete');
  setTimeout(() => loadingScreen?.remove(), 900);

  container?.classList.add('is-hidden');
  setTimeout(() => {
    container?.remove();
    initScroll();
  }, 600);
}

// ============================================================
// SECTION NAVIGATION — dot nav + label
// ============================================================
export function initNavigation() {
  const dots = document.querySelectorAll('.dot-nav__dot');
  const sectionLabel = document.getElementById('section-label');
  const sections = document.querySelectorAll('[data-section]');
  const mobileProgress = document.getElementById('mobile-progress');

  // Dot navigation click
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const target = document.getElementById(dot.dataset.section);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // IntersectionObserver: update active dot + section label
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
        const sectionId = entry.target.dataset.section;
        const label = entry.target.dataset.sectionLabel;

        // Update dots
        dots.forEach(dot => {
          dot.classList.toggle('is-active', dot.dataset.section === sectionId);
        });

        // Update section label
        if (sectionLabel && label) {
          sectionLabel.textContent = label;
          sectionLabel.classList.add('is-visible');
        }

        // Notify bird of section change
        window._rinovo?.bird?.onSectionChange?.(sectionId);

        // Update body background for dark/light transitions
        document.body.dataset.activeSection = sectionId;
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(section => observer.observe(section));

  // Mobile progress bar
  window.addEventListener('scroll', () => {
    if (!mobileProgress) return;
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrolled / total) * 100;
    mobileProgress.style.width = `${progress}%`;
  }, { passive: true });
}

// ============================================================
// PENCIL DIVIDER & REVEAL ANIMATIONS
// (Fallback if GSAP ScrollTrigger is unavailable)
// ============================================================
export function initRevealAnimations() {
  const revealElements = document.querySelectorAll('.reveal-fade, .pencil-divider, .portfolio__brushstroke, .philosophy__underline-word');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-drawn', 'is-visible');
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

  revealElements.forEach(el => revealObserver.observe(el));
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  boot().catch(console.error);
  initNavigation();
  initRevealAnimations();
});

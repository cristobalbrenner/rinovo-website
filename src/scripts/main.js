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
// Guard against initScroll being called more than once
let scrollInitialised = false;
function safeInitScroll() {
  if (scrollInitialised) return;
  scrollInitialised = true;
  safeInitScroll();
}

async function boot() {
  // Initialize all systems in parallel
  await Promise.all([
    initScene(),   // Three.js canvas + bird
    initCursor(),  // Custom cursor
    initSound(),   // Howler.js audio
  ]);

  // Handle opening video / bird entrance
  handleOpeningVideo();

  // Portfolio long-press interactions
  initPortfolio();
}

// ============================================================
// OPENING VIDEO SEQUENCE
// ─────────────────────────────────────────────────────────────
// Two paths, same ending:
//
// PATH A — Real video present:
//   video plays → bird flies off-screen → mist blooms
//   → video fades → 3D bird materialises from mist → lands
//
// PATH B — No video file yet (development / missing asset):
//   mist blooms immediately → 3D bird flies in from right → lands
//
// Both paths end with: bird landed, scroll unlocked, tagline visible.
// ============================================================
function handleOpeningVideo() {
  const container = document.getElementById('opening-video-container');
  const video     = document.getElementById('opening-video');

  // Check if the video element has a real source to try
  // Note: src is on <source> children, not on the <video> element itself
  const firstSource = video?.querySelector('source[src]');
  const hasSrc = !!firstSource;

  if (!hasSrc) {
    // PATH B — no video yet, go straight to bird entrance
    skipToEntrance();
    return;
  }

  // PATH A — video present
  let transformTriggered = false;

  const triggerTransformation = () => {
    if (transformTriggered) return;
    transformTriggered = true;

    // Fade video container out
    container?.classList.add('is-hidden');

    // Tell the 3D bird to begin its mist-entrance sequence
    window._rinovo?.bird?.beginTransformation?.();

    // Wait for bird to land, then enable scroll
    window.addEventListener('rinovo:bird-landed', () => {
      safeInitScroll();
      container?.remove();
    }, { once: true });

    // Safety: unlock scroll after 3s even if event doesn't fire
    setTimeout(() => safeInitScroll(), 3000);
  };

  // Fallback: if video stalls for 2.5s on load, skip it
  const stallTimer = setTimeout(() => skipToEntrance(), 2500);

  video.addEventListener('canplay', () => {
    clearTimeout(stallTimer);
  }, { once: true });

  // Primary trigger: video ends naturally
  video.addEventListener('ended', triggerTransformation, { once: true });

  // Safety cap: 13s maximum regardless
  setTimeout(triggerTransformation, 13000);

  // Error paths — treat same as no video
  // Guard: only fire once across all error sources
  let errorHandled = false;
  const handleVideoError = () => {
    if (errorHandled) return;
    errorHandled = true;
    clearTimeout(stallTimer);
    skipToEntrance();
  };

  video.addEventListener('error', handleVideoError, { once: true });
  video.querySelectorAll('source').forEach(source => {
    source.addEventListener('error', handleVideoError, { once: true });
  });
}

// PATH B — skip video, go directly to bird entrance with mist
function skipToEntrance() {
  const container     = document.getElementById('opening-video-container');
  const loadingScreen = document.getElementById('loading-screen');

  // Hide loading and video container
  loadingScreen?.classList.add('is-complete');
  setTimeout(() => loadingScreen?.remove(), 600);

  container?.classList.add('is-hidden');
  setTimeout(() => container?.remove(), 700);

  // Trigger the mist + bird flight entrance
  window._rinovo?.bird?.beginTransformation?.();

  // Enable scroll once bird lands (or after 3s max)
  window.addEventListener('rinovo:bird-landed', () => safeInitScroll(), { once: true });
  setTimeout(() => safeInitScroll(), 3000);
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

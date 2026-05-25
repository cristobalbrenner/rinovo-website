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
// ─────────────────────────────────────────────────────────────
// Loading screen is dismissed as soon as the 3D scene is ready.
// The video + entrance animation run on their own timeline.
// ============================================================
let scrollInitialised = false;
function safeInitScroll() {
  if (scrollInitialised) return;
  scrollInitialised = true;
  initScroll();
}

async function boot() {
  await Promise.all([
    initScene(),   // Three.js canvas + bird (bird starts hidden)
    initCursor(),  // Custom cursor
    initSound(),   // Howler.js audio
  ]);

  // Scene is ready — dismiss the loading screen NOW.
  // Do not wait for video canplay; that can take many seconds on slow connections.
  dismissLoadingScreen();

  // Start video sequence + bird entrance (independent of loading screen)
  handleOpeningVideo();

  // Portfolio long-press interactions
  initPortfolio();
}

// ============================================================
// SINGLE ENTRANCE GUARD
// ─────────────────────────────────────────────────────────────
// Exactly one entrance (video or fallback) ever runs.
// ============================================================
let entranceInitiated = false;

function initiateEntrance(mode) {
  if (entranceInitiated) return;
  entranceInitiated = true;
  window._rinovo?.bird?.beginTransformation?.(mode);
  window.addEventListener('rinovo:bird-landed', () => safeInitScroll(), { once: true });
  setTimeout(() => safeInitScroll(), 5000); // safety if event never fires
}

// ============================================================
// OPENING VIDEO SEQUENCE
// ─────────────────────────────────────────────────────────────
// PATH A — Real video present:
//   Video plays fullscreen (z-index 900, above the 3D canvas)
//   → at 11.19s real bird exits frame upward
//   → mist blooms, video fades → 3D bird appears center-top → lands hero position
//
// PATH B — No video source (dev / missing asset):
//   Mist blooms → 3D bird sweeps in from off-screen right → lands
//
// Note: loading screen is already gone by the time this runs.
// ============================================================
function handleOpeningVideo() {
  const container = document.getElementById('opening-video-container');
  const video     = document.getElementById('opening-video');

  // PATH B — no <source src="..."> found
  if (!video?.querySelector('source[src]')) {
    fadeOutContainer(container, 400);
    initiateEntrance('fallback');
    return;
  }

  // PATH A — video source exists
  const VIDEO_DURATION = 12.44;   // confirmed via ffprobe
  const TRIGGER_AT     = VIDEO_DURATION - 1.25; // 11.19s — real bird exits frame

  // Play if autoplay didn't kick in automatically
  video.addEventListener('canplay', () => {
    if (video.paused) {
      video.play().catch(() => showTapToStart(container, video));
    }
  }, { once: true });

  // Main trigger: at 11.19s the real bird exits frame upward
  video.addEventListener('timeupdate', () => {
    if (video.currentTime >= TRIGGER_AT) {
      clearTimeout(safetyTimerId);
      fadeOutContainer(container, 700);
      initiateEntrance('video');
    }
  }, { passive: true });

  // Backup in case timeupdate misses — ended always fires at end of video
  video.addEventListener('ended', () => {
    clearTimeout(safetyTimerId);
    fadeOutContainer(container, 700);
    initiateEntrance('video');
  }, { once: true });

  // Error paths — fall back to bird from right
  let errorHandled = false;
  const handleVideoError = () => {
    if (errorHandled) return;
    errorHandled = true;
    clearTimeout(safetyTimerId);
    fadeOutContainer(container, 400);
    initiateEntrance('fallback');
  };
  video.addEventListener('error', handleVideoError, { once: true });
  video.querySelectorAll('source').forEach(s => s.addEventListener('error', handleVideoError, { once: true }));

  // Last resort: if video never reaches 11.19s (stalled / very slow connection)
  // Give it the full video duration + a buffer before giving up
  const safetyTimerId = setTimeout(() => {
    fadeOutContainer(container, 400);
    initiateEntrance('fallback');
  }, (VIDEO_DURATION + 8) * 1000); // ~20.4s — only fires if video truly fails
}

// ============================================================
// HELPERS
// ============================================================

function dismissLoadingScreen() {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;
  screen.classList.add('is-complete');
  setTimeout(() => screen.remove(), 900);
}

function fadeOutContainer(container, duration = 500) {
  if (!container) return;
  container.style.transition = `opacity ${duration}ms ease`;
  container.style.opacity = '0';
  setTimeout(() => container.remove(), duration + 60);
}

function showTapToStart(container, video) {
  const tap = document.createElement('button');
  tap.textContent = 'Tap to begin';
  tap.style.cssText = `
    position:absolute; inset:0; width:100%; height:100%;
    background:transparent; border:none; cursor:pointer;
    color:var(--rinovo-cream); font-family:var(--font-hand);
    font-size:1.4rem; letter-spacing:0.08em;
  `;
  container?.appendChild(tap);
  tap.addEventListener('click', () => {
    tap.remove();
    video.play();
  }, { once: true });
}

// ============================================================
// SECTION NAVIGATION — dot nav + section label
// ============================================================
export function initNavigation() {
  const dots           = document.querySelectorAll('.dot-nav__dot');
  const sectionLabel   = document.getElementById('section-label');
  const sections       = document.querySelectorAll('[data-section]');
  const mobileProgress = document.getElementById('mobile-progress');

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      document.getElementById(dot.dataset.section)?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
        const sectionId = entry.target.dataset.section;
        const label     = entry.target.dataset.sectionLabel;

        dots.forEach(dot => dot.classList.toggle('is-active', dot.dataset.section === sectionId));

        if (sectionLabel && label) {
          sectionLabel.textContent = label;
          sectionLabel.classList.add('is-visible');
        }

        window._rinovo?.bird?.onSectionChange?.(sectionId);
        document.body.dataset.activeSection = sectionId;
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));

  window.addEventListener('scroll', () => {
    if (!mobileProgress) return;
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    mobileProgress.style.width = `${(scrolled / total) * 100}%`;
  }, { passive: true });
}

// ============================================================
// REVEAL ANIMATIONS (IntersectionObserver fallback)
// ============================================================
export function initRevealAnimations() {
  const els = document.querySelectorAll(
    '.reveal-fade, .pencil-divider, .portfolio__brushstroke, .philosophy__underline-word'
  );
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-drawn', 'is-visible');
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
  els.forEach(el => obs.observe(el));
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  boot().catch(console.error);
  initNavigation();
  initRevealAnimations();
});

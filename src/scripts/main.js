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
  const loadingScreen = document.getElementById('loading-screen');
  let transformTriggered = false;

  const triggerTransformation = () => {
    if (transformTriggered) return;
    transformTriggered = true;

    // Fade video out — timed with mist bloom
    if (container) {
      container.style.transition = 'opacity 700ms ease';
      container.style.opacity = '0';
      setTimeout(() => container?.remove(), 750);
    }

    // 3D bird emerges from center-top where real bird exited
    window._rinovo?.bird?.beginTransformation?.('video');

    window.addEventListener('rinovo:bird-landed', () => safeInitScroll(), { once: true });
    setTimeout(() => safeInitScroll(), 3500);
  };

  // ── Loading screen: hide once video has enough data to play ──
  video.addEventListener('canplay', () => {
    clearTimeout(stallTimer);
    loadingScreen?.classList.add('is-complete');
    setTimeout(() => loadingScreen?.remove(), 600);

    // Only call play() if video somehow didn't start via autoplay
    if (video.paused) {
      video.play().catch(() => showTapToStart(container, video));
    }
  }, { once: true });

  // ── Stall guard: skip video if it hasn't loaded in 7s ────────
  // 7s gives mobile time to fetch the WebM (3.5MB on 4G ≈ 5-6s)
  const stallTimer = setTimeout(() => skipToEntrance(), 7000);

  // ── Key timing: mist blooms as real bird flies upward ────────
  // Real bird exits frame at ~11.2s (clip is 12.44s).
  // iOS timeupdate fires ~4Hz — trigger window is intentionally wide.
  const VIDEO_DURATION = 12.44;
  const TRIGGER_AT = VIDEO_DURATION - 1.25; // 11.19s

  video.addEventListener('timeupdate', () => {
    if (video.currentTime >= TRIGGER_AT) triggerTransformation();
  }, { passive: true });

  video.addEventListener('ended', triggerTransformation, { once: true });
  setTimeout(triggerTransformation, (VIDEO_DURATION + 1.5) * 1000);

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
let skipCalled = false;
function skipToEntrance() {
  if (skipCalled) return;
  skipCalled = true;

  const container     = document.getElementById('opening-video-container');
  const loadingScreen = document.getElementById('loading-screen');

  loadingScreen?.classList.add('is-complete');
  setTimeout(() => loadingScreen?.remove(), 600);

  if (container) {
    container.style.transition = 'opacity 500ms ease';
    container.style.opacity = '0';
    setTimeout(() => container.remove(), 550);
  }

  // Bird sweeps in from off-screen right (no video)
  window._rinovo?.bird?.beginTransformation?.('fallback');

  window.addEventListener('rinovo:bird-landed', () => safeInitScroll(), { once: true });
  setTimeout(() => safeInitScroll(), 3500);
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
// TAP-TO-START (autoplay blocked fallback — rare on modern mobile)
// ============================================================
function showTapToStart(container, video) {
  const tap = document.createElement('button');
  tap.textContent = 'Tap to begin';
  tap.style.cssText = `
    position:absolute; inset:0; width:100%; height:100%;
    background:transparent; border:none; cursor:pointer;
    color:var(--rinovo-cream); font-family:var(--font-hand);
    font-size:1.4rem; letter-spacing:0.08em;
  `;
  container.appendChild(tap);
  tap.addEventListener('click', () => {
    tap.remove();
    video.play();
  }, { once: true });
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  boot().catch(console.error);
  initNavigation();
  initRevealAnimations();
});

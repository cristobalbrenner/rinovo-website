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
let scrollInitialised = false;
function safeInitScroll() {
  if (scrollInitialised) return;
  scrollInitialised = true;
  initScroll(); // was incorrectly calling safeInitScroll() — infinite recursion
}

async function boot() {
  await Promise.all([
    initScene(),   // Three.js canvas + bird (bird starts hidden)
    initCursor(),  // Custom cursor
    initSound(),   // Howler.js audio
  ]);

  handleOpeningVideo();
  initPortfolio();
}

// ============================================================
// SINGLE ENTRANCE GUARD
// ─────────────────────────────────────────────────────────────
// Only one path (video or fallback) must ever run.
// Both skipToEntrance and triggerTransformation check this flag
// before doing anything — whichever fires first wins.
// ============================================================
let entranceInitiated = false;

function initiateEntrance(mode) {
  if (entranceInitiated) return;
  entranceInitiated = true;

  window._rinovo?.bird?.beginTransformation?.(mode);

  // Unlock scroll when bird lands, with a generous safety timeout
  window.addEventListener('rinovo:bird-landed', () => safeInitScroll(), { once: true });
  setTimeout(() => safeInitScroll(), 5000);
}

// ============================================================
// OPENING VIDEO SEQUENCE
// ─────────────────────────────────────────────────────────────
// PATH A — Real video present:
//   Loading screen visible → video has canplay → loading screen fades
//   → video plays freely → at 11.19s real bird exits frame upward
//   → mist blooms, video fades → 3D bird appears from center-top → lands
//
// PATH B — No video source (development / missing asset):
//   Loading screen fades immediately → mist blooms
//   → 3D bird sweeps in from off-screen right → lands
//
// Both paths end with: bird landed, scroll unlocked.
// ============================================================
function handleOpeningVideo() {
  const container = document.getElementById('opening-video-container');
  const video     = document.getElementById('opening-video');

  // PATH B — no <source src="..."> found
  const firstSource = video?.querySelector('source[src]');
  if (!firstSource) {
    dismissLoadingScreen();
    fadeOutContainer(container, 500);
    initiateEntrance('fallback');
    return;
  }

  // PATH A — video source exists, let it play
  const VIDEO_DURATION = 12.44;  // seconds — confirmed via ffprobe
  const TRIGGER_AT     = VIDEO_DURATION - 1.25; // 11.19s — real bird exits frame

  // ── Loading screen: hide when video can play ──────────────
  // Runs regardless of stall or error — always dismisses the loading screen.
  video.addEventListener('canplay', () => {
    dismissLoadingScreen();
    // Only call play() if autoplay attribute didn't already start it
    if (video.paused) {
      video.play().catch(() => showTapToStart(container, video));
    }
  }, { once: true });

  // ── Key timing: mist blooms as real bird flies upward ─────
  // iOS timeupdate fires ~4Hz — the trigger window is wide enough.
  video.addEventListener('timeupdate', () => {
    if (video.currentTime >= TRIGGER_AT) {
      clearSafetyTimer();
      fadeOutContainer(container, 700);
      initiateEntrance('video');
    }
  }, { passive: true });

  // Backup: if timeupdate misses the mark, ended always fires
  video.addEventListener('ended', () => {
    clearSafetyTimer();
    fadeOutContainer(container, 700);
    initiateEntrance('video');
  }, { once: true });

  // ── Error paths: treat as fallback ────────────────────────
  let errorHandled = false;
  const handleVideoError = () => {
    if (errorHandled) return;
    errorHandled = true;
    clearSafetyTimer();
    dismissLoadingScreen();
    fadeOutContainer(container, 500);
    initiateEntrance('fallback');
  };

  video.addEventListener('error', handleVideoError, { once: true });
  video.querySelectorAll('source').forEach(s => {
    s.addEventListener('error', handleVideoError, { once: true });
  });

  // ── Last-resort safety timer ───────────────────────────────
  // Only fires if the video completely fails to progress to 11.19s
  // within 20s (covers the worst mobile/slow network case).
  // The 7s timer from before was firing on normal connections because
  // canplay on a 3.5MB WebM can take 5-8s on mobile 4G.
  let safetyTimerId = setTimeout(() => {
    dismissLoadingScreen();
    fadeOutContainer(container, 500);
    initiateEntrance('fallback');
  }, 20000);

  function clearSafetyTimer() {
    clearTimeout(safetyTimerId);
  }
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
// SECTION NAVIGATION — dot nav + label
// ============================================================
export function initNavigation() {
  const dots          = document.querySelectorAll('.dot-nav__dot');
  const sectionLabel  = document.getElementById('section-label');
  const sections      = document.querySelectorAll('[data-section]');
  const mobileProgress = document.getElementById('mobile-progress');

  // Dot click → smooth scroll to section
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const target = document.getElementById(dot.dataset.section);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // IntersectionObserver: update active dot + section label + bird
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
        const sectionId = entry.target.dataset.section;
        const label     = entry.target.dataset.sectionLabel;

        dots.forEach(dot => {
          dot.classList.toggle('is-active', dot.dataset.section === sectionId);
        });

        if (sectionLabel && label) {
          sectionLabel.textContent = label;
          sectionLabel.classList.add('is-visible');
        }

        window._rinovo?.bird?.onSectionChange?.(sectionId);
        document.body.dataset.activeSection = sectionId;
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(section => observer.observe(section));

  // Mobile scroll progress bar
  window.addEventListener('scroll', () => {
    if (!mobileProgress) return;
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    mobileProgress.style.width = `${(scrolled / total) * 100}%`;
  }, { passive: true });
}

// ============================================================
// REVEAL ANIMATIONS
// (IntersectionObserver-based fallback for .reveal-fade elements)
// ============================================================
export function initRevealAnimations() {
  const revealElements = document.querySelectorAll(
    '.reveal-fade, .pencil-divider, .portfolio__brushstroke, .philosophy__underline-word'
  );

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

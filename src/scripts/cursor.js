/**
 * RINOVO — Custom Cursor
 * The gold dot that follows the visitor's hand.
 */

import { onCursorNearBird } from './scene.js';

let dot, ring, holdLabel;
let mouseX = 0, mouseY = 0;
let dotX = 0, dotY = 0;
let ringX = 0, ringY = 0;
let isHovering = false;
let holdTimer = null;
let holdProgress = 0;

export function initCursor() {
  dot = document.getElementById('cursor-dot');
  ring = document.getElementById('cursor-ring');
  holdLabel = document.getElementById('cursor-hold-label');

  if (!dot || !ring) return;

  // Only activate on pointer devices
  if (!window.matchMedia('(hover: hover)').matches) return;

  // Track mouse position
  window.addEventListener('mousemove', onMouseMove, { passive: true });

  // Hover state detection
  setupHoverDetection();

  // Portfolio card hold behavior
  setupHoldBehavior();

  // Lerp animation loop
  animateCursor();
}

// ============================================================
// MOUSE TRACKING
// ============================================================
function onMouseMove(e) {
  mouseX = e.clientX;
  mouseY = e.clientY;

  // Bird proximity check
  onCursorNearBird(mouseX, mouseY);
}

// ============================================================
// LERP ANIMATION
// ============================================================
function animateCursor() {
  // Dot: tighter lerp (more responsive)
  dotX += (mouseX - dotX) * 0.22;
  dotY += (mouseY - dotY) * 0.22;

  // Ring: looser lerp (lags behind)
  ringX += (mouseX - ringX) * 0.10;
  ringY += (mouseY - ringY) * 0.10;

  if (dot) {
    dot.style.left = `${dotX}px`;
    dot.style.top  = `${dotY}px`;
  }

  if (ring) {
    ring.style.left = `${ringX}px`;
    ring.style.top  = `${ringY}px`;
  }

  if (holdLabel) {
    holdLabel.style.left = `${mouseX}px`;
    holdLabel.style.top  = `${mouseY}px`;
  }

  requestAnimationFrame(animateCursor);
}

// ============================================================
// HOVER DETECTION
// ============================================================
function setupHoverDetection() {
  const hoverTargets = 'a, button, .project-card, .btn-cta, .dot-nav__dot';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverTargets)) {
      ring?.classList.add('is-hovering');
      isHovering = true;
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverTargets)) {
      ring?.classList.remove('is-hovering');
      isHovering = false;
    }
  });
}

// ============================================================
// HOLD-TO-REVEAL (Portfolio Cards)
// ============================================================
function setupHoldBehavior() {
  const cards = document.querySelectorAll('.project-card');

  cards.forEach(card => {
    const holdRingCircle = card.querySelector('.project-card__hold-ring circle');
    const circumference = 2 * Math.PI * 35; // r=35

    if (holdRingCircle) {
      holdRingCircle.style.strokeDasharray = circumference;
      holdRingCircle.style.strokeDashoffset = circumference;
    }

    // Desktop: mousedown + mouseup
    card.addEventListener('mouseenter', () => {
      holdLabel?.classList.add('is-visible');
      ring?.classList.add('is-hovering');
    });

    card.addEventListener('mouseleave', () => {
      holdLabel?.classList.remove('is-visible');
      ring?.classList.remove('is-hovering', 'is-holding');
      cancelHold(card, holdRingCircle, circumference);
    });

    card.addEventListener('mousedown', () => {
      startHold(card, holdRingCircle, circumference);
    });

    card.addEventListener('mouseup', () => {
      cancelHold(card, holdRingCircle, circumference);
    });

    // Mobile: touchstart + touchend
    card.addEventListener('touchstart', (e) => {
      startHold(card, holdRingCircle, circumference);
    }, { passive: true });

    card.addEventListener('touchend', () => {
      cancelHold(card, holdRingCircle, circumference);
    });
  });
}

function startHold(card, circle, circumference) {
  card.classList.add('is-holding');
  ring?.classList.add('is-holding');
  holdProgress = 0;

  const duration = 1500; // 1.5s to reveal
  const startTime = performance.now();

  function animateHold(now) {
    const elapsed = now - startTime;
    holdProgress = Math.min(elapsed / duration, 1);

    if (circle) {
      circle.style.strokeDashoffset = circumference * (1 - holdProgress);
    }

    if (holdProgress < 1) {
      holdTimer = requestAnimationFrame(animateHold);
    } else {
      // Reveal!
      revealProjectVideo(card);
    }
  }

  holdTimer = requestAnimationFrame(animateHold);
}

function cancelHold(card, circle, circumference) {
  if (holdTimer) {
    cancelAnimationFrame(holdTimer);
    holdTimer = null;
  }
  holdProgress = 0;
  card.classList.remove('is-holding');
  ring?.classList.remove('is-holding');

  if (circle) {
    circle.style.transition = 'stroke-dashoffset 300ms ease';
    circle.style.strokeDashoffset = circumference;
    setTimeout(() => { circle.style.transition = ''; }, 310);
  }
}

function revealProjectVideo(card) {
  const video = card.querySelector('.project-card__video');
  card.classList.add('is-revealed');
  card.classList.remove('is-holding');
  ring?.classList.remove('is-holding');

  if (video) {
    video.play().catch(() => {});
  }

  // Trigger mist effect
  const mist = document.getElementById('mist-overlay');
  if (mist) {
    mist.style.transition = 'opacity 300ms ease';
    mist.style.opacity = '0.4';
    setTimeout(() => {
      mist.style.transition = 'opacity 500ms ease';
      mist.style.opacity = '0';
    }, 400);
  }

  // Bird flies over to watch
  window._rinovo?.bird?.onSectionChange?.('portfolio');

  // Reset on click/tap after reveal
  const resetReveal = () => {
    card.classList.remove('is-revealed');
    if (video) { video.pause(); video.currentTime = 0; }
    card.removeEventListener('click', resetReveal);
    card.removeEventListener('touchend', resetReveal);
  };

  setTimeout(() => {
    card.addEventListener('click', resetReveal, { once: true });
    card.addEventListener('touchend', resetReveal, { once: true });
  }, 500);
}

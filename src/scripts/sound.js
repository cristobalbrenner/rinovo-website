/**
 * RINOVO — Ambient Sound System
 *
 * Sound cannot play until after the first user gesture (browser policy).
 * We preload Howler + the audio file immediately so zero loading delay
 * occurs when the gesture finally arrives.
 *
 * Timing:
 *   - On mobile: user taps the "tap to begin" screen → gesture unlocks both
 *     video and audio simultaneously. Sound fades in as bird lands.
 *   - On desktop: video autoplays. Sound fades in when bird lands IF the user
 *     has already interacted (scrolled, clicked, etc); otherwise waits for
 *     first interaction and plays then.
 */

let Howl;
let sound = null;
let isMuted = false;
let hasInteracted = false;

// Volume ceiling — lower than before; ambient should feel like a presence,
// not a performance. User can always toggle off.
const TARGET_VOLUME  = 0.20;
const FADE_IN_MS     = 2200;

export async function initSound() {
  const toggle = document.getElementById('sound-toggle');
  const wave   = document.getElementById('sound-wave');
  const label  = document.getElementById('sound-label');

  if (!toggle) return;

  // Restore explicit mute preference
  if (sessionStorage.getItem('rinovo-sound') === 'off') {
    isMuted = true;
  }
  updateSoundUI(isMuted, wave, label);
  toggle.setAttribute('aria-pressed', String(!isMuted));

  // ── Preload Howler + audio file immediately ────────────────
  // We load now (no gesture needed to preload) so the file is buffered
  // and ready the instant the user gesture arrives.
  try {
    const howler = await import('howler');
    Howl = howler.Howl;
    if (!isMuted) {
      sound = new Howl({
        src: ['/audio/rinovo-ambient.mp3'],
        loop: true,
        volume: 0,
        html5: true,
        preload: true,
        onloaderror: () => { sound = null; },
      });
    }
  } catch {
    // Howler failed to load — audio feature gracefully absent
  }

  // ── First interaction = gesture unlock ─────────────────────
  // Called by the "tap to begin" screen (mobile) or any page interaction.
  // Exposed so main.js can call it directly when the tap screen is tapped.
  window._rinovo = window._rinovo || {};
  window._rinovo.unlockAudio = unlockAudio;

  document.addEventListener('click',      unlockAudio, { once: true });
  document.addEventListener('scroll',     unlockAudio, { once: true, passive: true });
  document.addEventListener('keydown',    unlockAudio, { once: true });
  // Note: touchstart is intentionally omitted here — the "tap to begin"
  // screen calls unlockAudio() directly, coordinating with video.play().

  // ── Play when bird lands (after gesture has been given) ───
  // Sound arriving with the bird settling feels intentional, not accidental.
  window.addEventListener('rinovo:bird-landed', () => {
    if (!isMuted && hasInteracted) {
      playNow();
    }
  }, { once: true });

  // ── Sound toggle button ────────────────────────────────────
  toggle.addEventListener('click', async (e) => {
    e.stopPropagation();
    isMuted = !isMuted;
    sessionStorage.setItem('rinovo-sound', isMuted ? 'off' : 'on');
    toggle.setAttribute('aria-pressed', String(!isMuted));
    updateSoundUI(isMuted, wave, label);

    if (!isMuted) {
      hasInteracted = true;
      ensureSoundObject();
      playNow();
    } else {
      fadeOut();
    }
  });
}

// Called externally (from main.js tap screen) to mark gesture received
function unlockAudio() {
  if (hasInteracted) return;
  hasInteracted = true;
  // Sound will start when rinovo:bird-landed fires (see above).
  // If bird has already landed by the time this fires, play immediately.
  if (!isMuted && window._rinovo?._birdHasLanded) {
    playNow();
  }
}

function ensureSoundObject() {
  if (sound || !Howl) return;
  sound = new Howl({
    src: ['/audio/rinovo-ambient.mp3'],
    loop: true,
    volume: 0,
    html5: true,
    preload: true,
    onloaderror: () => { sound = null; },
  });
}

function playNow() {
  if (isMuted || !Howl) return;
  ensureSoundObject();
  if (!sound) return;
  if (!sound.playing()) sound.play();
  sound.fade(sound.volume(), TARGET_VOLUME, FADE_IN_MS);
}

function fadeOut() {
  if (!sound || !sound.playing()) return;
  sound.fade(sound.volume(), 0, 2000);
  setTimeout(() => sound.stop(), 2100);
}

function updateSoundUI(muted, wave, label) {
  if (wave)  wave.classList.toggle('is-muted', muted);
  if (label) label.textContent = muted ? '♪ on' : '♪ off';
}

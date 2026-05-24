/**
 * RINOVO — Ambient Sound System
 * Plays on first user interaction (browser requires this — true autoplay is blocked).
 * Toggle in nav lets user mute/unmute. State persists in sessionStorage.
 */

let Howl;
let sound = null;
let isMuted = false; // default: sound ON (plays on first interaction)
let hasInteracted = false;

export async function initSound() {
  const toggle = document.getElementById('sound-toggle');
  const wave   = document.getElementById('sound-wave');
  const label  = document.getElementById('sound-label');

  if (!toggle) return;

  // Restore explicit mute preference — only mute if user previously turned it off
  if (sessionStorage.getItem('rinovo-sound') === 'off') {
    isMuted = true;
  }

  updateSoundUI(isMuted, wave, label);
  toggle.setAttribute('aria-pressed', String(!isMuted));

  // Play on first interaction (browsers block autoplay before user gesture)
  const unlockAudio = () => {
    if (hasInteracted) return;
    hasInteracted = true;
    if (!isMuted) loadAndPlay();
  };

  document.addEventListener('click',      unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
  document.addEventListener('scroll',     unlockAudio, { once: true, passive: true });
  document.addEventListener('keydown',    unlockAudio, { once: true });

  // Toggle button
  toggle.addEventListener('click', async (e) => {
    e.stopPropagation(); // don't double-trigger unlock
    isMuted = !isMuted;
    sessionStorage.setItem('rinovo-sound', isMuted ? 'off' : 'on');
    toggle.setAttribute('aria-pressed', String(!isMuted));
    updateSoundUI(isMuted, wave, label);

    if (!isMuted) {
      hasInteracted = true;
      await loadAndPlay();
    } else {
      fadeOut();
    }
  });
}

async function loadAndPlay() {
  if (isMuted) return;

  if (!Howl) {
    try {
      const howler = await import('howler');
      Howl = howler.Howl;
    } catch {
      return;
    }
  }

  if (!sound) {
    sound = new Howl({
      src: ['/audio/rinovo-ambient.mp3'],
      loop: true,
      volume: 0,
      html5: true,
      onloaderror: () => { sound = null; },
    });
  }

  if (!sound.playing()) sound.play();
  sound.fade(sound.volume(), 0.38, 2500);
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

/**
 * RINOVO — Ambient Sound System
 * One continuous soundtrack loops across the whole site.
 * Always muted on load. User opts in. State persists in sessionStorage.
 */

let Howl;
let isMuted = true;
let sound = null;
let isLoaded = false;

export async function initSound() {
  const toggle = document.getElementById('sound-toggle');
  const wave   = document.getElementById('sound-wave');
  const label  = document.getElementById('sound-label');

  if (!toggle) return;

  // Restore last session preference
  isMuted = sessionStorage.getItem('rinovo-sound') !== 'on';
  updateSoundUI(isMuted, wave, label);
  toggle.setAttribute('aria-pressed', String(!isMuted));

  toggle.addEventListener('click', async () => {
    isMuted = !isMuted;
    sessionStorage.setItem('rinovo-sound', isMuted ? 'off' : 'on');
    toggle.setAttribute('aria-pressed', String(!isMuted));
    updateSoundUI(isMuted, wave, label);

    if (!isMuted) {
      await loadAndPlay();
    } else {
      fadeOut();
    }
  });

  // If user had sound on last session, auto-play on first interaction
  if (!isMuted) {
    const unlock = async () => {
      await loadAndPlay();
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }
}

async function loadAndPlay() {
  if (!Howl) {
    try {
      const howler = await import('howler');
      Howl = howler.Howl;
    } catch {
      return; // Howler failed to load — silent
    }
  }

  if (!sound) {
    sound = new Howl({
      src: ['/audio/rinovo-ambient.mp3'],
      loop: true,
      volume: 0,
      html5: true, // streams on mobile instead of buffering fully
      onloaderror: () => { sound = null; }, // reset if file missing
    });
  }

  if (!sound.playing()) {
    sound.play();
  }

  // Fade in to a warm, unobtrusive level
  sound.fade(sound.volume(), 0.35, 2000);
  isLoaded = true;
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

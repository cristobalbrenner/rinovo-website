/**
 * RINOVO — Ambient Sound System (Howler.js)
 * Always muted on load. Sound is architecture, not background.
 */

// Howler is loaded lazily to avoid blocking initial render
let Howl;
let isMuted = true;
let currentSection = 'hero';

const AUDIO_LAYERS = {
  hero:       { src: ['/audio/hero-ambient.mp3'],       volume: 0.4 },
  philosophy: { src: ['/audio/philosophy-ambient.mp3'], volume: 0.35 },
  process:    { src: ['/audio/process-ambient.mp3'],    volume: 0.3 },
  portfolio:  { src: ['/audio/portfolio-ambient.mp3'],  volume: 0.35 },
  contact:    { src: ['/audio/contact-ambient.mp3'],    volume: 0.25 },
};

let sounds = {};
let activeSound = null;

export async function initSound() {
  const toggle = document.getElementById('sound-toggle');
  const wave = document.getElementById('sound-wave');
  const label = document.getElementById('sound-label');

  if (!toggle) return;

  // Restore session state
  isMuted = sessionStorage.getItem('rinovo-sound') !== 'on';

  updateSoundUI(isMuted, wave, label);
  toggle.setAttribute('aria-pressed', !isMuted);

  toggle.addEventListener('click', async () => {
    isMuted = !isMuted;
    sessionStorage.setItem('rinovo-sound', isMuted ? 'off' : 'on');
    toggle.setAttribute('aria-pressed', !isMuted);
    updateSoundUI(isMuted, wave, label);

    if (!isMuted) {
      // First unmute — load Howler lazily
      if (!Howl) {
        try {
          const howler = await import('howler');
          Howl = howler.Howl;
          preloadSounds();
        } catch (e) {
          // Howler not available — silent failure
          return;
        }
      }
      playSection(currentSection);
    } else {
      fadeOutAll();
    }
  });

  // Listen for section changes
  document.addEventListener('rinovo:section-change', (e) => {
    currentSection = e.detail.sectionId;
    if (!isMuted) playSection(currentSection);
  });
}

function updateSoundUI(muted, wave, label) {
  if (wave) wave.classList.toggle('is-muted', muted);
  if (label) label.textContent = muted ? '♪ on' : '♪ off';
}

function preloadSounds() {
  if (!Howl) return;
  Object.entries(AUDIO_LAYERS).forEach(([key, config]) => {
    sounds[key] = new Howl({
      src: config.src,
      loop: true,
      volume: 0,
      preload: true,
    });
  });
}

function playSection(sectionId) {
  if (!Howl || isMuted) return;
  const config = AUDIO_LAYERS[sectionId];
  const sound = sounds[sectionId];
  if (!sound || !config) return;

  // Fade out current
  fadeOutAll();

  // Fade in new
  sound.play();
  sound.fade(0, config.volume, 2000);
  activeSound = sound;
}

function fadeOutAll() {
  Object.values(sounds).forEach(sound => {
    if (sound.playing()) {
      sound.fade(sound.volume(), 0, 2000);
      setTimeout(() => sound.stop(), 2100);
    }
  });
  activeSound = null;
}

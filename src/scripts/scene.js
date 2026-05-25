/**
 * RINOVO — Three.js Scene
 * Loads the real origami bird GLB. Falls back to geometric placeholder if missing.
 * Canvas is transparent + z-index 20 so the bird floats above all page content.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

window._rinovo = window._rinovo || {};

let renderer, scene, camera, animId;
let time = 0;

// ============================================================
// INIT
// ============================================================
export async function initScene() {
  const canvas = document.getElementById('rinovo-canvas');
  if (!canvas) return;

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // transparent — sections show through
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95; // was 1.4 — was washing out texture colors

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  setupLighting();

  // Try loading the real GLB — fall back to placeholder on failure
  const bird = await loadBird();
  bird.visible = false; // Hidden until entrance animation begins (during video)
  scene.add(bird);

  window._rinovo.bird = {
    mesh: bird,
    onSectionChange: (id) => onBirdSectionChange(bird, id),
    beginTransformation: (mode) => beginBirdTransformation(bird, mode),
  };

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else animate();
  });

  animate();
}

// ============================================================
// LIGHTING
// ============================================================
function setupLighting() {
  // Ambient: soft neutral-warm fill — low enough that textures read clearly
  scene.add(new THREE.AmbientLight(0xfff5e8, 0.5));

  // Key: warm afternoon light from upper-right — toned down so texture shows
  const key = new THREE.DirectionalLight(0xfff0d8, 1.1);
  key.position.set(6, 8, 6);
  scene.add(key);

  // Rim: ember accent from behind-left — defines the breast and tail edge
  const rim = new THREE.DirectionalLight(0xC94F1A, 0.55);
  rim.position.set(-8, 2, -4);
  scene.add(rim);

  // Fill: gentle warm bounce from below-left — lifts shadow areas softly
  const fill = new THREE.DirectionalLight(0xffe8c8, 0.35);
  fill.position.set(-4, 4, 8);
  scene.add(fill);
}

// ============================================================
// LOAD REAL GLB BIRD
// ============================================================
function loadBird() {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();

    loader.load(
      '/models/weaverbird.glb',

      // SUCCESS — model loaded
      (gltf) => {
        const model = gltf.scene;

        // Scale — smaller on mobile (portrait frustum is much narrower)
        const isMobile = window.innerWidth < 768;
        const targetSize = isMobile ? 0.58 : 0.9;
        const box = new THREE.Box3().setFromObject(model);
        const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
        const scale = targetSize / maxDim;
        model.scale.setScalar(scale);

        // Center at origin before repositioning
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));

        enhanceMeshLighting(model);

        // Starting position = hero focal point for this device
        const heroFP = isMobile ? FOCAL_POINTS.hero_mobile : FOCAL_POINTS.hero;
        model.position.copy(heroFP);
        model.rotation.set(0.20, 1.25, 0);

        console.log('✓ Weaverbird GLB loaded');
        resolve(model);
      },

      // PROGRESS
      (xhr) => {
        if (xhr.total) {
          const pct = Math.round(xhr.loaded / xhr.total * 100);
          if (pct % 25 === 0) console.log(`Bird loading: ${pct}%`);
        }
      },

      // ERROR — fall back to placeholder
      (err) => {
        console.warn('GLB not found, using placeholder:', err.message);
        resolve(createPlaceholderBird());
      }
    );
  });
}

// ============================================================
// ENHANCE MESH LIGHTING
// Keeps Meshy's original textures/colors intact.
// Just tunes roughness/metalness so the model responds well
// to our warm RINOVO lighting rig.
// ============================================================
function enhanceMeshLighting(model) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;

    // Clone material so we don't mutate the shared original
    if (child.material) {
      child.material = child.material.clone();
      // Let texture colors read clearly — minimal roughness/metalness change
      if (child.material.roughness !== undefined) child.material.roughness = 0.62;
      if (child.material.metalness !== undefined) child.material.metalness = 0.08;
      // No emissive boost — ambient + fill lights handle dark-section visibility
    }
  });
}

// ============================================================
// PLACEHOLDER BIRD (if GLB fails to load)
// ============================================================
function createPlaceholderBird() {
  const group = new THREE.Group();

  const mW = new THREE.MeshStandardMaterial({ color: 0x1A1814, roughness: 0.6, flatShading: true });
  const mB = new THREE.MeshStandardMaterial({ color: 0xD4933A, roughness: 0.45, flatShading: true, emissive: 0xD4933A, emissiveIntensity: 0.06 });
  const mE = new THREE.MeshStandardMaterial({ color: 0xC94F1A, roughness: 0.45, flatShading: true, emissive: 0xC94F1A, emissiveIntensity: 0.15 });

  const add = (mat, verts) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    g.computeVertexNormals();
    group.add(new THREE.Mesh(g, mat));
  };

  // Body
  add(mB, [
     0,  .6,  0,  -.55, .1, .08,   0, -.1, .12,
     0, -.1, .12,  -.55, .1, .08,  -.1, -.6,  0,
     0,  .6,  0,   0, -.1, .12,   .55,  .2,  0,
     0, -.1, .12,   .2, -.55, 0,   .55,  .2,  0,
  ]);
  // Left wing
  add(mW, [
    -.55,.1,.08, -1.8,.5,-.1, -1.1,-.2,-.05,
    -.55,.1,.08, -1.1,-.2,-.05, -.1,-.6,0,
  ]);
  // Right wing
  add(mW, [
    .55,.2,0, 1.5,.7,-.08, 1.2,0,-.05,
    .55,.2,0, 1.2,0,-.05, .2,-.55,0,
  ]);
  // Tail + head
  add(mW, [-.1,-.6,0, -.55,-1.1,-.05, .2,-.55,0]);
  add(mW, [0,.6,0, .55,.2,0, .3,.9,.05]);
  // Breast
  add(mE, [0,-.1,.14, .55,.2,.02, .2,-.55,.02]);

  group.position.set(2.8, 1.2, 0);
  group.rotation.set(0.1, -0.15, 0.08);
  group.scale.setScalar(0.42);
  return group;
}

// ============================================================
// FOCAL POINTS per section
// Desktop: wide frustum (~±6 units horizontal)
// Mobile:  narrow portrait frustum (~±1.6 units horizontal)
// ============================================================
const FOCAL_POINTS = {
  // — Desktop —
  hero:       new THREE.Vector3( 2.6,  1.1, 0),
  philosophy: new THREE.Vector3(-2.4,  0.8, 0),
  process:    new THREE.Vector3( 0.0,  1.0, 0),
  portfolio:  new THREE.Vector3( 2.4,  1.4, 0),
  contact:    new THREE.Vector3( 0.0, -1.6, 0),
  // — Mobile (portrait) — keep x within ±1.4 so bird stays on-screen —
  hero_mobile:       new THREE.Vector3( 1.0,  1.0, 0),
  philosophy_mobile: new THREE.Vector3(-0.8,  0.8, 0),
  process_mobile:    new THREE.Vector3( 0.0,  0.8, 0),
  portfolio_mobile:  new THREE.Vector3( 0.8,  1.2, 0),
  contact_mobile:    new THREE.Vector3( 0.0, -1.2, 0),
};

function getFP(sectionId) {
  const mobile = window.innerWidth < 768;
  const key = mobile ? `${sectionId}_mobile` : sectionId;
  return FOCAL_POINTS[key] || FOCAL_POINTS[sectionId];
}

let currentSection = 'hero';
let isFlying = false;
// +1 = facing right (nose right), -1 = facing left (nose left)
// idle loop reads this so the bird holds whichever way it last flew
let facingDir = 1;

function onBirdSectionChange(bird, sectionId) {
  if (sectionId === currentSection || isFlying) return;
  currentSection = sectionId;
  const target = getFP(sectionId);
  if (target) flyBirdTo(bird, target);
}

function flyBirdTo(bird, targetPos) {
  isFlying = true;
  const startPos = bird.position.clone();

  // Direction of travel determines which way the beak points
  const dx = targetPos.x - startPos.x;
  facingDir = dx >= 0 ? 1 : -1; // +1 right, -1 left
  const faceY = facingDir * 1.25; // ±72° side profile

  const duration = 850;
  const startTime = performance.now();

  const mid = startPos.clone().lerp(targetPos, 0.5);
  mid.y += 1.4; // arc height

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    const i = 1 - e;

    bird.position.x = i*i*startPos.x + 2*i*e*mid.x + e*e*targetPos.x;
    bird.position.y = i*i*startPos.y + 2*i*e*mid.y + e*e*targetPos.y;
    bird.position.z = i*i*startPos.z + 2*i*e*mid.z + e*e*targetPos.z;

    // Bank into the turn direction; hold side profile throughout
    bird.rotation.y = faceY + Math.sin(e * Math.PI) * (facingDir * 0.08);
    bird.rotation.z = Math.sin(e * Math.PI) * (facingDir * -0.35);
    bird.rotation.x = 0.20 + Math.sin(e * Math.PI) * -0.06;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      bird.rotation.set(0.20, faceY, 0);
      isFlying = false;
    }
  }
  requestAnimationFrame(step);
}

// ============================================================
// BIRD ENTRANCE — two starting positions:
//   fromVideoExit = true  → bird emerges from center-top (where real bird exited video)
//   fromVideoExit = false → bird sweeps in from off-screen right (no-video fallback)
// ============================================================
export function birdEntranceAnimation(bird, { fromVideoExit = false, delay = 300 } = {}, onComplete) {
  const heroTarget = getFP('hero').clone();
  const isMobile   = window.innerWidth < 768;

  // Starting position
  if (fromVideoExit) {
    // Real bird exited upper-center of video — 3D equivalent: center-top
    bird.position.set(0.1, 2.4, 0);
  } else {
    // Sweep in from far off-screen right
    bird.position.set(isMobile ? 4 : 9, -0.8, 0);
  }
  bird.visible = false;

  setTimeout(() => {
    bird.visible = true;
    isFlying = true;

    const startPos = bird.position.clone();

    // Direction: startPos → heroTarget
    const dx = heroTarget.x - startPos.x;
    facingDir = dx >= 0 ? 1 : -1;
    const faceY = facingDir * 1.25;

    // Bézier arc control point
    const arc = fromVideoExit
      ? new THREE.Vector3(isMobile ? 0.6 : 1.6, 2.1, 0)  // gentle curve downward-right
      : new THREE.Vector3(isMobile ? 2.2 : 5.0, 2.6, 0); // sweeping arc from right

    const duration  = fromVideoExit ? 1300 : 1700;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
      const i = 1 - e;

      bird.position.x = i*i*startPos.x + 2*i*e*arc.x + e*e*heroTarget.x;
      bird.position.y = i*i*startPos.y + 2*i*e*arc.y + e*e*heroTarget.y;

      // Beak always faces travel direction, bank eases in/out
      bird.rotation.y = faceY + Math.sin(e * Math.PI) * (facingDir * 0.10);
      bird.rotation.z = Math.sin(e * Math.PI) * (facingDir * (fromVideoExit ? -0.18 : -0.45));
      bird.rotation.x = 0.20 + Math.sin(e * Math.PI) * -0.08;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        bird.rotation.set(0.20, faceY, 0);
        isFlying = false;
        onComplete?.();
      }
    }
    requestAnimationFrame(step);
  }, delay);
}

// Called by main.js — orchestrates mist + bird entrance
// mode: 'video' | 'fallback'
function beginBirdTransformation(bird, mode = 'fallback') {
  const mist = document.getElementById('mist-overlay');

  if (mist) {
    mist.style.transition = 'opacity 500ms cubic-bezier(0.4,0,0.2,1)';
    mist.style.opacity = '1';
    // Start clearing once bird is in motion
    setTimeout(() => {
      mist.style.transition = 'opacity 900ms cubic-bezier(0.25,0.1,0.1,1)';
      mist.style.opacity = '0';
    }, 550);
  }

  birdEntranceAnimation(
    bird,
    { fromVideoExit: mode === 'video', delay: 280 },
    () => window.dispatchEvent(new CustomEvent('rinovo:bird-landed'))
  );
}

// Export so main.js can call with the right mode
export function triggerBirdEntrance(mode) {
  const bird = window._rinovo?.bird?.mesh;
  if (bird) beginBirdTransformation(bird, mode);
}

// ============================================================
// CURSOR PROXIMITY
// ============================================================
export function onCursorNearBird(cursorX, cursorY) {
  if (!window._rinovo?.bird?.mesh || !camera) return;
  const bird = window._rinovo.bird.mesh;
  const bp = bird.position.clone().project(camera);
  const sx = (bp.x + 1) / 2 * window.innerWidth;
  const sy = (1 - bp.y) / 2 * window.innerHeight;
  const dist = Math.hypot(cursorX - sx, cursorY - sy);

  // Find ember breast mesh and make it glow near cursor
  bird.traverse((child) => {
    if (child.isMesh && child.material?.emissive) {
      const col = child.material.color;
      const hsl = {};
      col.getHSL(hsl);
      if (hsl.h > 0.03 && hsl.h < 0.12) { // orange range = breast
        child.material.emissiveIntensity = dist < 140
          ? 0.18 + (1 - dist / 140) * 0.45
          : 0.18;
      }
    }
  });

  if (dist < 30) triggerBirdFlutter(bird);
}

let lastFlutterTime = 0;
function triggerBirdFlutter(bird) {
  const now = performance.now();
  if (now - lastFlutterTime < 2500) return;
  lastFlutterTime = now;
  let f = 0;
  const iv = setInterval(() => {
    f += 0.25;
    bird.rotation.z = Math.sin(f * 7) * 0.28;
    bird.rotation.x = Math.sin(f * 5) * 0.12;
    if (f > Math.PI * 1.2) {
      clearInterval(iv);
      bird.rotation.z = 0;
      bird.rotation.x = 0.05;
    }
  }, 28);
}

// ============================================================
// RENDER LOOP
// ============================================================
function animate() {
  animId = requestAnimationFrame(animate);
  time += 0.016;

  const bird = window._rinovo?.bird?.mesh;
  if (bird && !isFlying) {
    // Idle breathing — holds whichever direction the bird last flew
    const faceY = facingDir * 1.25;
    bird.position.y += Math.sin(time * 0.9) * 0.0018;
    bird.rotation.x =  0.20 + Math.sin(time * 0.38) * 0.03;
    bird.rotation.y =  faceY + Math.sin(time * 0.22) * 0.06; // side-on, direction-aware
    bird.rotation.z =          Math.sin(time * 0.17) * 0.022;
    camera.position.x = Math.sin(time * 0.18) * 0.05;
    camera.position.y = Math.sin(time * 0.12) * 0.025;
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
}

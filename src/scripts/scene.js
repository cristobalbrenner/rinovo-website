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
  renderer.toneMappingExposure = 1.4;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  setupLighting();

  // Try loading the real GLB — fall back to placeholder on failure
  const bird = await loadBird();
  scene.add(bird);

  window._rinovo.bird = {
    mesh: bird,
    onSectionChange: (id) => onBirdSectionChange(bird, id),
    beginTransformation: () => beginBirdTransformation(bird),
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
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.9));

  const key = new THREE.DirectionalLight(0xffe4b0, 2.4);
  key.position.set(6, 8, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xC94F1A, 0.8);
  rim.position.set(-8, 2, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffd0a0, 0.5);
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

        // Auto-scale to fit nicely in scene
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 1.8; // how tall/wide the bird should be in scene units
        const scale = targetSize / maxDim;
        model.scale.setScalar(scale);

        // Center the model at origin first
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));

        // Apply RINOVO brand materials based on mesh position/name
        applyBrandMaterials(model);

        // Position in hero — upper right
        model.position.set(2.8, 1.2, 0);
        model.rotation.set(0.05, -0.1, 0.05);

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
// APPLY BRAND MATERIALS TO GLB
// Overrides Meshy.ai's exported materials with RINOVO colors.
// Tries to detect which part is wing/body/breast by mesh name or position.
// ============================================================
function applyBrandMaterials(model) {
  const matWing = new THREE.MeshStandardMaterial({
    color: 0x1A1814, roughness: 0.55, metalness: 0.08, flatShading: true,
  });
  const matBody = new THREE.MeshStandardMaterial({
    color: 0xD4933A, roughness: 0.42, metalness: 0.2, flatShading: true,
    emissive: 0xD4933A, emissiveIntensity: 0.06,
  });
  const matBreast = new THREE.MeshStandardMaterial({
    color: 0xC94F1A, roughness: 0.42, metalness: 0.1, flatShading: true,
    emissive: 0xC94F1A, emissiveIntensity: 0.18,
  });

  model.traverse((child) => {
    if (!child.isMesh) return;

    const name = (child.name || '').toLowerCase();

    // Try to match by mesh name (Meshy often names parts)
    if (name.includes('breast') || name.includes('orange') || name.includes('ember') || name.includes('red')) {
      child.material = matBreast;
    } else if (name.includes('wing') || name.includes('tail') || name.includes('head') || name.includes('black') || name.includes('dark')) {
      child.material = matWing;
    } else if (name.includes('body') || name.includes('gold') || name.includes('yellow') || name.includes('chest')) {
      child.material = matBody;
    } else {
      // No name match — detect by the mesh's existing color if available
      const existingColor = child.material?.color;
      if (existingColor) {
        const hsl = {};
        existingColor.getHSL(hsl);

        if (hsl.l < 0.15) {
          // Very dark — wing/tail/head
          child.material = matWing;
        } else if (hsl.h > 0.03 && hsl.h < 0.12) {
          // Orange-red range — breast
          child.material = matBreast;
        } else {
          // Default — gold body
          child.material = matBody;
        }
      } else {
        child.material = matBody;
      }
    }

    child.castShadow = false;
    child.receiveShadow = false;
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
// ============================================================
const FOCAL_POINTS = {
  hero:       new THREE.Vector3( 2.8,  1.2, 0),
  philosophy: new THREE.Vector3(-3.2,  0.8, 0),
  process:    new THREE.Vector3( 0.0,  1.2, 0),
  portfolio:  new THREE.Vector3( 2.6,  1.6, 0),
  contact:    new THREE.Vector3( 0.0, -1.8, 0),
};

let currentSection = 'hero';
let isFlying = false;

function onBirdSectionChange(bird, sectionId) {
  if (sectionId === currentSection || isFlying) return;
  currentSection = sectionId;
  const target = FOCAL_POINTS[sectionId];
  if (target) flyBirdTo(bird, target);
}

function flyBirdTo(bird, targetPos) {
  isFlying = true;
  const startPos = bird.position.clone();
  const duration = 850;
  const startTime = performance.now();

  const mid = startPos.clone().lerp(targetPos, 0.5);
  mid.y += 1.6;

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    const i = 1 - e;

    bird.position.x = i*i*startPos.x + 2*i*e*mid.x + e*e*targetPos.x;
    bird.position.y = i*i*startPos.y + 2*i*e*mid.y + e*e*targetPos.y;
    bird.position.z = i*i*startPos.z + 2*i*e*mid.z + e*e*targetPos.z;
    bird.rotation.z = Math.sin(e * Math.PI) * 0.45;
    bird.rotation.y = -0.1 + Math.sin(now * 0.01) * 0.25;

    if (t < 1) requestAnimationFrame(step);
    else { bird.rotation.z = 0; isFlying = false; }
  }
  requestAnimationFrame(step);
}

function beginBirdTransformation(bird) {
  const mist = document.getElementById('mist-overlay');
  if (!mist) return;
  mist.style.transition = 'opacity 400ms ease';
  mist.style.opacity = '1';
  setTimeout(() => {
    mist.style.transition = 'opacity 700ms ease';
    mist.style.opacity = '0';
  }, 500);
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
    bird.position.y += Math.sin(time * 0.9) * 0.0018;
    bird.rotation.y = -0.1 + Math.sin(time * 0.25) * 0.12;
    bird.rotation.x =  0.05 + Math.sin(time * 0.4)  * 0.04;
    bird.rotation.z = Math.sin(time * 0.18) * 0.03;
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

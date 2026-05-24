/**
 * RINOVO — Three.js Scene
 * Canvas is transparent + z-index 20 so the bird floats above all content.
 */

import * as THREE from 'three';

window._rinovo = window._rinovo || {};

let renderer, scene, camera, animId;
let time = 0;

// ============================================================
// SCENE INIT
// ============================================================
export async function initScene() {
  const canvas = document.getElementById('rinovo-canvas');
  if (!canvas) return;

  // alpha:true = transparent canvas background
  // The bird geometry floats over the page — canvas covers all but is see-through
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // fully transparent — sections show through
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  setupLighting();

  const bird = createOrigamiBird();
  scene.add(bird);

  window._rinovo.bird = {
    mesh: bird,
    onSectionChange: (sectionId) => onBirdSectionChange(bird, sectionId),
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
// LIGHTING — warm, always golden
// ============================================================
function setupLighting() {
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.8));

  const key = new THREE.DirectionalLight(0xffe4b0, 2.2);
  key.position.set(6, 8, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xC94F1A, 0.7);
  rim.position.set(-8, 2, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffd0a0, 0.5);
  fill.position.set(-4, 4, 8);
  scene.add(fill);
}

// ============================================================
// ORIGAMI BIRD — 3-zone geometry matching the logo exactly
// Charcoal wings/head/tail · Gold body · Ember breast
// ============================================================
function createOrigamiBird() {
  const group = new THREE.Group();

  const matWing = new THREE.MeshStandardMaterial({
    color: 0x1A1814, roughness: 0.55, metalness: 0.1, flatShading: true,
  });
  const matBody = new THREE.MeshStandardMaterial({
    color: 0xD4933A, roughness: 0.45, metalness: 0.18, flatShading: true,
    emissive: 0xD4933A, emissiveIntensity: 0.08,
  });
  const matBreast = new THREE.MeshStandardMaterial({
    color: 0xC94F1A, roughness: 0.45, metalness: 0.12, flatShading: true,
    emissive: 0xC94F1A, emissiveIntensity: 0.15,
  });

  // ── Gold body (central diamond mass) ──
  addMesh(group, matBody, [
    // upper-left face
     0.00,  0.60, 0.00,  -0.55,  0.10, 0.08,   0.00, -0.10, 0.12,
    // lower-left face
     0.00, -0.10, 0.12,  -0.55,  0.10, 0.08,  -0.10, -0.60, 0.00,
    // upper-right face
     0.00,  0.60, 0.00,   0.00, -0.10, 0.12,   0.55,  0.20, 0.00,
    // lower-right face
     0.00, -0.10, 0.12,   0.20, -0.55, 0.00,   0.55,  0.20, 0.00,
  ]);

  // ── Charcoal left wing (sweeps back and down) ──
  addMesh(group, matWing, [
    -0.55,  0.10, 0.08,  -1.80,  0.50, -0.10,  -1.10, -0.20, -0.05,
    -0.55,  0.10, 0.08,  -1.10, -0.20, -0.05,  -0.10, -0.60,  0.00,
    -1.80,  0.50, -0.10, -1.50, -0.10, -0.15,  -1.10, -0.20, -0.05,
  ]);

  // ── Charcoal right wing (shorter, angles up-right) ──
  addMesh(group, matWing, [
    0.55,  0.20,  0.00,  1.50,  0.70, -0.08,  1.20,  0.00, -0.05,
    0.55,  0.20,  0.00,  1.20,  0.00, -0.05,  0.20, -0.55,  0.00,
  ]);

  // ── Charcoal tail (points down-left) ──
  addMesh(group, matWing, [
    -0.10, -0.60,  0.00,  -0.55, -1.10, -0.05,   0.20, -0.55,  0.00,
    -0.55, -1.10, -0.05,  -0.10, -0.90, -0.08,   0.20, -0.55,  0.00,
  ]);

  // ── Charcoal head (small angular mass, upper-right) ──
  addMesh(group, matWing, [
     0.00,  0.60,  0.00,   0.55,  0.20,  0.00,   0.30,  0.90,  0.05,
     0.30,  0.90,  0.05,   0.55,  0.20,  0.00,   0.70,  0.65, -0.05,
  ]);

  // ── Ember breast patch (vivid, frontmost face) ──
  addMesh(group, matBreast, [
    0.00, -0.10, 0.14,   0.55,  0.20, 0.02,   0.20, -0.55, 0.02,
  ]);

  // Place in hero — upper right of viewport
  group.position.set(2.8, 1.2, 0);
  group.rotation.set(0.1, -0.15, 0.08);
  group.scale.setScalar(1.15);

  return group;
}

// Helper: build a BufferGeometry mesh from a flat array of vertex coords
function addMesh(parent, material, verts) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.computeVertexNormals();
  parent.add(new THREE.Mesh(geo, material));
}

// ============================================================
// FOCAL POINTS — bird perch position per section
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
  const duration = 800;
  const startTime = performance.now();

  const mid = startPos.clone().lerp(targetPos, 0.5);
  mid.y += 1.5;

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const i = 1 - e;

    bird.position.x = i*i*startPos.x + 2*i*e*mid.x + e*e*targetPos.x;
    bird.position.y = i*i*startPos.y + 2*i*e*mid.y + e*e*targetPos.y;
    bird.position.z = i*i*startPos.z + 2*i*e*mid.z + e*e*targetPos.z;

    bird.rotation.z = Math.sin(e * Math.PI) * 0.5;
    bird.rotation.y = -0.15 + Math.sin(now * 0.012) * 0.3;

    if (t < 1) requestAnimationFrame(step);
    else { bird.rotation.z = 0; isFlying = false; }
  }

  requestAnimationFrame(step);
}

function beginBirdTransformation(bird) {
  const mist = document.getElementById('mist-overlay');
  if (mist) {
    mist.style.transition = 'opacity 400ms ease';
    mist.style.opacity = '1';
    setTimeout(() => {
      mist.style.transition = 'opacity 600ms ease';
      mist.style.opacity = '0';
    }, 500);
  }
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

  // Breast mesh is last child
  const breast = bird.children[bird.children.length - 1];
  if (breast?.material) {
    breast.material.emissiveIntensity = dist < 140
      ? 0.15 + (1 - dist / 140) * 0.4
      : 0.15;
  }

  if (dist < 28) triggerBirdFlutter(bird);
}

let lastFlutterTime = 0;
function triggerBirdFlutter(bird) {
  const now = performance.now();
  if (now - lastFlutterTime < 2500) return;
  lastFlutterTime = now;
  let f = 0;
  const iv = setInterval(() => {
    f += 0.25;
    bird.rotation.z = Math.sin(f * 7) * 0.3;
    bird.rotation.x = Math.sin(f * 5) * 0.15;
    if (f > Math.PI * 1.2) {
      clearInterval(iv);
      bird.rotation.z = 0;
      bird.rotation.x = 0.1;
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
    // Hover breathing
    bird.position.y += Math.sin(time * 0.9) * 0.0018;
    // Slow idle look-around
    bird.rotation.y = -0.15 + Math.sin(time * 0.25) * 0.12;
    bird.rotation.x =  0.10 + Math.sin(time * 0.40) * 0.05;
    bird.rotation.z = Math.sin(time * 0.18) * 0.04;
    // Camera micro-drift
    camera.position.x = Math.sin(time * 0.18) * 0.06;
    camera.position.y = Math.sin(time * 0.12) * 0.03;
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
}

/**
 * RINOVO — Three.js Scene
 * The world the bird inhabits.
 */

import * as THREE from 'three';

// Global RINOVO namespace
window._rinovo = window._rinovo || {};

let renderer, scene, camera, animId;
let time = 0;

// ============================================================
// SCENE INIT
// ============================================================
export async function initScene() {
  const canvas = document.getElementById('rinovo-canvas');
  if (!canvas) return;

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1A1814, 0.015);

  // Camera
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  // Lighting — always warm, always architectural
  setupLighting();

  // Bird (placeholder geometry until .glb is ready)
  const bird = createBirdPlaceholder();
  scene.add(bird);

  // Store bird reference globally
  window._rinovo.bird = {
    mesh: bird,
    onSectionChange: (sectionId) => onBirdSectionChange(bird, sectionId),
    beginTransformation: () => beginBirdTransformation(bird),
  };

  // Resize handler
  window.addEventListener('resize', onResize);

  // Pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animate();
    }
  });

  // Start render loop
  animate();
}

// ============================================================
// LIGHTING — Late afternoon in a lovingly built room
// ============================================================
function setupLighting() {
  // Ambient — warm, soft
  const ambient = new THREE.AmbientLight(0xfff5e4, 0.5);
  scene.add(ambient);

  // Key light — warm gold from upper right
  const keyLight = new THREE.DirectionalLight(0xffe0b0, 1.4);
  keyLight.position.set(5, 10, 5);
  keyLight.castShadow = true;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 50;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  // Rim light — ember from behind, left
  const rimLight = new THREE.DirectionalLight(0xd4933a, 0.4);
  rimLight.position.set(-8, 2, -5);
  scene.add(rimLight);

  // Fill light — very soft, prevents total black
  const fillLight = new THREE.DirectionalLight(0xffecd2, 0.2);
  fillLight.position.set(-3, 3, 3);
  scene.add(fillLight);
}

// ============================================================
// BIRD PLACEHOLDER — geometric origami stand-in
// (Replace with actual .glb when Blender model is ready)
// ============================================================
function createBirdPlaceholder() {
  const birdGroup = new THREE.Group();

  // Materials matching logo zones
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x1A1814,      // --rinovo-charcoal
    roughness: 0.6,
    metalness: 0.1,
  });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xD4933A,      // --rinovo-gold
    roughness: 0.5,
    metalness: 0.15,
  });
  const breastMat = new THREE.MeshStandardMaterial({
    color: 0xC94F1A,      // --rinovo-ember
    roughness: 0.5,
    metalness: 0.1,
    emissive: 0xC94F1A,
    emissiveIntensity: 0.05,
  });

  // Body — tetrahedron for origami feel
  const bodyGeo = new THREE.TetrahedronGeometry(0.35, 0);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0, 0);
  body.rotation.set(0.3, 0.5, 0);
  birdGroup.add(body);

  // Breast patch
  const breastGeo = new THREE.TetrahedronGeometry(0.18, 0);
  const breast = new THREE.Mesh(breastGeo, breastMat);
  breast.position.set(0.1, -0.1, 0.2);
  breast.rotation.set(-0.5, 0.3, 0.2);
  birdGroup.add(breast);

  // Left wing
  const wingLGeo = new THREE.ConeGeometry(0.15, 0.5, 4);
  const wingL = new THREE.Mesh(wingLGeo, wingMat);
  wingL.position.set(-0.45, 0.05, -0.1);
  wingL.rotation.set(0.3, 0, -0.8);
  birdGroup.add(wingL);

  // Right wing
  const wingRGeo = new THREE.ConeGeometry(0.15, 0.5, 4);
  const wingR = new THREE.Mesh(wingRGeo, wingMat);
  wingR.position.set(0.45, 0.05, -0.1);
  wingR.rotation.set(0.3, 0, 0.8);
  birdGroup.add(wingR);

  // Head
  const headGeo = new THREE.TetrahedronGeometry(0.12, 0);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0.05, 0.32, 0.1);
  head.rotation.set(0.2, 0.3, -0.1);
  birdGroup.add(head);

  // Tail
  const tailGeo = new THREE.ConeGeometry(0.08, 0.3, 3);
  const tail = new THREE.Mesh(tailGeo, wingMat);
  tail.position.set(-0.05, -0.25, -0.2);
  tail.rotation.set(-0.8, 0.1, 0);
  birdGroup.add(tail);

  // Position bird in hero (upper-right area)
  birdGroup.position.set(2.5, 1.5, 0);
  birdGroup.scale.setScalar(0.8);

  return birdGroup;
}

// ============================================================
// BIRD SECTION BEHAVIOR
// ============================================================
const FOCAL_POINTS = {
  hero:       new THREE.Vector3(2.5,  1.5,  0),
  philosophy: new THREE.Vector3(-2.5, 0.5,  0),
  process:    new THREE.Vector3(0,    0.8,  0),
  portfolio:  new THREE.Vector3(2.0,  1.8,  0),
  contact:    new THREE.Vector3(0,   -1.5,  0),
};

let currentSection = 'hero';
let isFlying = false;

function onBirdSectionChange(bird, sectionId) {
  if (sectionId === currentSection || isFlying) return;
  currentSection = sectionId;

  const target = FOCAL_POINTS[sectionId];
  if (!target) return;

  flyBirdTo(bird, target);
}

function flyBirdTo(bird, targetPos) {
  isFlying = true;
  const startPos = bird.position.clone();
  const duration = 750; // ms
  const startTime = performance.now();

  // Arc midpoint
  const mid = startPos.clone().lerp(targetPos, 0.5);
  mid.y += 1.2; // lift arc

  function animateFlight(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);

    // Smooth ease in-out
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    // Quadratic Bézier: start → mid → target
    const p0 = startPos;
    const p1 = mid;
    const p2 = targetPos;

    bird.position.x = (1 - ease) * (1 - ease) * p0.x + 2 * (1 - ease) * ease * p1.x + ease * ease * p2.x;
    bird.position.y = (1 - ease) * (1 - ease) * p0.y + 2 * (1 - ease) * ease * p1.y + ease * ease * p2.y;
    bird.position.z = (1 - ease) * (1 - ease) * p0.z + 2 * (1 - ease) * ease * p1.z + ease * ease * p2.z;

    // Wing animation: bank during flight
    bird.rotation.z = Math.sin(ease * Math.PI) * 0.4;

    if (t < 1) {
      requestAnimationFrame(animateFlight);
    } else {
      bird.rotation.z = 0;
      isFlying = false;
    }
  }

  requestAnimationFrame(animateFlight);
}

// ============================================================
// TRANSFORMATION — organic → origami (placeholder)
// Real version: GLSL morph shader between two mesh targets
// ============================================================
function beginBirdTransformation(bird) {
  // Trigger mist overlay
  const mist = document.getElementById('mist-overlay');
  if (mist) {
    mist.style.transition = 'opacity 400ms ease';
    mist.style.opacity = '1';
    setTimeout(() => {
      mist.style.transition = 'opacity 500ms ease';
      mist.style.opacity = '0';
    }, 500);
  }

  // Scale up during transformation
  const startScale = bird.scale.x;
  const endScale = 1;
  const dur = 1500;
  const start = performance.now();

  function animateTransform(now) {
    const t = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    bird.scale.setScalar(startScale + (endScale - startScale) * ease);
    if (t < 1) requestAnimationFrame(animateTransform);
  }

  requestAnimationFrame(animateTransform);
}

// ============================================================
// CURSOR → BIRD PROXIMITY REACTION (Desktop)
// ============================================================
export function onCursorNearBird(cursorX, cursorY) {
  if (!window._rinovo?.bird?.mesh) return;

  const bird = window._rinovo.bird.mesh;

  // Project bird screen position
  const birdPos = bird.position.clone().project(camera);
  const screenX = (birdPos.x + 1) / 2 * window.innerWidth;
  const screenY = (1 - birdPos.y) / 2 * window.innerHeight;

  const dist = Math.hypot(cursorX - screenX, cursorY - screenY);

  if (dist < 120) {
    // Bird notices cursor — subtle head tilt
    const intensity = 1 - dist / 120;
    bird.children[4]?.rotation && (bird.children[4].rotation.z = intensity * -0.2);

    // Glow effect on breast
    const breastMesh = bird.children[1];
    if (breastMesh?.material) {
      breastMesh.material.emissiveIntensity = intensity * 0.3;
    }
  } else {
    // Reset
    if (bird.children[4]?.rotation) bird.children[4].rotation.z = 0;
    const breastMesh = bird.children[1];
    if (breastMesh?.material) {
      breastMesh.material.emissiveIntensity = 0.05;
    }
  }

  if (dist < 20) {
    triggerBirdFlutter(bird);
  }
}

let lastFlutterTime = 0;
function triggerBirdFlutter(bird) {
  const now = performance.now();
  if (now - lastFlutterTime < 2000) return; // debounce 2s
  lastFlutterTime = now;

  let flutter = 0;
  const flutterAnim = setInterval(() => {
    flutter += 0.3;
    bird.children[2].rotation.z = -0.8 + Math.sin(flutter * 8) * 0.4;
    bird.children[3].rotation.z =  0.8 + Math.sin(flutter * 8) * 0.4;
    if (flutter > Math.PI) clearInterval(flutterAnim);
  }, 30);
}

// ============================================================
// RENDER LOOP
// ============================================================
function animate() {
  animId = requestAnimationFrame(animate);
  time += 0.016;

  const bird = window._rinovo?.bird?.mesh;
  if (bird && !isFlying) {
    // Gentle idle: hover and breathe
    bird.position.y += Math.sin(time * 0.8) * 0.0015;
    bird.rotation.y += Math.sin(time * 0.3) * 0.001;
    bird.rotation.x = Math.sin(time * 0.5) * 0.03;

    // Camera micro-drift
    camera.position.x = Math.sin(time * 0.2) * 0.08;
    camera.position.y = Math.sin(time * 0.15) * 0.04;
  }

  renderer.render(scene, camera);
}

// ============================================================
// RESIZE
// ============================================================
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
}

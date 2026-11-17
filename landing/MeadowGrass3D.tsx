import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  generateGrassFieldInstances,
  generateWildflowerInstances,
} from './meadowMath';

interface MeadowGrass3DProps {
  paused: boolean;
}

function detectSoftwareWebGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Builds a realistic 6-segment curved, V-creased, tapered grass blade geometry.
 * Each blade has 21 vertices forming a natural mid-rib crease and pointed tip.
 */
function buildRealisticBladeGeometry(segments = 6): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const edges: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments; // 0 (root) -> 1 (tip)
    const halfWidth = 0.5 * Math.pow(1 - t, 0.78);
    // Natural graceful meadow arch along height
    const curveZ = Math.pow(t, 1.95) * 0.19;
    const ribZ = -0.02 * (1 - t);

    positions.push(-halfWidth, t, curveZ);
    uvs.push(0, t);
    edges.push(-1);

    positions.push(0, t, curveZ + ribZ);
    uvs.push(0.5, t);
    edges.push(0);

    positions.push(halfWidth, t, curveZ);
    uvs.push(1, t);
    edges.push(1);
  }

  for (let i = 0; i < segments; i += 1) {
    const row = i * 3;
    const next = (i + 1) * 3;
    indices.push(row, row + 1, next);
    indices.push(row + 1, next + 1, next);
    indices.push(row + 1, row + 2, next + 1);
    indices.push(row + 2, next + 2, next + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(edges, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a delicate 3D daisy wildflower head calibrated to real meadow proportions
 * nestled inside the swaying turf.
 */
function buildDaisyHeadGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const isCenterAttr: number[] = [];
  const indices: number[] = [];

  const petalCount = 10;
  for (let p = 0; p < petalCount; p += 1) {
    const angle = (p / petalCount) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const perpX = -sin;
    const perpZ = cos;

    const baseIdx = positions.length / 3;
    const innerR = 0.009;
    const midR = 0.026;
    const outerR = 0.044;
    const wMid = 0.0085;
    const wTip = 0.003;

    const pts = [
      [cos * innerR, 0.0, sin * innerR],
      [cos * midR - perpX * wMid, 0.004, sin * midR - perpZ * wMid],
      [cos * midR + perpX * wMid, 0.004, sin * midR + perpZ * wMid],
      [cos * outerR - perpX * wTip, 0.001, sin * outerR - perpZ * wTip],
      [cos * outerR + perpX * wTip, 0.001, sin * outerR + perpZ * wTip],
    ];

    for (let k = 0; k < pts.length; k += 1) {
      positions.push(pts[k][0], pts[k][1], pts[k][2]);
      if (k === 0) {
        colors.push(0.72, 0.8, 0.86);
      } else {
        colors.push(0.92, 0.96, 0.99);
      }
      isCenterAttr.push(0);
    }

    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
    indices.push(baseIdx + 2, baseIdx + 3, baseIdx + 4);
  }

  // Soft warm gold stamen center
  const centerIdx = positions.length / 3;
  positions.push(0, 0.007, 0);
  colors.push(0.96, 0.78, 0.36);
  isCenterAttr.push(1);

  const ringSegs = 8;
  const ringR = 0.012;
  for (let s = 0; s < ringSegs; s += 1) {
    const a = (s / ringSegs) * Math.PI * 2;
    positions.push(Math.cos(a) * ringR, 0.0025, Math.sin(a) * ringR);
    colors.push(0.84, 0.62, 0.24);
    isCenterAttr.push(1);
  }
  for (let s = 0; s < ringSegs; s += 1) {
    const next = (s + 1) % ringSegs;
    indices.push(centerIdx, centerIdx + 1 + s, centerIdx + 1 + next);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('aIsCenter', new THREE.Float32BufferAttribute(isCenterAttr, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createMoteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, 'rgba(255, 244, 212, 0.95)');
    grad.addColorStop(0.35, 'rgba(218, 238, 250, 0.5)');
    grad.addColorStop(1, 'rgba(218, 238, 250, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const WIND_GLSL_HELPERS = `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  vec2 computeWindBend(vec2 worldXZ, float time, float stiffness, vec2 pointerXZ) {
    // Rolling meadow breeze sweeping diagonally from upper-right toward lower-left
    vec2 windDir = normalize(vec2(-0.85, 0.52));
    float gustWave = valueNoise(worldXZ * 0.34 - windDir * time * 1.45);
    float secondaryEddy = valueNoise(worldXZ * 0.92 - windDir * time * 2.35 + 7.3);
    float shimmer = sin(time * 3.1 + worldXZ.x * 2.1 + worldXZ.y * 1.5) * 0.5 + 0.5;

    float baseForce = (0.24 + gustWave * 0.68 + secondaryEddy * 0.32 + shimmer * 0.16) / max(0.55, stiffness);

    vec2 perp = vec2(-windDir.y, windDir.x);
    float crossFlutter = (secondaryEddy - 0.5) * 0.36;
    vec2 bend = windDir * baseForce + perp * crossFlutter;

    // Interactive pointer breeze ripple
    vec2 toBlade = worldXZ - pointerXZ;
    float dist = length(toBlade);
    float pushRadius = 1.45;
    if (dist < pushRadius && dist > 0.001) {
      float falloff = smoothstep(pushRadius, 0.0, dist);
      bend += normalize(toBlade) * falloff * 0.85;
    }

    return bend;
  }
`;

export const MeadowGrass3D: React.FC<MeadowGrass3DProps> = ({ paused }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef<boolean>(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const initW = Math.max(320, container.clientWidth);
    const initH = Math.max(320, container.clientHeight);
    renderer.setSize(initW, initH);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Camera horizon calibrated so foreground/midground meadow blends cleanly below astronaut torso (~58% down)
    const camera = new THREE.PerspectiveCamera(42, initW / initH, 0.1, 40);
    camera.position.set(0, 0.25, 4.5);
    camera.lookAt(0, -0.45, -3.5);

    // -------------------------------------------------------------------------
    // 1. Dense Instanced 3D Realistic Grass Turf (7,600 frustum-packed blades)
    // -------------------------------------------------------------------------
    const bladeCount = 7600;
    const blades = generateGrassFieldInstances(bladeCount, 20261117);
    const baseBladeGeo = buildRealisticBladeGeometry(6);
    const instancedBladeGeo = new THREE.InstancedBufferGeometry();
    instancedBladeGeo.index = baseBladeGeo.index;
    instancedBladeGeo.attributes.position = baseBladeGeo.attributes.position;
    instancedBladeGeo.attributes.uv = baseBladeGeo.attributes.uv;
    instancedBladeGeo.attributes.aEdge = baseBladeGeo.attributes.aEdge;
    instancedBladeGeo.instanceCount = bladeCount;

    const offsetArr = new Float32Array(bladeCount * 3);
    const paramArr = new Float32Array(bladeCount * 4);
    const colorSeedArr = new Float32Array(bladeCount * 3);

    for (let i = 0; i < bladeCount; i += 1) {
      const b = blades[i];
      offsetArr[i * 3] = b.x;
      offsetArr[i * 3 + 1] = b.y;
      offsetArr[i * 3 + 2] = b.z;

      paramArr[i * 4] = b.height;
      paramArr[i * 4 + 1] = b.width;
      paramArr[i * 4 + 2] = b.yaw;
      paramArr[i * 4 + 3] = b.stiffness;

      colorSeedArr[i * 3] = b.hueShift;
      colorSeedArr[i * 3 + 1] = b.dryTip;
      colorSeedArr[i * 3 + 2] = b.sunlit;
    }

    instancedBladeGeo.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(offsetArr, 3)
    );
    instancedBladeGeo.setAttribute(
      'aParams',
      new THREE.InstancedBufferAttribute(paramArr, 4)
    );
    instancedBladeGeo.setAttribute(
      'aColorSeed',
      new THREE.InstancedBufferAttribute(colorSeedArr, 3)
    );

    const grassUniforms = {
      uTime: { value: 0 },
      uPointerXZ: { value: new THREE.Vector2(99, 99) },
    };

    const grassMat = new THREE.ShaderMaterial({
      uniforms: grassUniforms,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      vertexShader: `
        attribute float aEdge;
        attribute vec3 aOffset;
        attribute vec4 aParams;
        attribute vec3 aColorSeed;

        uniform float uTime;
        uniform vec2 uPointerXZ;

        varying float vHeight;
        varying float vEdge;
        varying float vWorldZ;
        varying vec3 vColorSeed;
        varying float vBendMag;

        ${WIND_GLSL_HELPERS}

        void main() {
          float hFactor = uv.y;
          vHeight = hFactor;
          vEdge = aEdge;
          vWorldZ = aOffset.z;
          vColorSeed = aColorSeed;

          float bHeight = aParams.x;
          float bWidth = aParams.y;
          float bYaw = aParams.z;
          float bStiff = aParams.w;

          vec3 local = vec3(position.x * bWidth, position.y * bHeight, position.z * bHeight);

          float cy = cos(bYaw);
          float sy = sin(bYaw);
          vec3 rotated = vec3(
            local.x * cy - local.z * sy,
            local.y,
            local.x * sy + local.z * cy
          );

          vec2 wind = computeWindBend(aOffset.xz, uTime, bStiff, uPointerXZ);
          float flutter = sin(uTime * 5.6 + aOffset.x * 3.4 + aOffset.z * 2.9 + bYaw) * 0.08 * pow(hFactor, 2.0);
          vec2 totalBend = wind * pow(hFactor, 1.65) + vec2(flutter, flutter * 0.45);
          vBendMag = length(totalBend);

          float bendAngle = min(1.22, length(totalBend));
          vec2 bendDir = bendAngle > 0.0001 ? normalize(totalBend) : vec2(0.0);

          float arcHoriz = sin(bendAngle) * (hFactor * bHeight) * 0.74;
          float arcDrop = (1.0 - cos(bendAngle)) * (hFactor * bHeight) * 0.56;

          vec3 worldPos = aOffset + rotated;
          worldPos.x += bendDir.x * arcHoriz;
          worldPos.z += bendDir.y * arcHoriz;
          worldPos.y -= arcDrop;

          gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
        }
      `,
      fragmentShader: `
        varying float vHeight;
        varying float vEdge;
        varying float vWorldZ;
        varying vec3 vColorSeed;
        varying float vBendMag;

        void main() {
          // Misty twilight blue-slate & warm sunbeam tip palette tuned to image_612bb5a4.png
          vec3 rootShadow = vec3(0.055, 0.095, 0.128);
          vec3 midSlate = vec3(0.118, 0.195, 0.242);
          vec3 midSage = vec3(0.145, 0.215, 0.212);
          vec3 coolTip = vec3(0.42, 0.56, 0.64);
          vec3 warmSunTip = vec3(0.84, 0.77, 0.62);

          vec3 bodyCol = mix(midSlate, midSage, vColorSeed.x);
          vec3 baseCol = mix(rootShadow, bodyCol, smoothstep(0.0, 0.42, vHeight));

          float sunMask = vColorSeed.z;
          vec3 tipColor = mix(coolTip, warmSunTip, sunMask * 0.56 + vColorSeed.y * 0.26);
          vec3 col = mix(baseCol, tipColor, smoothstep(0.45, 1.0, vHeight));

          // Soft mid-rib depth & backlit translucent rim without hard pixel aliasing
          float midRib = 1.0 - abs(vEdge);
          col += vec3(0.035, 0.055, 0.065) * midRib * vHeight;
          col += vec3(0.16, 0.21, 0.24) * smoothstep(0.55, 0.98, abs(vEdge)) * vHeight * (0.35 + 0.55 * sunMask);

          // Wind-wave specular shimmer when blades lean into god-rays
          col += vec3(0.12, 0.14, 0.14) * clamp(vBendMag * 0.42, 0.0, 0.22) * vHeight;

          // Seamless atmospheric horizon mist fade into photo backdrop
          vec3 mistColor = vec3(0.24, 0.37, 0.47);
          float distFog = smoothstep(-0.6, -6.8, vWorldZ);
          col = mix(col, mistColor, distFog * 0.76);

          // Soft root fade near bottom + horizon alpha fade
          float horizonAlpha = smoothstep(-7.0, -3.2, vWorldZ);
          float rootAlpha = smoothstep(0.0, 0.18, vHeight);
          float alpha = horizonAlpha * (0.68 + 0.32 * rootAlpha);
          if (alpha < 0.03) discard;

          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    const grassMesh = new THREE.Mesh(instancedBladeGeo, grassMat);
    grassMesh.frustumCulled = false;
    scene.add(grassMesh);

    // -------------------------------------------------------------------------
    // 2. Delicate Swaying 3D Daisies (Synchronized with Wind Field)
    // -------------------------------------------------------------------------
    const flowers = generateWildflowerInstances(210, 90421);
    const flowerCount = flowers.length;
    const baseFlowerGeo = buildDaisyHeadGeometry();
    const instancedFlowerGeo = new THREE.InstancedBufferGeometry();
    instancedFlowerGeo.index = baseFlowerGeo.index;
    instancedFlowerGeo.attributes.position = baseFlowerGeo.attributes.position;
    instancedFlowerGeo.attributes.color = baseFlowerGeo.attributes.color;
    instancedFlowerGeo.attributes.aIsCenter = baseFlowerGeo.attributes.aIsCenter;
    instancedFlowerGeo.instanceCount = flowerCount;

    const fOffsetArr = new Float32Array(flowerCount * 3);
    const fParamArr = new Float32Array(flowerCount * 4);

    for (let i = 0; i < flowerCount; i += 1) {
      const f = flowers[i];
      fOffsetArr[i * 3] = f.x;
      fOffsetArr[i * 3 + 1] = f.y;
      fOffsetArr[i * 3 + 2] = f.z;

      fParamArr[i * 4] = f.stemHeight;
      fParamArr[i * 4 + 1] = f.flowerScale;
      fParamArr[i * 4 + 2] = f.yaw;
      fParamArr[i * 4 + 3] = f.phase;
    }

    instancedFlowerGeo.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(fOffsetArr, 3)
    );
    instancedFlowerGeo.setAttribute(
      'aParams',
      new THREE.InstancedBufferAttribute(fParamArr, 4)
    );

    const flowerMat = new THREE.ShaderMaterial({
      uniforms: grassUniforms,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      vertexShader: `
        attribute vec3 color;
        attribute float aIsCenter;
        attribute vec3 aOffset;
        attribute vec4 aParams;

        uniform float uTime;
        uniform vec2 uPointerXZ;

        varying vec3 vColor;
        varying float vWorldZ;
        varying float vIsCenter;

        ${WIND_GLSL_HELPERS}

        void main() {
          vColor = color;
          vWorldZ = aOffset.z;
          vIsCenter = aIsCenter;

          float stemH = aParams.x;
          float fScale = aParams.y;
          float fYaw = aParams.z;
          float fPhase = aParams.w;

          vec2 wind = computeWindBend(aOffset.xz, uTime, 0.85, uPointerXZ);
          float nod = sin(uTime * 3.6 + fPhase) * 0.075;
          vec2 totalBend = wind + vec2(nod, nod * 0.4);

          float bendAngle = min(1.08, length(totalBend));
          vec2 bendDir = bendAngle > 0.0001 ? normalize(totalBend) : vec2(0.0);

          vec3 p = position * fScale;
          float cy = cos(fYaw);
          float sy = sin(fYaw);
          p = vec3(p.x * cy - p.z * sy, p.y, p.x * sy + p.z * cy);

          float tiltFwd = 0.42;
          float cf = cos(tiltFwd);
          float sf = sin(tiltFwd);
          p = vec3(p.x, p.y * cf - p.z * sf, p.y * sf + p.z * cf);

          float cw = cos(bendAngle * 0.72);
          float sw = sin(bendAngle * 0.72);
          p.y = p.y * cw - (p.x * bendDir.x + p.z * bendDir.y) * sw;

          vec3 headOrigin = vec3(
            aOffset.x + bendDir.x * sin(bendAngle) * stemH * 0.74,
            aOffset.y + stemH - (1.0 - cos(bendAngle)) * stemH * 0.56,
            aOffset.z + bendDir.y * sin(bendAngle) * stemH * 0.74
          );

          gl_Position = projectionMatrix * viewMatrix * vec4(headOrigin + p, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vWorldZ;
        varying float vIsCenter;

        void main() {
          vec3 mistColor = vec3(0.32, 0.46, 0.56);
          float distFog = smoothstep(0.4, -6.2, vWorldZ);
          vec3 col = mix(vColor * vec3(0.76, 0.84, 0.90), mistColor, distFog * 0.65);
          if (vIsCenter > 0.5) {
            col = mix(vec3(0.90, 0.72, 0.34), mistColor, distFog * 0.52);
          }
          float alpha = smoothstep(-6.4, -2.4, vWorldZ) * 0.88;
          if (alpha < 0.03) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    const flowerMesh = new THREE.Mesh(instancedFlowerGeo, flowerMat);
    flowerMesh.frustumCulled = false;
    scene.add(flowerMesh);

    // -------------------------------------------------------------------------
    // 3. Drifting Sunlit Pollen & Dew Motes Across Volumetric Light Beams
    // -------------------------------------------------------------------------
    const moteCount = 120;
    const motePos = new Float32Array(moteCount * 3);
    const moteMeta: { vx: number; vy: number; phase: number }[] = [];

    for (let i = 0; i < moteCount; i += 1) {
      motePos[i * 3] = (Math.random() - 0.5) * 7.2;
      motePos[i * 3 + 1] = -1.5 + Math.random() * 2.6;
      motePos[i * 3 + 2] = 2.4 - Math.random() * 7.6;
      moteMeta.push({
        vx: -0.22 - Math.random() * 0.24,
        vy: 0.05 + Math.random() * 0.09,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const moteGeo = new THREE.BufferGeometry();
    const moteAttr = new THREE.BufferAttribute(motePos, 3);
    moteGeo.setAttribute('position', moteAttr);
    const moteTex = createMoteTexture();
    const moteMat = new THREE.PointsMaterial({
      size: 0.055,
      map: moteTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const motePoints = new THREE.Points(moteGeo, moteMat);
    scene.add(motePoints);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // -------------------------------------------------------------------------
    // 4. Interactive Pointer Breeze & Resize Handling
    // -------------------------------------------------------------------------
    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      grassUniforms.uPointerXZ.value.set(nx * 2.8, -ny * 3.5 - 0.6);
    };

    const handlePointerLeave = () => {
      grassUniforms.uPointerXZ.value.set(99, 99);
    };

    const parentEl = container.parentElement;
    parentEl?.addEventListener('pointermove', handlePointerMove, { passive: true });
    parentEl?.addEventListener('pointerleave', handlePointerLeave);

    const handleResize = () => {
      if (disposed || !container) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(320, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // -------------------------------------------------------------------------
    // 5. Render Loop with Software-WebGL GPU-Fence Pacing
    // -------------------------------------------------------------------------
    let frameId = 0;
    let disposed = false;
    let simTime = 0;
    let lastMs = performance.now();

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const glCtx = renderer.getContext() as WebGL2RenderingContext;
      const sync = glCtx.fenceSync ? glCtx.fenceSync(glCtx.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 24);
        return;
      }
      glCtx.flush();
      const poll = () => {
        if (disposed) return;
        const state = glCtx.getSyncParameter(sync, glCtx.SYNC_STATUS);
        if (state === glCtx.UNSIGNALED) {
          frameId = window.setTimeout(poll, 4);
        } else {
          glCtx.deleteSync(sync);
          frameId = window.setTimeout(cb, 24);
        }
      };
      frameId = window.setTimeout(poll, 4);
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.22, (now - lastMs) / 1000);
      lastMs = now;

      if (!pausedRef.current) {
        simTime += dt;
        grassUniforms.uTime.value = simTime;

        camera.position.x = Math.sin(simTime * 0.42) * 0.04;
        camera.position.y = 0.25 + Math.cos(simTime * 0.54) * 0.014;
        camera.lookAt(0, -0.45, -3.5);

        for (let i = 0; i < moteCount; i += 1) {
          const m = moteMeta[i];
          let x = motePos[i * 3] + m.vx * dt;
          let y = motePos[i * 3 + 1] + (m.vy + Math.sin(simTime * 1.4 + m.phase) * 0.04) * dt;
          if (x < -3.6) x = 3.6;
          if (y > 1.4) y = -1.5;
          motePos[i * 3] = x;
          motePos[i * 3 + 1] = y;
        }
        moteAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      parentEl?.removeEventListener('pointermove', handlePointerMove);
      parentEl?.removeEventListener('pointerleave', handlePointerLeave);
      baseBladeGeo.dispose();
      instancedBladeGeo.dispose();
      grassMat.dispose();
      baseFlowerGeo.dispose();
      instancedFlowerGeo.dispose();
      flowerMat.dispose();
      moteGeo.dispose();
      moteTex.dispose();
      moteMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="meadow-grass-3d-canvas"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-[4]"
    />
  );
};

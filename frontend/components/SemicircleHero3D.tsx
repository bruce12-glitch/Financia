import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ArrowUpRight, SlidersHorizontal, X } from 'lucide-react';
import { StockQuote } from '../types/financia';

interface SemicircleHero3DProps {
  stocks: StockQuote[];
  selectedTicker: string;
  onJumpToTerminal: () => void;
  onJumpToSectors: () => void;
}

type CameraPreset = 'dome' | 'horizon' | 'zenith';
type FinishPreset = 'cobalt' | 'ice' | 'midnight';

// Module-scope reusable math objects for zero-GC in render loop
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, -0.15, 0);

/**
 * Crisp transparent binary digit texture ('11' or '01' style vertical ASCII strokes).
 * Zero dark backing rectangle so glyphs float cleanly over obsidian & blue glow.
 */
function createBinaryPairTexture(variant: '11' | '01', maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 96);
    ctx.fillStyle = '#ffffff';

    if (variant === '11') {
      // Left slender '1' with crisp top serif flag
      ctx.fillRect(14, 14, 7, 68);
      ctx.fillRect(8, 18, 8, 6);
      ctx.fillRect(9, 76, 17, 6);

      // Right slender '1'
      ctx.fillRect(42, 14, 7, 68);
      ctx.fillRect(36, 18, 8, 6);
      ctx.fillRect(37, 76, 17, 6);
    } else {
      // Left '0' (crisp open-center slender capsule)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 17, 17, 62);

      // Right '1'
      ctx.fillRect(44, 14, 7, 68);
      ctx.fillRect(38, 18, 8, 6);
      ctx.fillRect(39, 76, 17, 6);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Delicate halftone crest micro-dash texture ('--' / '··') for organic fade-out along dome peaks.
 */
function createCrestDashTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 48);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 20, 14, 7);
    ctx.fillRect(38, 20, 14, 7);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export const SemicircleHero3D: React.FC<SemicircleHero3DProps> = ({
  stocks,
  selectedTicker,
  onJumpToTerminal,
  onJumpToSectors,
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('dome');
  const [finishPreset, setFinishPreset] = useState<FinishPreset>('cobalt');
  const [waveSpeed, setWaveSpeed] = useState<number>(1.0);
  const [controlsOpen, setControlsOpen] = useState<boolean>(false);

  const cameraPresetRef = useRef<CameraPreset>('dome');
  const finishPresetRef = useRef<FinishPreset>('cobalt');
  const waveSpeedRef = useRef<number>(1.0);
  const activeConvictionRef = useRef<number>(94);
  const pointerNdcRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    cameraPresetRef.current = cameraPreset;
  }, [cameraPreset]);

  useEffect(() => {
    finishPresetRef.current = finishPreset;
  }, [finishPreset]);

  useEffect(() => {
    waveSpeedRef.current = waveSpeed;
  }, [waveSpeed]);

  useEffect(() => {
    const activeStock = stocks.find((s) => s.ticker === selectedTicker);
    if (activeStock) {
      activeConvictionRef.current = activeStock.convictionScore;
    }
  }, [selectedTicker, stocks]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 820;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070c, 0.014);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120);
    const isNarrow = width / height < 0.95;
    camera.position.set(0, isNarrow ? 0.35 : 0.45, isNarrow ? 18.8 : 14.8);
    camera.lookAt(0, -0.15, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Subtle Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3-Point Lighting Rig tuned for crisp Black / Blue / White relief
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x05070c, 1.0);
    hemiLight.position.set(0, 15, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
    keyLight.position.set(7, 8, 12);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x2563eb, 2.2);
    rimLight.position.set(-8, 4, 9);
    scene.add(rimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const tex11 = createBinaryPairTexture('11', maxAnisotropy);
    const tex01 = createBinaryPairTexture('01', maxAnisotropy);
    const texDash = createCrestDashTexture(maxAnisotropy);

    // ---------------------------------------------------------------------------
    // Sculpted Semicircular Binary-Matrix Dome (Lower-Half Viewport Framing)
    // Positioned cleanly below the CTA buttons so hero typography has pure dark space.
    // ---------------------------------------------------------------------------
    interface BinaryNodeMeta {
      x: number;
      baseY: number;
      z: number;
      nx: number;
      ny: number;
      ridgeWeight: number;
      baseScale: number;
      phase: number;
      tier: '11' | '01' | 'dash';
    }

    const nodes11: BinaryNodeMeta[] = [];
    const nodes01: BinaryNodeMeta[] = [];
    const nodesDash: BinaryNodeMeta[] = [];

    const cols = 86;
    const rows = 28;
    const domeHalfWidth = 9.1;
    const domeBaseY = -4.85;
    const domeHeight = 4.12; // Crest sits cleanly beneath CTA buttons in lower half

    for (let c = 0; c < cols; c++) {
      const nx = (c / (cols - 1)) * 2 - 1; // -1 to 1
      const semicircleEnvelope = Math.sqrt(Math.max(0, 1 - nx * nx));
      if (semicircleEnvelope <= 0.06) continue;

      // Quantized architectural terrace stepping along semicircular outer rim
      const quantizedEnvelope = Math.floor(semicircleEnvelope * 24) / 24;
      const activeRows = Math.max(2, Math.floor(rows * quantizedEnvelope));

      for (let r = 0; r < activeRows; r++) {
        const ny = r / rows; // 0 (bottom) to ~1 (crest)
        // Sculpt cohesive organic dune folds & subtle valleys matching reference ASCII semicircle
        const primaryFold = Math.sin(nx * 4.6 - ny * 5.0 + 0.4) * 0.5 + 0.5;
        const secondaryFold = Math.cos(nx * 7.2 + ny * 3.4) * 0.5 + 0.5;
        const ridgeWeight = primaryFold * 0.65 + secondaryFold * 0.35;

        // Subtle organic shadow pockets only (keeps cohesive semicircular silhouette intact)
        if (ridgeWeight < 0.14 && ny < 0.62) continue;

        const x = nx * domeHalfWidth;
        const baseY = domeBaseY + r * (domeHeight / rows);
        const z = 1.25 * Math.cos(nx * Math.PI * 0.48) - ny * 0.9 + (ridgeWeight - 0.5) * 0.32;

        const isCrestEdge = r >= activeRows - 2 || ridgeWeight < 0.24;
        const tier: '11' | '01' | 'dash' = isCrestEdge
          ? 'dash'
          : (c + r) % 2 === 0
            ? '11'
            : '01';

        const meta: BinaryNodeMeta = {
          x,
          baseY,
          z,
          nx,
          ny,
          ridgeWeight,
          baseScale: isCrestEdge ? 0.84 : 0.9 + ridgeWeight * 0.25,
          phase: c * 0.21 + r * 0.33,
          tier,
        };

        if (tier === '11') nodes11.push(meta);
        else if (tier === '01') nodes01.push(meta);
        else nodesDash.push(meta);
      }
    }

    const createLayerMesh = (
      list: BinaryNodeMeta[],
      geo: THREE.PlaneGeometry,
      tex: THREE.CanvasTexture,
      emissiveHex: number,
      emissiveIntensity: number,
      baseOpacity: number
    ) => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: tex,
        transparent: true,
        alphaTest: 0.08,
        opacity: baseOpacity,
        depthWrite: false,
      });
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      mesh.frustumCulled = false;

      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        _dummy.position.set(m.x, m.baseY, m.z);
        _dummy.rotation.set(0, -m.nx * 0.22, 0);
        _dummy.scale.setScalar(m.baseScale);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);

        // Crisp Black, Blue, White luminance shading: bright sunlit white crests & blue terraced folds
        const lightBias = m.nx * 0.22 + m.ridgeWeight * 0.58 + m.ny * 0.24;
        if (lightBias > 0.54) {
          _color.setHex(0xffffff); // Pure bright white ridge highlights
        } else if (lightBias > 0.38) {
          _color.setHex(0xbfdbfe); // Pale ice blue shoulder
        } else if (lightBias > 0.24) {
          _color.setHex(0x3b82f6); // Electric cobalt blue fold
        } else {
          _color.setHex(emissiveHex); // Deep navy-cobalt shadow pocket
        }
        mesh.setColorAt(i, _color);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
      return { mesh, mat, geo, list, emissiveIntensity };
    };

    const digitGeo = new THREE.PlaneGeometry(0.115, 0.165);
    const dashGeo = new THREE.PlaneGeometry(0.105, 0.075);

    const layer11 = createLayerMesh(nodes11, digitGeo, tex11, 0x1d4ed8, 1.0, 0.94);
    const layer01 = createLayerMesh(nodes01, digitGeo, tex01, 0x1d4ed8, 1.0, 0.88);
    const layerDash = createLayerMesh(nodesDash, dashGeo, texDash, 0x2563eb, 0.8, 0.58);

    // Subtle Vertical Light Streaks Rising Gracefully Above the Dome
    const streakCount = 22;
    const streakGeo = new THREE.PlaneGeometry(0.015, 2.4);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    const streakMesh = new THREE.InstancedMesh(streakGeo, streakMat, streakCount);
    const streakMetas: Array<{ x: number; baseY: number; z: number; scaleY: number; speed: number }> = [];

    for (let i = 0; i < streakCount; i++) {
      const nx = (i / (streakCount - 1)) * 2 - 1;
      const archY = domeBaseY + Math.sqrt(Math.max(0, 1 - nx * nx)) * domeHeight;
      const meta = {
        x: nx * 8.6,
        baseY: archY + 1.05 + (i % 3) * 0.55,
        z: 0.25 - Math.abs(nx) * 0.7,
        scaleY: 0.55 + (i % 4) * 0.25,
        speed: 0.55 + (i % 5) * 0.2,
      };
      streakMetas.push(meta);
      _dummy.position.set(meta.x, meta.baseY, meta.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, meta.scaleY, 1);
      _dummy.updateMatrix();
      streakMesh.setMatrixAt(i, _dummy.matrix);
    }
    streakMesh.instanceMatrix.needsUpdate = true;
    streakMesh.computeBoundingSphere();
    scene.add(streakMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        pointerNdcRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdcRef.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      }
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 820;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Paced Render Loop using performance.now() (zero deprecation warnings) + Software-WebGL Guard
    const startTimeMs = performance.now();
    let prevTimeMs = startTimeMs;
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const glCtx = renderer.getContext() as WebGL2RenderingContext;
      const sync = glCtx.fenceSync ? glCtx.fenceSync(glCtx.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      glCtx.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && glCtx.getSyncParameter(sync, glCtx.SYNC_STATUS);
        if (sync && state === glCtx.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) glCtx.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const animateLayer = (
      layer: ReturnType<typeof createLayerMesh>,
      elapsed: number,
      speed: number,
      convictionBoost: number
    ) => {
      const { mesh, list } = layer;
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        const wave =
          Math.sin(elapsed * 1.65 * speed - m.nx * 3.0 - m.ny * 3.8 + m.phase * 0.25) * 0.11;
        const pulseScale = Math.max(
          0.55,
          m.baseScale * (1 + wave * (0.45 + convictionBoost * 0.2))
        );
        _dummy.position.set(m.x, m.baseY + wave * 0.035, m.z + wave * 0.18);
        _dummy.rotation.set(0, -m.nx * 0.22, 0);
        _dummy.scale.setScalar(pulseScale);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const dt = Math.min((nowMs - prevTimeMs) / 1000, 0.1);
      prevTimeMs = nowMs;
      const elapsed = (nowMs - startTimeMs) / 1000;
      const speed = waveSpeedRef.current;
      const convictionBoost = (activeConvictionRef.current - 70) / 30;

      // Update finish preset colors smoothly
      const finish = finishPresetRef.current;
      if (finish === 'cobalt') {
        layer11.mat.color.setHex(0xffffff);
        layer01.mat.color.setHex(0xe0f2fe);
        layerDash.mat.color.setHex(0x60a5fa);
        streakMat.color.setHex(0x93c5fd);
      } else if (finish === 'ice') {
        layer11.mat.color.setHex(0xffffff);
        layer01.mat.color.setHex(0xffffff);
        layerDash.mat.color.setHex(0xdbeafe);
        streakMat.color.setHex(0xffffff);
      } else {
        layer11.mat.color.setHex(0x93c5fd);
        layer01.mat.color.setHex(0x3b82f6);
        layerDash.mat.color.setHex(0x1d4ed8);
        streakMat.color.setHex(0x3b82f6);
      }

      // Exponentially damp camera toward active preset + responsive narrow viewport adjustment
      const aspect = camera.aspect || 1.6;
      const narrowOffset = aspect < 0.95 ? 4.4 : 0;
      const preset = cameraPresetRef.current;
      const px = pointerNdcRef.current.x * 0.55;
      const py = pointerNdcRef.current.y * 0.25;

      if (preset === 'dome') {
        _targetCamPos.set(px, 0.45 + py, 14.8 + narrowOffset);
        _targetLookAt.set(0, -0.15, 0);
      } else if (preset === 'horizon') {
        _targetCamPos.set(px * 0.85, -1.6 + py * 0.25, 11.4 + narrowOffset * 0.85);
        _targetLookAt.set(0, -2.5, 0.4);
      } else {
        _targetCamPos.set(px * 0.45, 5.2, 11.8 + narrowOffset * 0.8);
        _targetLookAt.set(0, -2.6, 0.2);
      }

      const dampFactor = 1 - Math.exp(-4.5 * dt);
      camera.position.lerp(_targetCamPos, dampFactor);
      _currentLookAt.lerp(_targetLookAt, dampFactor);
      camera.lookAt(_currentLookAt);

      animateLayer(layer11, elapsed, speed, convictionBoost);
      animateLayer(layer01, elapsed, speed, convictionBoost);
      animateLayer(layerDash, elapsed, speed, convictionBoost);

      for (let i = 0; i < streakCount; i++) {
        const s = streakMetas[i];
        const drift = Math.sin(elapsed * 0.85 * speed * s.speed + i) * 0.24;
        _dummy.position.set(s.x, s.baseY + drift, s.z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1, s.scaleY, 1);
        _dummy.updateMatrix();
        streakMesh.setMatrixAt(i, _dummy.matrix);
      }
      streakMesh.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      digitGeo.dispose();
      dashGeo.dispose();
      layer11.mat.dispose();
      layer01.mat.dispose();
      layerDash.mat.dispose();
      streakGeo.dispose();
      streakMat.dispose();
      tex11.dispose();
      tex01.dispose();
      texDash.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section
      aria-label="Financia 3D Semicircular Stock Intelligence Hero"
      className="relative w-full min-h-[760px] lg:min-h-[820px] bg-[#05070C] overflow-hidden flex flex-col justify-between pt-8 pb-20"
    >
      {/* Atmospheric Black & Blue Radial Halos Framing Left & Right Dome Shoulders */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 12% 68%, rgba(37, 99, 235, 0.28) 0%, transparent 40%), radial-gradient(circle at 88% 48%, rgba(59, 130, 246, 0.24) 0%, transparent 44%), radial-gradient(circle at 50% 88%, rgba(29, 78, 216, 0.22) 0%, transparent 50%)',
        }}
      />

      {/* Delicate Vertical Architectural Hairline Framing Columns */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2] max-w-[1160px] mx-auto flex justify-between px-12"
      >
        <div className="w-px h-[42%] mt-10 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
        <div className="w-px h-[34%] mt-16 bg-gradient-to-b from-transparent via-[#60A5FA]/15 to-transparent hidden sm:block" />
        <div className="w-px h-[42%] mt-10 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
      </div>

      {/* Three.js Semicircular Binary-Matrix Dome Canvas */}
      <div
        ref={canvasMountRef}
        data-testid="hero-threejs-canvas"
        data-camera-preset={cameraPreset}
        data-finish-preset={finishPreset}
        className="absolute inset-0 z-[1] w-full h-full"
      />

      {/* Clean Centered Hero Copy & CTAs Positioned Strictly Above the Semicircular Dome Crest */}
      <div className="relative z-10 max-w-4xl mx-auto w-full px-6 pt-3 md:pt-6 flex flex-col items-center text-center pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0D1628]/90 border border-white/12 text-xs font-medium text-[#E2E8F0] mb-5">
          <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
            <span className="w-0.5 h-1.5 bg-[#60A5FA]" />
            <span className="w-0.5 h-3 bg-white" />
            <span className="w-0.5 h-2 bg-[#3B82F6]" />
          </span>
          <span>Daily Stock Intelligence</span>
        </div>

        <h1
          className="font-display font-semibold text-white tracking-tight mb-4"
          style={{
            fontSize: 'clamp(2.2rem, 4.35vw, 3.85rem)',
            lineHeight: 1.08,
          }}
        >
          Your Gateway to Global
          <br className="hidden sm:inline" /> Stock Intelligence
        </h1>

        <p className="text-[#94A3B8] text-sm md:text-base leading-relaxed max-w-md mb-7 font-normal">
          Analyze Stocks, Indices, SEC Filings, and Market Flow — with institutional-grade tools, live charts, and zero trading noise.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={onJumpToTerminal}
            className="px-6 py-2.5 rounded-full bg-white text-[#05070C] font-semibold text-xs md:text-sm hover:bg-[#DBEAFE] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
          >
            Analyze Stocks
          </button>
          <button
            type="button"
            onClick={onJumpToSectors}
            className="px-6 py-2.5 rounded-full bg-[#0E192E]/90 text-white border border-[#3B82F6]/35 font-medium text-xs md:text-sm hover:bg-[#162544] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Explore Markets</span>
            <ArrowUpRight className="w-4 h-4 text-[#60A5FA]" />
          </button>
        </div>
      </div>

      {/* Discreet Bottom-Left 3D Dome View Switcher (Tucked Cleanly at Base Corner) */}
      <div className="relative z-20 w-full max-w-[1240px] mx-auto px-6 mt-auto pt-56 pointer-events-none flex items-end justify-start">
        <div className="pointer-events-auto">
          {!controlsOpen ? (
            <button
              type="button"
              onClick={() => setControlsOpen(true)}
              aria-label="Open 3D Dome View Controls"
              className="px-3 py-1.5 rounded-lg bg-[#090E1A]/90 border border-white/12 text-[11px] font-mono text-[#94A3B8] hover:text-white hover:border-[#3B82F6]/50 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3 text-[#60A5FA]" />
              <span>3D Dome View</span>
            </button>
          ) : (
            <div className="rounded-xl bg-[#090F1D]/95 border border-white/15 px-4 py-2.5 flex flex-wrap items-center gap-4 shadow-2xl">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#94A3B8] mr-1">View:</span>
                {(['dome', 'horizon', 'zenith'] as CameraPreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCameraPreset(preset)}
                    className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      cameraPreset === preset
                        ? 'bg-[#2563EB] text-white font-semibold'
                        : 'text-[#CBD5E1] hover:bg-white/5'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#94A3B8] mr-1">Finish:</span>
                {(['cobalt', 'ice', 'midnight'] as FinishPreset[]).map((finish) => (
                  <button
                    key={finish}
                    type="button"
                    onClick={() => setFinishPreset(finish)}
                    className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      finishPreset === finish
                        ? 'bg-white text-[#05070C] font-semibold'
                        : 'text-[#CBD5E1] hover:bg-white/5'
                    }`}
                  >
                    {finish}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="dome-wave-speed" className="text-[11px] text-[#94A3B8]">
                  Wave:
                </label>
                <input
                  id="dome-wave-speed"
                  type="range"
                  min={0.2}
                  max={2.2}
                  step={0.2}
                  value={waveSpeed}
                  onChange={(e) => setWaveSpeed(parseFloat(e.target.value))}
                  className="w-20 accent-[#3B82F6] cursor-pointer"
                />
                <span className="text-[11px] font-mono tabular-nums text-[#E2E8F0] w-8">
                  {waveSpeed.toFixed(1)}x
                </span>
              </div>

              <button
                type="button"
                onClick={() => setControlsOpen(false)}
                aria-label="Close 3D Dome View Controls"
                className="p-1 text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Signature 3-Step Architectural Bottom Transition Matching Reference Image */}
      <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className="w-full flex items-end">
          <div className="w-[24%] h-4 bg-[#080D18] border-t border-white/[0.1]" />
          <div className="w-[18%] h-10 bg-[#080D18] rounded-tl-xl border-t border-l border-white/[0.12]" />
          <div className="w-[58%] h-16 bg-[#080D18] rounded-tl-2xl border-t border-l border-white/[0.12]" />
        </div>
      </div>
    </section>
  );
};

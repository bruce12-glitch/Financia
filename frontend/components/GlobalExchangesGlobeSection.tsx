import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { feature } from 'topojson-client';
import worldLandAtlas from 'world-atlas/land-110m.json';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Clock,
  GitCompare,
  Globe2,
  Layers,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  computeFocusCameraPosition,
  ExchangeRegion,
  GLOBAL_STOCK_EXCHANGES,
  latLngToCartesian,
  sampleFibonacciLandDots,
  StockExchangeNode,
} from '../utils/globalExchanges';
import {
  ExchangeSessionStatus,
  getExchangeProfile,
  summarizeGlobalExchangeSessions,
} from '../utils/exchangeSessionEngine';
import {
  fetchGlobalExchangeDossier,
  GlobalBenchmarkDossier,
} from '../services/financiaApiClient';

interface GlobalExchangesGlobeSectionProps {
  onJumpToAnalysis?: (ticker: string) => void;
  onCompareExchangeBenchmarks?: (primary: string, peers: string[]) => void;
}

const REGIONS: ('All' | ExchangeRegion)[] = [
  'All',
  'Americas',
  'Europe',
  'Asia-Pacific',
  'MEA',
];

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 0, 1);
const _quat = new THREE.Quaternion();

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

function createRadialDotTexture(): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.58, 'rgba(225, 232, 245, 0.92)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStarSpriteTexture(): THREE.CanvasTexture {
  const size = 32;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(210, 225, 255, 0.7)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const TIMELINE_HUB_IDS = [
  'nyse',
  'nasdaq',
  'lse',
  'fwb',
  'nse',
  'bse',
  'hkex',
  'sgx',
  'tse',
  'asx',
];

function getStatusBadgeStyle(status: ExchangeSessionStatus): {
  bg: string;
  text: string;
  dot: string;
} {
  if (status === 'OPEN') {
    return {
      bg: 'bg-[#064e3b]/80 border-[#10b981]/50',
      text: 'text-[#34d399]',
      dot: 'bg-[#10b981]',
    };
  }
  if (status === 'PRE_MARKET' || status === 'AFTER_HOURS') {
    return {
      bg: 'bg-[#78350f]/60 border-[#f59e0b]/45',
      text: 'text-[#fbbf24]',
      dot: 'bg-[#f59e0b]',
    };
  }
  return {
    bg: 'bg-[#1e293b]/80 border-[#334155]',
    text: 'text-[#94a3b8]',
    dot: 'bg-[#64748b]',
  };
}

export const GlobalExchangesGlobeSection: React.FC<GlobalExchangesGlobeSectionProps> = ({
  onJumpToAnalysis,
  onCompareExchangeBenchmarks,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelElsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusCardRef = useRef<HTMLDivElement | null>(null);

  const [selectedId, setSelectedId] = useState<string>('nyse');
  const [regionFilter, setRegionFilter] = useState<'All' | ExchangeRegion>('All');
  const [exchangeSearch, setExchangeSearch] = useState<string>('');
  const [openOnlyFilter, setOpenOnlyFilter] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);
  const [clockTick, setClockTick] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setClockTick(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const globalSessions = useMemo(
    () => summarizeGlobalExchangeSessions(GLOBAL_STOCK_EXCHANGES, clockTick),
    [clockTick]
  );

  const activeExchange = useMemo(
    () =>
      GLOBAL_STOCK_EXCHANGES.find((ex) => ex.id === selectedId) ||
      GLOBAL_STOCK_EXCHANGES[0],
    [selectedId]
  );

  const activeProfile = useMemo(() => getExchangeProfile(activeExchange.id), [activeExchange.id]);
  const activeSession = globalSessions.sessionsById[activeExchange.id];
  const [liveExchangeDossier, setLiveExchangeDossier] = useState<GlobalBenchmarkDossier | null>(null);

  useEffect(() => {
    let cancelled = false;
    const targetTicker = activeExchange.sampleTicker || activeProfile.featuredSymbols[0];
    if (!targetTicker) {
      setLiveExchangeDossier(null);
      return;
    }
    fetchGlobalExchangeDossier(targetTicker)
      .then((dossier) => {
        if (!cancelled) setLiveExchangeDossier(dossier);
      })
      .catch(() => {
        if (!cancelled) setLiveExchangeDossier(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeExchange.id, activeExchange.sampleTicker, activeProfile.featuredSymbols]);

  const utcNowHour = useMemo(
    () => clockTick.getUTCHours() + clockTick.getUTCMinutes() / 60,
    [clockTick]
  );
  const utcClockLabel = useMemo(
    () =>
      `${String(clockTick.getUTCHours()).padStart(2, '0')}:${String(
        clockTick.getUTCMinutes()
      ).padStart(2, '0')} UTC`,
    [clockTick]
  );

  const filteredExchanges = useMemo(() => {
    const q = exchangeSearch.trim().toLowerCase();
    return GLOBAL_STOCK_EXCHANGES.filter((ex) => {
      if (regionFilter !== 'All' && ex.region !== regionFilter) return false;
      if (openOnlyFilter && globalSessions.sessionsById[ex.id]?.status !== 'OPEN') return false;
      if (!q) return true;
      const prof = getExchangeProfile(ex.id);
      const hay = `${ex.name} ${ex.code} ${ex.country} ${ex.benchmark} ${ex.instruments} ${prof.featuredSymbols.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [regionFilter, exchangeSearch, openOnlyFilter, globalSessions]);

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const focusTriggerRef = useRef<(ex: StockExchangeNode) => void>(() => {});
  const resetViewRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    const getOptimalCameraDistance = (w: number, h: number) =>
      w / Math.max(1, h) < 0.85 ? 4.15 : 3.22;

    const initW = Math.max(320, container.clientWidth);
    const initH = Math.max(420, container.clientHeight);
    renderer.setSize(initW, initH);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(40, initW / initH, 0.1, 100);
    const startNode =
      GLOBAL_STOCK_EXCHANGES.find((ex) => ex.id === selectedIdRef.current) ||
      GLOBAL_STOCK_EXCHANGES[1] ||
      GLOBAL_STOCK_EXCHANGES[0];
    const startCam = computeFocusCameraPosition(
      startNode.lat + 4,
      startNode.lng + 2,
      getOptimalCameraDistance(initW, initH)
    );
    camera.position.set(startCam.x, startCam.y, startCam.z);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 1.95;
    controls.maxDistance = 5.2;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.7;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;

    // Track procedural resources for strict disposal on unmount
    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];
    const texturesToDispose: THREE.Texture[] = [];

    // 1. Deep Cosmic Starfield
    const starCount = 460;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const r = 9 + Math.random() * 14;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starTex = createStarSpriteTexture();
    const starMat = new THREE.PointsMaterial({
      size: 0.14,
      map: starTex,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(starGeo, starMat));
    geometriesToDispose.push(starGeo);
    materialsToDispose.push(starMat);
    texturesToDispose.push(starTex);

    // 2. Globe Root Group (Rotates smoothly when Auto-Spin is enabled)
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Dark obsidian inner sphere occluding rear-hemisphere land dots
    const coreGeo = new THREE.SphereGeometry(0.996, 48, 48);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x02040a,
    });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreSphere);
    geometriesToDispose.push(coreGeo);
    materialsToDispose.push(coreMat);

    // Subtle longitude/latitude graticule lines for 3D depth perception
    const graticulePoints: THREE.Vector3[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lng = -180; lng < 180; lng += 6) {
        const p1 = latLngToCartesian(lat, lng, 0.999);
        const p2 = latLngToCartesian(lat, lng + 6, 0.999);
        graticulePoints.push(new THREE.Vector3(p1.x, p1.y, p1.z), new THREE.Vector3(p2.x, p2.y, p2.z));
      }
    }
    for (let lng = -180; lng < 180; lng += 30) {
      for (let lat = -84; lat < 84; lat += 6) {
        const p1 = latLngToCartesian(lat, lng, 0.999);
        const p2 = latLngToCartesian(lat + 6, lng, 0.999);
        graticulePoints.push(new THREE.Vector3(p1.x, p1.y, p1.z), new THREE.Vector3(p2.x, p2.y, p2.z));
      }
    }
    const gratGeo = new THREE.BufferGeometry().setFromPoints(graticulePoints);
    const gratMat = new THREE.LineBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.25,
    });
    globeGroup.add(new THREE.LineSegments(gratGeo, gratMat));
    geometriesToDispose.push(gratGeo);
    materialsToDispose.push(gratMat);

    // 3. Real World Continents via Fibonacci Dot Lattice + world-atlas land-110m
    const topo = worldLandAtlas as unknown as Parameters<typeof feature>[0] & {
      objects: { land: Parameters<typeof feature>[1] };
    };
    const landGeo = feature(topo, topo.objects.land);
    const landPositions = sampleFibonacciLandDots(
      landGeo as unknown as Parameters<typeof sampleFibonacciLandDots>[0],
      14200,
      1.004
    );
    const landGeoBuf = new THREE.BufferGeometry();
    landGeoBuf.setAttribute('position', new THREE.BufferAttribute(landPositions, 3));
    const dotTex = createRadialDotTexture();
    const landMat = new THREE.PointsMaterial({
      size: 0.024,
      map: dotTex,
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.94,
      alphaTest: 0.08,
      sizeAttenuation: true,
    });
    const landPoints = new THREE.Points(landGeoBuf, landMat);
    globeGroup.add(landPoints);
    geometriesToDispose.push(landGeoBuf);
    materialsToDispose.push(landMat);
    texturesToDispose.push(dotTex);

    // 4. Subtle Crisp Slate-Blue Sphere Rim Definition (No Violet Outer Radiation Halo)
    const innerAtmoGeo = new THREE.SphereGeometry(1.006, 48, 48);
    const innerAtmoMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormalView;
        varying vec3 vPosView;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vPosView = mvPos.xyz;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormalView;
        varying vec3 vPosView;
        void main() {
          vec3 viewDir = normalize(-vPosView);
          float fresnel = pow(1.0 - max(0.0, dot(vNormalView, viewDir)), 5.0);
          vec3 coolSteelBlue = vec3(0.20, 0.46, 0.80);
          gl_FragColor = vec4(coolSteelBlue, fresnel * 0.28);
        }
      `,
    });
    scene.add(new THREE.Mesh(innerAtmoGeo, innerAtmoMat));
    geometriesToDispose.push(innerAtmoGeo);
    materialsToDispose.push(innerAtmoMat);

    // 5. Stock Exchange Beacon Nodes & Concentric Halo Ring on Globe Surface
    const pinCoreGeo = new THREE.SphereGeometry(0.017, 14, 14);
    const pinHitGeo = new THREE.SphereGeometry(0.055, 10, 10);
    const activeHaloGeo = new THREE.CircleGeometry(0.068, 32);
    const activeMidGeo = new THREE.CircleGeometry(0.04, 28);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const defaultPinMat = new THREE.MeshBasicMaterial({ color: 0x2962ff });
    const activePinMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    const activeHaloMat = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const activeMidMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    geometriesToDispose.push(pinCoreGeo, pinHitGeo, activeHaloGeo, activeMidGeo);
    materialsToDispose.push(hitMat, defaultPinMat, activePinMat, activeHaloMat, activeMidMat);

    const activeBeaconHaloGroup = new THREE.Group();
    const haloOuterMesh = new THREE.Mesh(activeHaloGeo, activeHaloMat);
    const haloMidMesh = new THREE.Mesh(activeMidGeo, activeMidMat);
    haloMidMesh.position.z = 0.001;
    activeBeaconHaloGroup.add(haloOuterMesh, haloMidMesh);
    globeGroup.add(activeBeaconHaloGroup);

    const clickables: THREE.Object3D[] = [];
    const pinCoreMeshes = new Map<string, THREE.Mesh>();
    const exchangeLocalPositions = new Map<string, THREE.Vector3>();

    for (const ex of GLOBAL_STOCK_EXCHANGES) {
      const p = latLngToCartesian(ex.lat, ex.lng, 1.014);
      const localPos = new THREE.Vector3(p.x, p.y, p.z);
      exchangeLocalPositions.set(ex.id, localPos);

      const coreMesh = new THREE.Mesh(
        pinCoreGeo,
        ex.id === selectedIdRef.current ? activePinMat : defaultPinMat
      );
      coreMesh.position.copy(localPos);
      globeGroup.add(coreMesh);
      pinCoreMeshes.set(ex.id, coreMesh);

      const hitProxy = new THREE.Mesh(pinHitGeo, hitMat);
      hitProxy.position.copy(localPos);
      hitProxy.userData.exchangeId = ex.id;
      globeGroup.add(hitProxy);
      clickables.push(hitProxy);
    }

    const alignHaloToExchange = (exId: string) => {
      const localPos = exchangeLocalPositions.get(exId);
      if (!localPos) return;
      activeBeaconHaloGroup.position.copy(localPos);
      _vecA.copy(localPos).normalize();
      _quat.setFromUnitVectors(_upAxis, _vecA);
      activeBeaconHaloGroup.quaternion.copy(_quat);

      for (const [id, mesh] of pinCoreMeshes.entries()) {
        mesh.material = id === exId ? activePinMat : defaultPinMat;
        mesh.scale.setScalar(id === exId ? 1.4 : 1);
      }
    };
    alignHaloToExchange(selectedIdRef.current);

    // 6. Camera Smooth Focus & Reset Controls
    let animatingCameraFocus = false;
    let frameId = 0;
    let isDisposed = false;
    let userDragging = false;
    let lastFrameTime = performance.now();

    const triggerFocus = (ex: StockExchangeNode, overrideDistance?: number) => {
      alignHaloToExchange(ex.id);
      const w = container.clientWidth || initW;
      const h = container.clientHeight || initH;
      const fallbackDist = getOptimalCameraDistance(w, h);
      const targetLocal = latLngToCartesian(
        Math.max(-68, Math.min(68, ex.lat + 3)),
        ex.lng,
        overrideDistance ?? (camera.position.length() || fallbackDist)
      );
      _camGoal.set(targetLocal.x, targetLocal.y, targetLocal.z);
      // Transform local target into current globe world rotation
      _camGoal.applyEuler(globeGroup.rotation);
      animatingCameraFocus = true;
    };

    focusTriggerRef.current = triggerFocus;
    resetViewRef.current = () => {
      globeGroup.rotation.y = 0;
      const w = container.clientWidth || initW;
      const h = container.clientHeight || initH;
      const ex =
        GLOBAL_STOCK_EXCHANGES.find((item) => item.id === selectedIdRef.current) ||
        GLOBAL_STOCK_EXCHANGES[0];
      triggerFocus(ex, getOptimalCameraDistance(w, h));
    };

    // Stop scripted camera motion immediately if user drags manually
    const onControlStart = () => {
      userDragging = true;
      animatingCameraFocus = false;
    };
    const onControlEnd = () => {
      userDragging = false;
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    // Raycast Click Selection directly on 3D Exchange Beacons
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length > 0) {
        const exId = hits[0].object.userData.exchangeId as string | undefined;
        if (exId) {
          const found = GLOBAL_STOCK_EXCHANGES.find((item) => item.id === exId);
          if (found) {
            setSelectedId(found.id);
            triggerFocus(found);
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Project 3D Stock Exchange Coordinates onto DOM overlay refs with zero React GC churn
    const placedScreenLabels: { x: number; y: number }[] = [];
    const hideLabel = (el: HTMLButtonElement) => {
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
      el.tabIndex = -1;
    };

    const updateProjectedOverlays = () => {
      const width = renderer.domElement.clientWidth || initW;
      const height = renderer.domElement.clientHeight || initH;
      _camDir.copy(camera.position).normalize();
      placedScreenLabels.length = 0;

      // Update focused selected exchange detail card right above active beacon
      const activeId = selectedIdRef.current;
      const activeLocal = exchangeLocalPositions.get(activeId);
      const cardEl = focusCardRef.current;
      let cardBox = { minX: -999, maxX: -999, minY: -999, maxY: -999 };

      if (cardEl && activeLocal) {
        _vecA.copy(activeLocal).applyMatrix4(globeGroup.matrixWorld);
        _vecB.copy(_vecA).normalize();
        const facing = _vecB.dot(_camDir);
        _vecA.project(camera);

        if (facing > 0.05) {
          const sx = ((_vecA.x + 1) * 0.5) * width;
          const sy = ((-_vecA.y + 1) * 0.5) * height;
          const clampedX = Math.max(152, Math.min(width - 152, sx));
          const clampedY = Math.max(216, Math.min(height - 104, sy - 22));
          cardEl.style.opacity = '1';
          cardEl.style.pointerEvents = 'auto';
          cardEl.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) translate(-50%, -100%)`;
          cardBox = {
            minX: clampedX - 156,
            maxX: clampedX + 156,
            minY: clampedY - 228,
            maxY: clampedY + 14,
          };
        } else {
          // Keep card gracefully pinned top-center when user spins to back side of Earth
          const cx = width * 0.5;
          const cy = Math.min(220, height * 0.34);
          cardEl.style.opacity = '0.96';
          cardEl.style.pointerEvents = 'auto';
          cardEl.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
          cardBox = {
            minX: cx - 156,
            maxX: cx + 156,
            minY: cy - 115,
            maxY: cy + 115,
          };
        }
      }

      // Project visible stock exchange names across front hemisphere without overlap
      for (const ex of GLOBAL_STOCK_EXCHANGES) {
        const el = labelElsRef.current[ex.id];
        if (!el) continue;
        if (ex.id === activeId) {
          hideLabel(el);
          continue;
        }
        const localPos = exchangeLocalPositions.get(ex.id);
        if (!localPos) continue;
        _vecA.copy(localPos).applyMatrix4(globeGroup.matrixWorld);
        _vecB.copy(_vecA).normalize();
        const facing = _vecB.dot(_camDir);

        // Keep labels strictly inside clean front-continent face away from glowing limb
        if (facing < 0.56) {
          hideLabel(el);
          continue;
        }

        _vecA.project(camera);
        const sx = ((_vecA.x + 1) * 0.5) * width;
        const sy = ((-_vecA.y + 1) * 0.5) * height;

        if (sx < 95 || sx > width - 95 || sy < 86 || sy > height - 120) {
          hideLabel(el);
          continue;
        }

        // Prevent floating exchange labels from touching active card box
        if (
          sx >= cardBox.minX - 75 &&
          sx <= cardBox.maxX + 75 &&
          sy - 14 >= cardBox.minY - 22 &&
          sy - 14 <= cardBox.maxY + 26
        ) {
          hideLabel(el);
          continue;
        }

        // Prevent floating exchange labels from piling on top of each other
        let overlaps = false;
        for (const p of placedScreenLabels) {
          if (Math.abs(p.x - sx) < 150 && Math.abs(p.y - sy) < 38) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) {
          hideLabel(el);
          continue;
        }

        placedScreenLabels.push({ x: sx, y: sy });
        el.style.visibility = 'visible';
        el.style.opacity = String(Math.max(0.84, Math.min(1, (facing - 0.54) * 4.0)));
        el.style.pointerEvents = 'auto';
        el.tabIndex = 0;
        el.style.transform = `translate3d(${sx}px, ${sy - 14}px, 0) translate(-50%, -100%)`;
      }
    };

    const handleResize = () => {
      if (isDisposed || !container) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(420, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      camera.position.setLength(getOptimalCameraDistance(w, h));
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Software WebGL GPU-fence pacing (keeps headless Chromium snappy with zero render starvation)
    const afterDraw = (cb: () => void) => {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 85);
        return;
      }
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 6);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 85);
        }
      };
      frameId = window.setTimeout(poll, 6);
    };

    const tick = () => {
      if (isDisposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      if (animatingCameraFocus) {
        const alpha = 1 - Math.exp(-5.5 * dt);
        camera.position.lerp(_camGoal, alpha);
        camera.lookAt(0, 0, 0);
        if (camera.position.distanceTo(_camGoal) < 0.02) {
          camera.position.copy(_camGoal);
          camera.lookAt(0, 0, 0);
          animatingCameraFocus = false;
        }
      } else if (autoRotateRef.current && !userDragging) {
        globeGroup.rotation.y += dt * 0.065;
      }

      controls.update();
      globeGroup.updateMatrixWorld(true);
      updateProjectedOverlays();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    // Align initial halo and start render loop
    alignHaloToExchange(selectedIdRef.current);
    tick();

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
      texturesToDispose.forEach((t) => t.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleSelectExchange = (ex: StockExchangeNode) => {
    setSelectedId(ex.id);
    focusTriggerRef.current(ex);
  };

  return (
    <section
      id="global-exchanges-globe"
      aria-label="Explore available markets — 3D Global Fund, ETF & Bullion Hubs"
      className="relative w-full bg-[#000000] text-white border-t border-[#1E222D] overflow-hidden"
    >
      {/* Top Centered Header Arch + Live Global Market Session Telemetry Bar */}
      <div className="relative z-20 flex flex-col items-center pt-5 px-4">
        <div className="px-6 py-1.5 rounded-t-2xl border border-b-0 border-[#2A2E39] bg-[#090B10] text-xs font-medium text-[#E5E7EB]">
          Global Exchanges &amp; Live Market Session Hubs
        </div>
        <div className="w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-[#2A2E39] to-transparent" />
        <p className="mt-2 text-center text-xs text-[#9598A1]">
          Interactive 3D Exchange Intelligence · {GLOBAL_STOCK_EXCHANGES.length} equity, ETF &amp; bullion hubs — live session clocks, liquidity overlaps &amp; direct Fund Terminal launch
        </p>

        {/* Live Global Market Telemetry Bar */}
        <div
          data-testid="global-exchanges-telemetry-bar"
          className="mt-3.5 w-full max-w-5xl rounded-xl border border-[#1E2533] bg-[#0B0F17]/95 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-[#34d399] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span>
                {globalSessions.openCount}/{GLOBAL_STOCK_EXCHANGES.length} Venues Open
              </span>
            </span>
            <span className="text-[#334155]">|</span>
            <span className="text-[#fbbf24]">
              Pre/After: {globalSessions.preMarketCount + globalSessions.afterHoursCount}
            </span>
            <span className="text-[#334155]">|</span>
            <span className="text-[#93c5fd]">
              {globalSessions.totalListedEtfs.toLocaleString('en-US')} Listed ETFs
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-[11.5px]">
            <span
              data-testid="global-session-overlap-banner"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#11192B] border border-[#2563eb]/40 text-[#93c5fd] font-medium"
            >
              <Radio className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>{globalSessions.activeOverlapName}</span>
            </span>
            <span className="font-mono text-[#94a3b8] inline-flex items-center gap-1 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-[#64748b]" />
              {utcClockLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Unobstructed 3D Globe Viewport Container */}
      <div
        data-testid="globe-3d-viewport"
        className="relative w-full h-[540px] sm:h-[600px] lg:h-[630px]"
      >
        {webglUnavailable ? (
          <div className="w-full h-full flex items-center justify-center text-sm text-[#9598A1]">
            WebGL 3D rendering is unavailable in this browser environment.
          </div>
        ) : (
          /* Dedicated empty WebGL mount container (no sibling React state teardown) */
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        )}

        {/* Floating Projected Front-Hemisphere Stock Exchange Name Tags */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
          {GLOBAL_STOCK_EXCHANGES.map((ex) => {
            const exSession = globalSessions.sessionsById[ex.id];
            const dotCls =
              exSession?.status === 'OPEN'
                ? 'bg-[#10b981]'
                : exSession?.status === 'PRE_MARKET' || exSession?.status === 'AFTER_HOURS'
                  ? 'bg-[#f59e0b]'
                  : 'bg-[#64748b]';
            return (
              <button
                key={ex.id}
                ref={(el) => {
                  labelElsRef.current[ex.id] = el;
                }}
                type="button"
                onClick={() => handleSelectExchange(ex)}
                aria-label={`Focus ${ex.name} (${ex.code})`}
                style={{ opacity: 0, pointerEvents: 'none' }}
                className="absolute top-0 left-0 px-2.5 py-1 rounded-md bg-[#0B0E15]/95 hover:bg-[#161B26] border border-[#3B4252] hover:border-[#60A5FA] text-[11px] font-medium text-white shadow-xl transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
                <span className="font-mono font-bold text-[#60A5FA]">{ex.code}</span>
                <span className="text-[#E5E7EB]">{ex.name}</span>
              </button>
            );
          })}

          {/* Signature Selected Stock Exchange Detail Card Over Active Blue Pin */}
          <div
            ref={focusCardRef}
            data-testid="selected-exchange-card"
            className="absolute top-0 left-0 w-[274px] sm:w-[292px] rounded-2xl border border-[#2F3542] bg-[#0B0E14]/94 px-5 py-4 text-center shadow-[0_18px_45px_rgba(0,0,0,0.85)]"
            style={{
              transform: 'translate3d(50%, 36%, 0) translate(-50%, -50%)',
            }}
          >
            {/* Circular Exchange Crest / Monogram Emblem */}
            <div
              className="w-11 h-11 rounded-full mx-auto mb-2 border-2 border-white/90 flex items-center justify-center text-[11px] font-display font-extrabold text-white shadow-md"
              style={{ backgroundColor: activeExchange.badgeBg }}
            >
              {activeExchange.badgeText}
            </div>

            {activeSession && (() => {
              const badge = getStatusBadgeStyle(activeSession.status);
              return (
                <div
                  className={`mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-semibold uppercase tracking-wider whitespace-nowrap mx-auto ${badge.bg} ${badge.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  <span>
                    {activeSession.statusLabel} · {activeSession.localTimeStr}
                  </span>
                </div>
              );
            })()}

            <div className="text-[11px] font-mono uppercase tracking-wider text-[#9598A1]">
              {activeExchange.code} · {activeProfile.marketCapLabel} Mkt Cap
            </div>
            <h3 className="text-base font-display font-bold text-white mt-0.5 leading-snug">
              {activeExchange.name}
            </h3>
            <p className="text-[11px] text-[#B2B5BE] mt-1">{activeExchange.instruments}</p>

            <div className="mt-1.5 inline-flex items-center justify-center gap-1.5 text-xs text-[#9598A1]">
              <span>{activeExchange.country}</span>
              <span aria-hidden="true">{activeExchange.flag}</span>
              <span>· {activeProfile.settlementCycle}</span>
            </div>

            {onJumpToAnalysis && (
              <div className="mt-3 pt-2.5 border-t border-[#1E222D] flex items-center justify-between text-[11px]">
                <span className="text-[#787B86] font-mono truncate">{activeExchange.benchmark}</span>
                <button
                  type="button"
                  onClick={() => onJumpToAnalysis(activeExchange.sampleTicker)}
                  className="inline-flex items-center gap-1 font-semibold text-[#60A5FA] hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <span>Inspect {activeExchange.sampleTicker}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Unified Bottom Collapsible Control Dock (Search + Region + Open Now + Exchange Switcher) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(1020px,95vw)] flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            aria-expanded={!dockCollapsed}
            className="mb-1.5 px-3 py-1 rounded-t-lg bg-[#0E121B]/95 border border-b-0 border-[#2A2E39] text-[11px] font-medium text-[#B2B5BE] hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>{dockCollapsed ? 'Show Hub Navigator' : 'Hide Controls'}</span>
            {dockCollapsed ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {!dockCollapsed && (
            <div className="w-full rounded-2xl bg-[#0B0E15]/95 border border-[#2A2E39] p-2.5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-[#1E222D]">
                <div className="flex flex-wrap items-center gap-1">
                  {REGIONS.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => setRegionFilter(region)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        regionFilter === region
                          ? 'bg-[#2962FF] text-white'
                          : 'text-[#9598A1] hover:text-white hover:bg-[#161B26]'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-testid="exchange-filter-open-now"
                    onClick={() => setOpenOnlyFilter((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1 border ${
                      openOnlyFilter
                        ? 'bg-[#064e3b] border-[#10b981] text-[#34d399]'
                        : 'bg-[#11151F] border-[#2A2E39] text-[#9598A1] hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>Open Now ({globalSessions.openCount})</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 pointer-events-none" />
                    <input
                      type="text"
                      data-testid="exchange-search-input"
                      aria-label="Search global exchanges by name, code, country, or ETF"
                      value={exchangeSearch}
                      onChange={(e) => setExchangeSearch(e.target.value)}
                      placeholder="Filter exchange or ETF..."
                      className="h-7 pl-7 pr-6 rounded-md bg-[#11151F] border border-[#2A2E39] focus:border-[#60A5FA] text-[11px] text-white placeholder:text-[#64748b] focus:outline-none w-[170px]"
                    />
                    {exchangeSearch && (
                      <button
                        type="button"
                        aria-label="Clear exchange filter"
                        onClick={() => setExchangeSearch('')}
                        className="absolute right-1.5 text-[#64748b] hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setAutoRotate((prev) => !prev)}
                    aria-label={autoRotate ? 'Pause 3D globe rotation' : 'Resume 3D globe rotation'}
                    className="px-2.5 py-1 rounded-md bg-[#161B26] hover:bg-[#1E2533] border border-[#2A2E39] text-[11px] font-medium text-[#D1D4DC] inline-flex items-center gap-1 cursor-pointer"
                  >
                    {autoRotate ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        <span>Spin</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => resetViewRef.current()}
                    aria-label="Reset 3D globe camera"
                    className="px-2.5 py-1 rounded-md bg-[#161B26] hover:bg-[#1E2533] border border-[#2A2E39] text-[11px] font-medium text-[#D1D4DC] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Exchange Name Quick Switcher Strip */}
              {filteredExchanges.length === 0 ? (
                <div className="py-2 text-center text-[11px] text-[#9598A1]">
                  No exchanges match the current filter.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setRegionFilter('All');
                      setExchangeSearch('');
                      setOpenOnlyFilter(false);
                    }}
                    className="text-[#60A5FA] underline cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {filteredExchanges.map((ex) => {
                    const isActive = ex.id === activeExchange.id;
                    const sess = globalSessions.sessionsById[ex.id];
                    const stStyle = getStatusBadgeStyle(sess?.status || 'CLOSED');
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        data-testid={`exchange-pill-${ex.id}`}
                        onClick={() => handleSelectExchange(ex)}
                        className={`px-2.5 py-1.5 rounded-lg text-left shrink-0 transition-colors border cursor-pointer ${
                          isActive
                            ? 'bg-[#1D2D50] border-[#2962FF] text-white'
                            : 'bg-[#11151F] border-[#222733] hover:border-[#434959] text-[#B2B5BE] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stStyle.dot}`} />
                          <span aria-hidden="true">{ex.flag}</span>
                          <span className="font-mono text-[#60A5FA]">{ex.code}</span>
                          <span>{ex.name}</span>
                          {sess && (
                            <span className="font-mono text-[10px] text-[#64748b] tabular-nums">
                              {sess.localTimeStr}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Institutional Exchange Intelligence Desk & 24-Hour Global Session Overlap Timeline */}
      <div
        data-testid="global-exchanges-intelligence-desk"
        className="relative z-10 max-w-[1260px] mx-auto px-4 md:px-8 pt-4 pb-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 5 Columns: Selected Exchange Deep Intelligence & Terminal Launchpad */}
          <div
            data-testid="exchange-intelligence-dossier"
            className="lg:col-span-5 rounded-2xl border border-[#1E2533] bg-[#0B0F17] p-5 flex flex-col justify-between gap-4"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1E2533]">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center text-[11px] font-display font-extrabold text-white shrink-0"
                    style={{ backgroundColor: activeExchange.badgeBg }}
                  >
                    {activeExchange.badgeText}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#60A5FA]">
                        {activeExchange.code}
                      </span>
                      <span className="text-xs text-[#94a3b8]">
                        {activeExchange.country} {activeExchange.flag}
                      </span>
                    </div>
                    <h4 className="text-base font-display font-bold text-white truncate">
                      {activeExchange.name}
                    </h4>
                  </div>
                </div>

                {activeSession && (() => {
                  const badge = getStatusBadgeStyle(activeSession.status);
                  return (
                    <div
                      className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-mono font-semibold shrink-0 inline-flex items-center gap-1.5 ${badge.bg} ${badge.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span>{activeSession.statusLabel}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Local Clock & Session Progress Bar */}
              {activeSession && (
                <div className="rounded-xl border border-[#1E2533] bg-[#0F1521] p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-white font-semibold">
                      Local: {activeSession.localTimeStr} · {activeProfile.timezone}
                    </span>
                    <span className="text-[#93c5fd]">{activeSession.nextTransitionLabel}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#1E2533] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2563eb] transition-all"
                      style={{ width: `${activeSession.sessionProgressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] text-[#94a3b8] font-mono">
                    <span>Hours: {activeProfile.tradingHoursLabel}</span>
                    <span>Benchmark: {activeExchange.benchmark}</span>
                  </div>
                </div>
              )}

              {/* 6 Operational Micro-Stats */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Market Cap', val: activeProfile.marketCapLabel },
                  {
                    label: 'Listed ETFs',
                    val: activeProfile.listedEtfsCount.toLocaleString('en-US'),
                  },
                  { label: 'Daily Turnover', val: activeProfile.avgDailyTurnoverLabel },
                  { label: 'Currency', val: activeProfile.currency },
                  { label: 'Settlement', val: activeProfile.settlementCycle },
                  {
                    label: 'Index Move',
                    val: `${activeProfile.benchmarkChangePct >= 0 ? '+' : ''}${activeProfile.benchmarkChangePct.toFixed(2)}%`,
                    tone:
                      activeProfile.benchmarkChangePct >= 0
                        ? 'text-[#34d399]'
                        : 'text-[#f87171]',
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-lg border border-[#1E2533] bg-[#111724] p-2.5"
                  >
                    <div className="text-[10px] font-mono uppercase text-[#64748b]">
                      {kpi.label}
                    </div>
                    <div
                      className={`text-sm font-mono font-bold tabular-nums mt-0.5 ${
                        kpi.tone || 'text-white'
                      }`}
                    >
                      {kpi.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Benchmark Quote & Market Wire Strip (Finnhub / Proxy) */}
              {liveExchangeDossier && (
                <div
                  data-testid="exchange-live-benchmark-wire"
                  className="rounded-xl border border-[#1E2533] bg-[#0F1521] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                    <span className="text-[#93c5fd] font-semibold truncate">
                      {liveExchangeDossier.instrument.symbol} · {liveExchangeDossier.instrument.name}
                    </span>
                    <span
                      className={`font-bold shrink-0 ${
                        liveExchangeDossier.instrument.changePercent >= 0
                          ? 'text-[#34d399]'
                          : 'text-[#f87171]'
                      }`}
                    >
                      {liveExchangeDossier.instrument.currency === 'INR' ? '₹' : '$'}
                      {liveExchangeDossier.instrument.price.toFixed(2)} (
                      {liveExchangeDossier.instrument.changePercent >= 0 ? '+' : ''}
                      {liveExchangeDossier.instrument.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                  {liveExchangeDossier.news[0] && (
                    <div className="text-[11px] text-[#cbd5e1] leading-snug line-clamp-2 border-t border-[#1E2533] pt-1.5">
                      <span className="text-[#60A5FA] font-mono uppercase text-[10px] mr-1.5">
                        {liveExchangeDossier.news[0].source}
                      </span>
                      {liveExchangeDossier.news[0].headline}
                    </div>
                  )}
                </div>
              )}

              {/* Asset Specialties */}
              <div>
                <div className="text-[10.5px] font-mono uppercase text-[#64748b] mb-1.5">
                  Core Market Specialties
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeProfile.assetSpecialties.map((spec) => (
                    <span
                      key={spec}
                      className="px-2 py-0.5 rounded bg-[#161E2E] border border-[#263147] text-[11px] text-[#cbd5e1]"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Clickable Flagship ETFs & Mutual Funds -> Launch Straight into Fund Terminal */}
              {onJumpToAnalysis && (
                <div>
                  <div className="text-[10.5px] font-mono uppercase text-[#64748b] mb-1.5">
                    Launch Flagship ETFs / Funds in Terminal
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeProfile.featuredSymbols.map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        data-testid={`exchange-launch-symbol-${sym}`}
                        onClick={() => onJumpToAnalysis(sym)}
                        className="px-2.5 py-1 rounded-lg bg-[#11192B] hover:bg-[#1D2D50] border border-[#2563eb]/40 hover:border-[#60A5FA] text-xs font-mono font-semibold text-[#93c5fd] hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>{sym}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {onCompareExchangeBenchmarks && activeProfile.featuredSymbols.length >= 2 && (
              <button
                type="button"
                data-testid="exchange-compare-benchmarks-btn"
                onClick={() =>
                  onCompareExchangeBenchmarks(
                    activeProfile.featuredSymbols[0],
                    activeProfile.featuredSymbols.slice(1, 3)
                  )
                }
                className="w-full h-9 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <GitCompare className="w-4 h-4" />
                <span>
                  Compare {activeExchange.code} Benchmarks ({activeProfile.featuredSymbols[0]} vs{' '}
                  {activeProfile.featuredSymbols[1]})
                </span>
              </button>
            )}
          </div>

          {/* Right 7 Columns: 24-Hour Global Trading Session Overlap Timeline (UTC) */}
          <div
            data-testid="global-24h-session-timeline"
            className="lg:col-span-7 rounded-2xl border border-[#1E2533] bg-[#0B0F17] p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#1E2533]">
                <div>
                  <h4 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#60A5FA]" />
                    <span>24-Hour Global Trading Session Timeline (UTC)</span>
                  </h4>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    Click any liquidity hub row to rotate the 3D globe and inspect its ETF &amp; sovereign benchmarks
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[#111724] border border-[#263147] text-[11px] font-mono text-[#38bdf8] tabular-nums">
                  Now: {utcClockLabel}
                </span>
              </div>

              {/* UTC Hour Axis Labels */}
              <div className="grid grid-cols-12 items-center mb-2 text-[10px] font-mono text-[#64748b] tabular-nums">
                <div className="col-span-4 pr-2">Exchange Hub</div>
                <div className="col-span-8 flex justify-between px-0.5">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </div>

              {/* Session Bars */}
              <div className="relative space-y-2">
                {TIMELINE_HUB_IDS.map((hubId) => {
                  const ex = GLOBAL_STOCK_EXCHANGES.find((e) => e.id === hubId);
                  if (!ex) return null;
                  const sess = globalSessions.sessionsById[ex.id];
                  const isSelected = ex.id === activeExchange.id;
                  const startPct = (sess.openUtcHour / 24) * 100;
                  const endPct = (sess.closeUtcHour / 24) * 100;
                  const wrapsMidnight = sess.closeUtcHour < sess.openUtcHour;
                  const barColor =
                    sess.status === 'OPEN'
                      ? 'bg-[#10b981]'
                      : isSelected
                        ? 'bg-[#3b82f6]'
                        : 'bg-[#2563eb]/65';

                  return (
                    <button
                      key={ex.id}
                      type="button"
                      data-testid={`timeline-row-${ex.id}`}
                      onClick={() => handleSelectExchange(ex)}
                      className={`w-full grid grid-cols-12 items-center py-1.5 px-2 rounded-lg transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#17223B] border border-[#2563eb]/60'
                          : 'hover:bg-[#111724] border border-transparent'
                      }`}
                    >
                      <div className="col-span-4 pr-2 flex items-center gap-1.5 min-w-0">
                        <span aria-hidden="true" className="text-xs">
                          {ex.flag}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-[#60A5FA] shrink-0">
                          {ex.code}
                        </span>
                        <span className="text-[11px] text-[#cbd5e1] truncate">
                          {ex.country}
                        </span>
                      </div>

                      <div className="col-span-8 relative h-5 rounded bg-[#131A29] border border-[#1E2638] overflow-hidden">
                        {/* Quarter-day grid hairlines */}
                        <div className="absolute inset-y-0 left-1/4 w-px bg-[#1E293B]" />
                        <div className="absolute inset-y-0 left-1/2 w-px bg-[#1E293B]" />
                        <div className="absolute inset-y-0 left-3/4 w-px bg-[#1E293B]" />

                        {wrapsMidnight ? (
                          <>
                            <div
                              className={`absolute top-1 bottom-1 rounded-l ${barColor}`}
                              style={{ left: `${startPct}%`, width: `${100 - startPct}%` }}
                            />
                            <div
                              className={`absolute top-1 bottom-1 rounded-r ${barColor}`}
                              style={{ left: '0%', width: `${endPct}%` }}
                            />
                          </>
                        ) : (
                          <div
                            className={`absolute top-1 bottom-1 rounded ${barColor}`}
                            style={{
                              left: `${startPct}%`,
                              width: `${Math.max(4, endPct - startPct)}%`,
                            }}
                          />
                        )}

                        {/* Current Live UTC Cursor */}
                        <div
                          className="absolute inset-y-0 w-0.5 bg-[#38bdf8] z-10"
                          style={{ left: `${(utcNowHour / 24) * 100}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1E2533] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#94a3b8]">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2 rounded-xs bg-[#10b981]" />
                  Live Open Session
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2 rounded-xs bg-[#2563eb]/70" />
                  Scheduled Regular Hours
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-0.5 h-3 bg-[#38bdf8]" />
                  Current UTC Marker
                </span>
              </div>
              <span className="text-[#cbd5e1]">{globalSessions.activeOverlapName}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

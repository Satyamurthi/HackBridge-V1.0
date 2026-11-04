"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import * as THREE from "three";

interface SectionKeyframe3D {
  stop: number;
  globeX: number;
  globeY: number;
  globeZ: number;
  rotTiltX: number;
  cameraZ: number;
  scale: number;
}

const SECTION_KEYFRAMES_3D: SectionKeyframe3D[] = [
  // Section 1: Hero (Centered, majestic perspective framing headline)
  { stop: 0.00, globeX: 0, globeY: 0, globeZ: 0, rotTiltX: 0.20, cameraZ: 295, scale: 1.0 },
  // Section 2: Active Collegiate Arena (Glides right to frame live timing card on the left)
  { stop: 0.28, globeX: 48, globeY: -12, globeZ: -14, rotTiltX: 0.32, cameraZ: 280, scale: 0.94 },
  // Section 3: How HackBridge Works (Ascends and centers as an orbital canopy above the 3 cards)
  { stop: 0.56, globeX: 0, globeY: 38, globeZ: -28, rotTiltX: 0.44, cameraZ: 285, scale: 0.92 },
  // Section 4: Architectural Invariants & Protocol Rules (Glides left to balance right-side details)
  { stop: 0.80, globeX: -46, globeY: -14, globeZ: -18, rotTiltX: 0.28, cameraZ: 275, scale: 0.95 },
  // Section 5: FAQ & Footer (Recedes gracefully into cosmic horizon)
  { stop: 1.00, globeX: 0, globeY: -26, globeZ: -48, rotTiltX: 0.18, cameraZ: 265, scale: 0.86 },
];

function interpolateKeyframes3D(ratio: number): SectionKeyframe3D {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped <= SECTION_KEYFRAMES_3D[0].stop) return SECTION_KEYFRAMES_3D[0];
  const lastIdx = SECTION_KEYFRAMES_3D.length - 1;
  if (clamped >= SECTION_KEYFRAMES_3D[lastIdx].stop) return SECTION_KEYFRAMES_3D[lastIdx];

  for (let i = 0; i < lastIdx; i++) {
    const a = SECTION_KEYFRAMES_3D[i];
    const b = SECTION_KEYFRAMES_3D[i + 1];
    if (clamped >= a.stop && clamped <= b.stop) {
      const t = (clamped - a.stop) / (b.stop - a.stop);
      const smoothT = t * t * (3 - 2 * t);
      return {
        stop: clamped,
        globeX: a.globeX + (b.globeX - a.globeX) * smoothT,
        globeY: a.globeY + (b.globeY - a.globeY) * smoothT,
        globeZ: a.globeZ + (b.globeZ - a.globeZ) * smoothT,
        rotTiltX: a.rotTiltX + (b.rotTiltX - a.rotTiltX) * smoothT,
        cameraZ: a.cameraZ + (b.cameraZ - a.cameraZ) * smoothT,
        scale: a.scale + (b.scale - a.scale) * smoothT,
      };
    }
  }
  return SECTION_KEYFRAMES_3D[0];
}

interface SectionKeyframe2D {
  stop: number;
  cxFactor: number;
  cyFactor: number;
  scaleFactor: number;
}

const SECTION_KEYFRAMES_2D: SectionKeyframe2D[] = [
  { stop: 0.00, cxFactor: 0.50, cyFactor: 0.50, scaleFactor: 0.28 },
  { stop: 0.28, cxFactor: 0.72, cyFactor: 0.44, scaleFactor: 0.26 },
  { stop: 0.56, cxFactor: 0.50, cyFactor: 0.28, scaleFactor: 0.24 },
  { stop: 0.80, cxFactor: 0.28, cyFactor: 0.46, scaleFactor: 0.25 },
  { stop: 1.00, cxFactor: 0.50, cyFactor: 0.62, scaleFactor: 0.21 },
];

function interpolateKeyframes2D(ratio: number): SectionKeyframe2D {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped <= SECTION_KEYFRAMES_2D[0].stop) return SECTION_KEYFRAMES_2D[0];
  const lastIdx = SECTION_KEYFRAMES_2D.length - 1;
  if (clamped >= SECTION_KEYFRAMES_2D[lastIdx].stop) return SECTION_KEYFRAMES_2D[lastIdx];

  for (let i = 0; i < lastIdx; i++) {
    const a = SECTION_KEYFRAMES_2D[i];
    const b = SECTION_KEYFRAMES_2D[i + 1];
    if (clamped >= a.stop && clamped <= b.stop) {
      const t = (clamped - a.stop) / (b.stop - a.stop);
      const smoothT = t * t * (3 - 2 * t);
      return {
        stop: clamped,
        cxFactor: a.cxFactor + (b.cxFactor - a.cxFactor) * smoothT,
        cyFactor: a.cyFactor + (b.cyFactor - a.cyFactor) * smoothT,
        scaleFactor: a.scaleFactor + (b.scaleFactor - a.scaleFactor) * smoothT,
      };
    }
  }
  return SECTION_KEYFRAMES_2D[0];
}

export default function Global3DBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();

  // On heavy dashboard, login, register, or admin routes, completely skip 3D background
  // to avoid consuming GPU memory and background render cycles
  const isDashboardOrAuth =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/host-agreement");

  useEffect(() => {
    if (isDashboardOrAuth) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cleanupWebGL: (() => void) | null = null;
    let cleanup2D: (() => void) | null = null;

    // Detect Firefox on Linux or prefers-reduced-motion to avoid Mesa DRI / GPU process 32GB memory ballooning
    const isFirefox = typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent);
    const isLinux = typeof navigator !== "undefined" && /linux/i.test(navigator.userAgent);
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // -------------------------------------------------------------
    // High-Efficiency 2D Canvas Fallback (Zero GC Allocation per frame)
    // -------------------------------------------------------------
    const start2DFallback = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.2);
      const resize = () => {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
      };
      resize();
      window.addEventListener("resize", resize, { passive: true });

      const numPoints = 400; // Balanced points for smooth 60fps
      const points: Array<{ x: number; y: number; z: number }> = [];
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < numPoints; i++) {
        const y = 1 - (i / (numPoints - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        points.push({
          x: Math.cos(theta) * radiusAtY,
          y,
          z: Math.sin(theta) * radiusAtY,
        });
      }

      const arcHubs = [
        { lat: 0.65, lng: -2.1 },
        { lat: 0.71, lng: -1.3 },
        { lat: 0.89, lng: 0.0 },
        { lat: 0.22, lng: 1.35 },
        { lat: -0.59, lng: 2.6 },
      ];

      let angleY = 0;
      let animId: number;
      let lastTime = performance.now();
      let targetScrollRatio = 0;
      let currentScrollRatio = 0;

      let cachedDocHeight = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const updateDocHeight = () => {
        cachedDocHeight = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1
        );
      };
      window.addEventListener("resize", updateDocHeight, { passive: true });

      const onScroll2D = () => {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        targetScrollRatio = Math.min(Math.max(scrollY / cachedDocHeight, 0), 1);
      };
      window.addEventListener("scroll", onScroll2D, { passive: true });
      onScroll2D();

      let lastRender = 0;
      const targetInterval = 1000 / 45; // Smooth 45 FPS ceiling

      const render2D = (time: number) => {
        animId = requestAnimationFrame(render2D);

        if (time - lastRender < targetInterval) return;
        const dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;
        lastRender = time;

        angleY += dt * 0.22;
        currentScrollRatio += (targetScrollRatio - currentScrollRatio) * 0.06;
        const kf2D = interpolateKeyframes2D(currentScrollRatio);

        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        const isMobile = w < 768;
        const cxTarget = isMobile ? w * 0.5 : w * kf2D.cxFactor;
        const cyTarget = h * kf2D.cyFactor;
        const baseRadius = Math.min(w, h) * kf2D.scaleFactor;

        const tiltX = 0.25;
        const cosTilt = Math.cos(tiltX);
        const sinTilt = Math.sin(tiltX);
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);

        // Pass 1: Back hemisphere points (Zero allocation)
        ctx.fillStyle = "rgba(99, 102, 241, 0.20)";
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const x1 = p.x * cosY - p.z * sinY;
          const z1 = p.x * sinY + p.z * cosY;
          const z2 = p.y * sinTilt + z1 * cosTilt;
          if (z2 <= 0) {
            const y2 = p.y * cosTilt - z1 * sinTilt;
            const px = cxTarget + x1 * baseRadius;
            const py = cyTarget - y2 * baseRadius;
            ctx.beginPath();
            ctx.arc(px, py, 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Pass 2: Front hemisphere points (Illuminated depth)
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const x1 = p.x * cosY - p.z * sinY;
          const z1 = p.x * sinY + p.z * cosY;
          const z2 = p.y * sinTilt + z1 * cosTilt;
          if (z2 > 0) {
            const y2 = p.y * cosTilt - z1 * sinTilt;
            const px = cxTarget + x1 * baseRadius;
            const py = cyTarget - y2 * baseRadius;
            ctx.beginPath();
            ctx.arc(px, py, 1.5 + z2 * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = z2 > 0.4 ? `rgba(165, 180, 252, ${0.45 + z2 * 0.5})` : `rgba(99, 102, 241, ${0.4 + z2 * 0.4})`;
            ctx.fill();
          }
        }

        // Pass 3: Network arcs
        ctx.lineWidth = 1;
        for (let a = 0; a < arcHubs.length - 1; a++) {
          const h1 = arcHubs[a];
          const h2 = arcHubs[a + 1];

          const xA = Math.cos(h1.lat) * Math.sin(h1.lng + angleY);
          const yA = Math.sin(h1.lat);
          const zA = Math.cos(h1.lat) * Math.cos(h1.lng + angleY);

          const xB = Math.cos(h2.lat) * Math.sin(h2.lng + angleY);
          const yB = Math.sin(h2.lat);
          const zB = Math.cos(h2.lat) * Math.cos(h2.lng + angleY);

          if (zA > -0.2 || zB > -0.2) {
            const p1x = cxTarget + xA * baseRadius;
            const p1y = cyTarget - (yA * cosTilt - zA * sinTilt) * baseRadius;
            const p2x = cxTarget + xB * baseRadius;
            const p2y = cyTarget - (yB * cosTilt - zB * sinTilt) * baseRadius;

            const midX = (p1x + p2x) / 2;
            const midY = (p1y + p2y) / 2 - 25;

            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.quadraticCurveTo(midX, midY, p2x, p2y);
            ctx.strokeStyle = "rgba(129, 140, 248, 0.35)";
            ctx.stroke();
          }
        }
      };

      animId = requestAnimationFrame(render2D);

      cleanup2D = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", resize);
        window.removeEventListener("resize", updateDocHeight);
        window.removeEventListener("scroll", onScroll2D);
      };
    };

    // -------------------------------------------------------------
    // Primary: Three.js High-Performance Section-Synced WebGL Renderer
    // -------------------------------------------------------------
    const startWebGL = () => {
      try {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          45,
          window.innerWidth / window.innerHeight,
          1,
          1200
        );
        camera.position.set(0, 0, 295);

        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
          failIfMajorPerformanceCaveat: false,
        });

        renderer.setClearColor(0x000000, 0);
        // Fixed 1.0 pixel ratio (prevents GPU memory spikes and buffer reallocations)
        renderer.setPixelRatio(1.0);
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Circular particle texture
        const createCircleTexture = () => {
          const size = 32;
          const tCanvas = document.createElement("canvas");
          tCanvas.width = size;
          tCanvas.height = size;
          const ctx = tCanvas.getContext("2d");
          if (ctx) {
            const gradient = ctx.createRadialGradient(
              size / 2,
              size / 2,
              0,
              size / 2,
              size / 2,
              size / 2
            );
            gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
            gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.85)");
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
          }
          const texture = new THREE.CanvasTexture(tCanvas);
          texture.generateMipmaps = false;
          texture.minFilter = THREE.LinearFilter;
          return texture;
        };
        const circleTexture = createCircleTexture();

        // Volumetric Dotted Globe Group
        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        const isMobile = window.innerWidth < 768;
        // Optimized point counts: high visual density without GPU thermal throttling
        const pointCount = isMobile ? 350 : 600;
        const radius = 100;

        const positions = new Float32Array(pointCount * 3);
        const colors = new Float32Array(pointCount * 3);

        const primaryColor = new THREE.Color("#6366F1");
        const highlightColor = new THREE.Color("#818CF8");
        const luminousColor = new THREE.Color("#A5B4FC");

        const phi = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < pointCount; i++) {
          const y = 1 - (i / (pointCount - 1)) * 2;
          const r = Math.sqrt(Math.max(0, 1 - y * y));
          const theta = phi * i;
          const x = Math.cos(theta) * r;
          const z = Math.sin(theta) * r;

          positions[i * 3] = x * radius;
          positions[i * 3 + 1] = y * radius;
          positions[i * 3 + 2] = z * radius;

          const rand = Math.random();
          const c = rand > 0.85 ? luminousColor : rand > 0.35 ? highlightColor : primaryColor;
          colors[i * 3] = c.r;
          colors[i * 3 + 1] = c.g;
          colors[i * 3 + 2] = c.b;
        }

        const globeGeo = new THREE.BufferGeometry();
        globeGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        globeGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const globeMat = new THREE.PointsMaterial({
          size: isMobile ? 2.5 : 3.0,
          vertexColors: true,
          map: circleTexture,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const globePoints = new THREE.Points(globeGeo, globeMat);
        globeGroup.add(globePoints);

        // Core mesh for occlusion depth
        const coreGeo = new THREE.SphereGeometry(radius * 0.985, 24, 24);
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0x030407,
          transparent: true,
          opacity: 0.75,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        globeGroup.add(coreMesh);

        // Hub Arcs
        const hubCoords = [
          { lat: 37.77, lng: -122.41 },
          { lat: 40.71, lng: -74.0 },
          { lat: 51.5, lng: -0.12 },
          { lat: 48.85, lng: 2.35 },
          { lat: 12.97, lng: 77.59 },
          { lat: 1.35, lng: 103.81 },
          { lat: 35.67, lng: 139.65 },
          { lat: -33.86, lng: 151.2 },
          { lat: 52.52, lng: 13.4 },
          { lat: 28.61, lng: 77.2 },
        ];

        const latLngToVector3 = (lat: number, lng: number, r: number) => {
          const phiRad = (90 - lat) * (Math.PI / 180);
          const thetaRad = (lng + 180) * (Math.PI / 180);
          return new THREE.Vector3(
            -r * Math.sin(phiRad) * Math.cos(thetaRad),
            r * Math.cos(phiRad),
            r * Math.sin(phiRad) * Math.sin(thetaRad)
          );
        };

        const arcPairs = [
          [0, 1],
          [1, 2],
          [2, 3],
          [2, 4],
          [4, 9],
          [4, 5],
          [5, 6],
          [6, 0],
          [5, 7],
          [3, 8],
        ];

        interface ArcData {
          curve: THREE.CubicBezierCurve3;
          pulseMesh: THREE.Mesh;
          speed: number;
          progress: number;
        }

        const arcsData: ArcData[] = [];
        const arcGroup = new THREE.Group();
        globeGroup.add(arcGroup);

        const pulseGeo = new THREE.SphereGeometry(1.8, 8, 8);
        const pulseMat = new THREE.MeshBasicMaterial({
          color: 0xc7d2fe,
          transparent: true,
          opacity: 0.95,
        });

        const createdGeometries: THREE.BufferGeometry[] = [];
        const createdMaterials: THREE.Material[] = [];

        arcPairs.forEach(([iA, iB], idx) => {
          const start = latLngToVector3(hubCoords[iA].lat, hubCoords[iA].lng, radius);
          const end = latLngToVector3(hubCoords[iB].lat, hubCoords[iB].lng, radius);

          const distance = start.distanceTo(end);
          const arcElevation = Math.max(distance * 0.35, 20);

          const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
          const midNormal = mid.clone().normalize();

          const control1 = new THREE.Vector3().addVectors(
            start,
            midNormal.clone().multiplyScalar(arcElevation)
          );
          const control2 = new THREE.Vector3().addVectors(
            end,
            midNormal.clone().multiplyScalar(arcElevation)
          );

          const curve = new THREE.CubicBezierCurve3(start, control1, control2, end);
          const curvePoints = curve.getPoints(32);
          const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
          createdGeometries.push(curveGeo);

          const curveMat = new THREE.LineBasicMaterial({
            color: 0x818cf8,
            transparent: true,
            opacity: 0.38,
            blending: THREE.AdditiveBlending,
          });
          createdMaterials.push(curveMat);

          const line = new THREE.Line(curveGeo, curveMat);
          arcGroup.add(line);

          const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
          arcGroup.add(pulseMesh);

          arcsData.push({
            curve,
            pulseMesh,
            speed: 0.003 + (idx % 3) * 0.0015,
            progress: (idx * 0.1) % 1,
          });
        });

        // Starfield (Optimized for zero GPU lag)
        const starCount = isMobile ? 80 : 160;
        const starGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
          const dist = 380 + Math.random() * 450;
          const theta = Math.random() * Math.PI * 2;
          const u = Math.random() * 2 - 1;
          const r = Math.sqrt(1 - u * u);

          starPositions[i * 3] = dist * r * Math.cos(theta);
          starPositions[i * 3 + 1] = dist * u;
          starPositions[i * 3 + 2] = dist * r * Math.sin(theta);

          const brightness = 0.35 + Math.random() * 0.55;
          starColors[i * 3] = brightness;
          starColors[i * 3 + 1] = brightness * 1.05;
          starColors[i * 3 + 2] = brightness * 1.35;
        }

        starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
        starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

        const starMat = new THREE.PointsMaterial({
          size: 1.5,
          vertexColors: true,
          map: circleTexture,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        });
        const starPoints = new THREE.Points(starGeo, starMat);
        scene.add(starPoints);

        // Section Synchronization State
        let targetScrollRatio = 0;
        let currentScrollRatio = 0;

        const currentGlobePos = new THREE.Vector3(0, 0, 0);
        let currentCameraZ = 295;
        let currentScale = 1.0;
        let currentTiltX = 0.20;

        let cachedDocHeight = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1
        );

        const onScroll = () => {
          const scrollY = window.scrollY || window.pageYOffset || 0;
          targetScrollRatio = Math.min(Math.max(scrollY / cachedDocHeight, 0), 1);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        // Window resize
        const onResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
          cachedDocHeight = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            1
          );
        };
        window.addEventListener("resize", onResize, { passive: true });

        // Animation Loop & Adaptive FPS
        let animationFrameId: number;
        let isPaused = false;
        const clock = new THREE.Clock();

        const onVisibilityChange = () => {
          isPaused = document.hidden;
          if (!isPaused) clock.getDelta();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        // Reusable vector for pulse positioning (ZERO GC allocations)
        const pulseVector = new THREE.Vector3();
        let lastFrameTime = 0;
        const targetFrameInterval = 1000 / 45; // 45 FPS ceiling: smooth motion with zero CPU hanging

        const animate = (time: number) => {
          animationFrameId = requestAnimationFrame(animate);

          if (isPaused) return;
          if (time - lastFrameTime < targetFrameInterval) return;
          lastFrameTime = time;

          const delta = Math.min(clock.getDelta(), 0.1);
          const elapsed = clock.getElapsedTime();

          // Smoothly interpolate scroll ratio across sections
          currentScrollRatio += (targetScrollRatio - currentScrollRatio) * 0.055;
          const kf = interpolateKeyframes3D(currentScrollRatio);

          const mobileCheck = window.innerWidth < 768;
          const xMultiplier = mobileCheck ? 0.25 : 1.0;
          const targetGlobeX = kf.globeX * xMultiplier;
          const targetGlobeY = kf.globeY;
          const targetGlobeZ = kf.globeZ;
          const targetCamZ = kf.cameraZ;
          const targetScale = kf.scale;
          const targetTiltX = kf.rotTiltX;

          const lerpFactor = 0.06;
          currentGlobePos.x += (targetGlobeX - currentGlobePos.x) * lerpFactor;
          currentGlobePos.y += (targetGlobeY - currentGlobePos.y) * lerpFactor;
          currentGlobePos.z += (targetGlobeZ - currentGlobePos.z) * lerpFactor;
          currentCameraZ += (targetCamZ - currentCameraZ) * lerpFactor;
          currentScale += (targetScale - currentScale) * lerpFactor;
          currentTiltX += (targetTiltX - currentTiltX) * lerpFactor;

          // Position, scale, and rotate globe group smoothly
          globeGroup.position.set(currentGlobePos.x, currentGlobePos.y, currentGlobePos.z);
          globeGroup.scale.set(currentScale, currentScale, currentScale);

          globeGroup.rotation.y += delta * 0.12;
          globeGroup.rotation.x = currentTiltX + Math.sin(elapsed * 0.08) * 0.02;
          starPoints.rotation.y += delta * 0.015;

          // Camera parallax & organic breathing
          const driftX = Math.sin(elapsed * 0.18) * 8;
          const driftY = Math.cos(elapsed * 0.14) * 5;
          camera.position.set(driftX, driftY, currentCameraZ);
          camera.lookAt(currentGlobePos.x * 0.35, currentGlobePos.y * 0.35, currentGlobePos.z * 0.35);

          // Update network pulses using pre-allocated vector (Zero allocation)
          for (let i = 0; i < arcsData.length; i++) {
            const arc = arcsData[i];
            arc.progress = (arc.progress + arc.speed) % 1;
            arc.curve.getPointAt(arc.progress, pulseVector);
            arc.pulseMesh.position.copy(pulseVector);
          }

          renderer.render(scene, camera);
        };

        animationFrameId = requestAnimationFrame(animate);

        cleanupWebGL = () => {
          cancelAnimationFrame(animationFrameId);
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onResize);
          document.removeEventListener("visibilitychange", onVisibilityChange);

          globeGeo.dispose();
          globeMat.dispose();
          coreGeo.dispose();
          coreMat.dispose();
          pulseGeo.dispose();
          pulseMat.dispose();
          starGeo.dispose();
          starMat.dispose();
          circleTexture.dispose();

          createdGeometries.forEach((g) => g.dispose());
          createdMaterials.forEach((m) => m.dispose());

          // Cleanly release Three.js resources
          renderer.dispose();
        };
      } catch (err) {
        // Transparently fall back to high-efficiency 2D canvas if WebGL is unavailable
        start2DFallback();
      }
    };

    if (prefersReducedMotion || (isFirefox && isLinux)) {
      start2DFallback();
    } else {
      startWebGL();
    }

    return () => {
      if (cleanupWebGL) cleanupWebGL();
      if (cleanup2D) cleanup2D();
    };
  }, [isDashboardOrAuth]);

  if (isDashboardOrAuth) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-transparent"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

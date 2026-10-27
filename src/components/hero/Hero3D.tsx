"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Global collegiate & technology hubs (Lat, Lon)
const CITY_HUBS = [
  { name: "SF / Stanford", lat: 37.4275, lon: -122.1697 },
  { name: "Boston / MIT", lat: 42.3601, lon: -71.0942 },
  { name: "London / Oxford", lat: 51.752, lon: -1.2577 },
  { name: "Zurich / ETH", lat: 47.3763, lon: 8.548 },
  { name: "Bengaluru / IISc", lat: 12.9716, lon: 77.5946 },
  { name: "Tokyo / Todai", lat: 35.7128, lon: 139.762 },
  { name: "Singapore / NUS", lat: 1.2966, lon: 103.7764 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
];

// Connection arcs between hubs
const CONNECTIONS = [
  [0, 1], // Stanford <-> MIT
  [1, 2], // MIT <-> Oxford
  [2, 3], // Oxford <-> ETH Zurich
  [2, 4], // Oxford <-> IISc Bengaluru
  [4, 6], // IISc Bengaluru <-> NUS Singapore
  [0, 5], // Stanford <-> Todai Tokyo
  [5, 6], // Todai Tokyo <-> NUS Singapore
  [6, 7], // NUS Singapore <-> Sydney
];

// Spherical (Lat, Lon) to 3D Cartesian coordinates
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// In-memory smooth circular particle texture (0 external files)
function createCircleTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.9)");
  gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.35)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export default function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // 1. Accessibility: prefers-reduced-motion check
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
      return;
    }

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 2. Safe WebGL 2 Detection & Renderer Initialization (Three.js r163+ requires WebGL 2)
    try {
      const testCanvas = document.createElement("canvas");
      const gl2 = testCanvas.getContext("webgl2");
      if (!gl2) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setHasWebGL(false);
      return;
    }

    // ─── Scene & Camera Setup ──────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030407, 0.012);

    const camera = new THREE.PerspectiveCamera(
      46,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 42);

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Shared circular dot texture
    const circleTexture = createCircleTexture();

    // Group holding the globe and orbital features
    const globeGroup = new THREE.Group();
    const isMobile = container.clientWidth < 768;
    // Offset to right to frame left-aligned typography
    globeGroup.position.set(isMobile ? 0 : 13, isMobile ? -3 : 0, -1);
    scene.add(globeGroup);

    const GLOBE_RADIUS = 18;

    // ─── 1. Dotted Globe (Fibonacci Sphere Point Cloud) ─────────────────
    const dotCount = isMobile ? 2000 : 4200;
    const dotPositions = new Float32Array(dotCount * 3);
    const dotColors = new Float32Array(dotCount * 3);

    const accentColor = new THREE.Color(0xff5a1f); // Electric orange
    const brightColor = new THREE.Color(0xb8f34a); // Acid lime highlight
    const faintColor = new THREE.Color(0xe04810);  // Warm deep orange

    for (let i = 0; i < dotCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / dotCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = GLOBE_RADIUS * Math.cos(phi);
      const z = GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta);

      dotPositions[i * 3] = x;
      dotPositions[i * 3 + 1] = y;
      dotPositions[i * 3 + 2] = z;

      // Color gradation by latitude
      const latRatio = Math.abs(y / GLOBE_RADIUS);
      const c =
        latRatio > 0.65
          ? faintColor.clone().lerp(accentColor, 0.4)
          : accentColor.clone().lerp(brightColor, 0.5);

      dotColors[i * 3] = c.r;
      dotColors[i * 3 + 1] = c.g;
      dotColors[i * 3 + 2] = c.b;
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    dotGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));

    const dotMat = new THREE.PointsMaterial({
      size: isMobile ? 0.36 : 0.44,
      map: circleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const globeDots = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(globeDots);

    // Warm core sphere to mask backface dots (creates true 3D spherical depth)
    const coreGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.982, 36, 36);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfaf8f2,
      transparent: true,
      opacity: 0.95,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreMesh);

    // ─── 2. City Hub Markers on Globe ───────────────────────────────────
    const cityPositions: THREE.Vector3[] = [];
    const cityDotPositions = new Float32Array(CITY_HUBS.length * 3);

    CITY_HUBS.forEach((city, idx) => {
      const v = latLonToVector3(city.lat, city.lon, GLOBE_RADIUS * 1.015);
      cityPositions.push(v);
      cityDotPositions[idx * 3] = v.x;
      cityDotPositions[idx * 3 + 1] = v.y;
      cityDotPositions[idx * 3 + 2] = v.z;
    });

    const cityGeo = new THREE.BufferGeometry();
    cityGeo.setAttribute("position", new THREE.BufferAttribute(cityDotPositions, 3));

    const cityMat = new THREE.PointsMaterial({
      color: 0xff5a1f,
      size: 1.2,
      map: circleTexture,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });

    const cityPoints = new THREE.Points(cityGeo, cityMat);
    globeGroup.add(cityPoints);

    // ─── 3. Elevated Glowing Connection Arcs ─────────────────────────────
    const arcCurves: THREE.QuadraticBezierCurve3[] = [];
    const arcLinesGroup = new THREE.Group();
    globeGroup.add(arcLinesGroup);

    CONNECTIONS.forEach(([fromIdx, toIdx]) => {
      const p1 = cityPositions[fromIdx];
      const p2 = cityPositions[toIdx];

      // Midpoint elevated above globe proportional to distance
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      const elevation = GLOBE_RADIUS + dist * 0.38;
      mid.normalize().multiplyScalar(elevation);

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      arcCurves.push(curve);

      // Render glowing arc curve
      const points = curve.getPoints(50);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xff5a1f,
        transparent: true,
        opacity: 0.6,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      arcLinesGroup.add(line);
    });

    // Traveling energy pulse particles
    const pulseCount = arcCurves.length;
    const pulsePositions = new Float32Array(pulseCount * 3);
    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute("position", new THREE.BufferAttribute(pulsePositions, 3));

    const pulseMat = new THREE.PointsMaterial({
      color: 0xb8f34a,
      size: 1.4,
      map: circleTexture,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const pulsePoints = new THREE.Points(pulseGeo, pulseMat);
    globeGroup.add(pulsePoints);

    // ─── 4. Faint Starfield ──────────────────────────────────────────────
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 90 + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xd4cebe,
      size: 0.35,
      map: circleTexture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ─── 5. Mouse Parallax Reaction ─────────────────────────────────────
    let targetX = 0;
    let targetY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 3.5;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2.5;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // ─── 6. Responsive Resize ───────────────────────────────────────────
    const handleResize = () => {
      if (!container || !canvas) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);

      const mobile = container.clientWidth < 768;
      globeGroup.position.set(mobile ? 0 : 13, mobile ? -3 : 0, -1);
    };
    window.addEventListener("resize", handleResize);

    // ─── 7. Visibility Pause via IntersectionObserver ───────────────────
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // ─── 8. Animation Loop ──────────────────────────────────────────────
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();

      // Slow majestic rotation of the dotted globe and cities
      globeGroup.rotation.y = elapsed * 0.07;
      globeGroup.rotation.x = Math.sin(elapsed * 0.035) * 0.07;

      // Animate traveling energy pulses across arcs
      const pulsePosAttr = pulseGeo.attributes.position as THREE.BufferAttribute;
      const pulseArray = pulsePosAttr.array as Float32Array;

      arcCurves.forEach((curve, i) => {
        const progress = (elapsed * 0.28 + i * 0.125) % 1;
        const pt = curve.getPoint(progress);
        pulseArray[i * 3] = pt.x;
        pulseArray[i * 3 + 1] = pt.y;
        pulseArray[i * 3 + 2] = pt.z;
      });
      pulsePosAttr.needsUpdate = true;

      // Slow counter-drift for starfield
      stars.rotation.y = -elapsed * 0.006;

      // Smooth camera drift + gentle mouse reaction
      camera.position.x += (targetX + Math.sin(elapsed * 0.15) * 0.8 - camera.position.x) * 0.035;
      camera.position.y += (-targetY + Math.cos(elapsed * 0.12) * 0.5 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      observer.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      renderer.dispose();
      circleTexture.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      cityGeo.dispose();
      cityMat.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();
      starGeo.dispose();
      starMat.dispose();
    };
  }, []);

  if (reducedMotion || !hasWebGL) {
    // Static CSS Gradient with Dotted Radial Grid Pattern Fallback
    return (
      <div
        className="absolute inset-0 z-0 bg-gradient-to-tr from-[#030407] via-[#080b15] to-[#030407] pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(#6366f1 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute right-12 top-1/4 w-96 h-96 rounded-full border border-indigo-500/15 bg-indigo-500/5 blur-2xl opacity-40" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

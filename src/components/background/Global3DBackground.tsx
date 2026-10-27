"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function Global3DBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debugInfo, setDebugInfo] = useState<{
    webglStatus: "ok" | "failed";
    width: number;
    height: number;
    fps: number;
  }>({
    webglStatus: "ok",
    width: 0,
    height: 0,
    fps: 60,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cleanupWebGL: (() => void) | null = null;
    let cleanup2D: (() => void) | null = null;

    // Check WebGL availability with permissive flags (software WebGL support)
    const checkWebGLSupport = (): boolean => {
      if (typeof window === "undefined" || !window.WebGLRenderingContext) {
        return false;
      }
      try {
        const testCanvas = document.createElement("canvas");
        const opts: WebGLContextAttributes = {
          failIfMajorPerformanceCaveat: false,
          powerPreference: "default",
        };
        const gl =
          testCanvas.getContext("webgl", opts) ||
          testCanvas.getContext("experimental-webgl", opts) ||
          testCanvas.getContext("webgl2", opts);
        return !!gl;
      } catch {
        return false;
      }
    };

    // -------------------------------------------------------------
    // Fallback: 2D Canvas Rotating Dotted Globe & Animated Arcs
    // -------------------------------------------------------------
    const start2DFallback = () => {
      setDebugInfo((prev) => ({ ...prev, webglStatus: "failed" }));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const resize = () => {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
        setDebugInfo((prev) => ({
          ...prev,
          width: window.innerWidth,
          height: window.innerHeight,
        }));
      };
      resize();
      window.addEventListener("resize", resize);

      // Fibonacci sphere points for 2D
      const numPoints = 650;
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

      // 2D Arcs
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
      let frameCount = 0;
      let fpsTimer = performance.now();

      const render2D = (time: number) => {
        animId = requestAnimationFrame(render2D);
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        frameCount++;
        if (time - fpsTimer >= 1000) {
          const currentFps = Math.round((frameCount * 1000) / (time - fpsTimer));
          setDebugInfo((prev) => ({ ...prev, fps: currentFps }));
          frameCount = 0;
          fpsTimer = time;
        }

        angleY += dt * 0.25;

        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const baseRadius = Math.min(w, h) * 0.28;

        // Camera tilt
        const tiltX = 0.25;
        const cosTilt = Math.cos(tiltX);
        const sinTilt = Math.sin(tiltX);
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);

        // Project and sort points for depth
        const projected: Array<{ px: number; py: number; z: number; alpha: number; size: number }> = [];

        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          // Rotate around Y
          const x1 = p.x * cosY - p.z * sinY;
          const z1 = p.x * sinY + p.z * cosY;
          // Tilt around X
          const y2 = p.y * cosTilt - z1 * sinTilt;
          const z2 = p.y * sinTilt + z1 * cosTilt;

          const px = cx + x1 * baseRadius;
          const py = cy - y2 * baseRadius;
          const isFront = z2 > 0;
          const alpha = isFront ? 0.4 + z2 * 0.55 : 0.08 + (1 + z2) * 0.15;
          const size = isFront ? 1.6 + z2 * 1.4 : 1.1;

          projected.push({ px, py, z: z2, alpha, size });
        }

        projected.sort((a, b) => a.z - b.z);

        // Draw points
        for (let i = 0; i < projected.length; i++) {
          const pt = projected[i];
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, pt.size, 0, Math.PI * 2);
          ctx.fillStyle = pt.z > 0.4 ? `rgba(165, 180, 252, ${pt.alpha})` : `rgba(99, 102, 241, ${pt.alpha})`;
          ctx.fill();
        }

        // Draw dynamic arcs
        ctx.lineWidth = 1;
        for (let a = 0; a < arcHubs.length - 1; a++) {
          const h1 = arcHubs[a];
          const h2 = arcHubs[a + 1];

          // Compute 3D positions
          const xA = Math.cos(h1.lat) * Math.sin(h1.lng + angleY);
          const yA = Math.sin(h1.lat);
          const zA = Math.cos(h1.lat) * Math.cos(h1.lng + angleY);

          const xB = Math.cos(h2.lat) * Math.sin(h2.lng + angleY);
          const yB = Math.sin(h2.lat);
          const zB = Math.cos(h2.lat) * Math.cos(h2.lng + angleY);

          if (zA > -0.2 || zB > -0.2) {
            const p1x = cx + xA * baseRadius;
            const p1y = cy - (yA * cosTilt - zA * sinTilt) * baseRadius;
            const p2x = cx + xB * baseRadius;
            const p2y = cy - (yB * cosTilt - zB * sinTilt) * baseRadius;

            const midX = (p1x + p2x) / 2;
            const midY = (p1y + p2y) / 2 - 25;

            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.quadraticCurveTo(midX, midY, p2x, p2y);
            ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
            ctx.stroke();
          }
        }
      };

      animId = requestAnimationFrame(render2D);

      cleanup2D = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", resize);
      };
    };

    // -------------------------------------------------------------
    // Primary: Three.js Software-Resilient WebGL Renderer
    // -------------------------------------------------------------
    const startWebGL = () => {
      try {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          45,
          window.innerWidth / window.innerHeight,
          1,
          1500
        );
        const BASE_CAMERA_Z = 300;
        const ZOOM_IN_OFFSET = 130;
        camera.position.set(0, 0, BASE_CAMERA_Z);

        // Initialize with default powerPreference and failIfMajorPerformanceCaveat false
        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
        });

        renderer.setClearColor(0x000000, 0); // Transparent canvas background
        let currentPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        renderer.setPixelRatio(currentPixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        setDebugInfo({
          webglStatus: "ok",
          width: window.innerWidth,
          height: window.innerHeight,
          fps: 60,
        });

        // Dynamic circular particle texture
        const createCircleTexture = () => {
          const size = 64;
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

        // Volumetric Dotted Globe
        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        const isMobile = window.innerWidth < 768;
        let pointCount = isMobile ? 1800 : 3600;
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
          size: isMobile ? 2.6 : 3.2,
          vertexColors: true,
          map: circleTexture,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const globePoints = new THREE.Points(globeGeo, globeMat);
        globeGroup.add(globePoints);

        // Core mesh
        const coreGeo = new THREE.SphereGeometry(radius * 0.985, 36, 36);
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

        const pulseGeo = new THREE.SphereGeometry(2.0, 12, 12);
        const pulseMat = new THREE.MeshBasicMaterial({
          color: 0xc7d2fe,
          transparent: true,
          opacity: 0.95,
        });

        arcPairs.forEach(([i1, i2], idx) => {
          const p1 = latLngToVector3(hubCoords[i1].lat, hubCoords[i1].lng, radius);
          const p2 = latLngToVector3(hubCoords[i2].lat, hubCoords[i2].lng, radius);

          const dist = p1.distanceTo(p2);
          const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          const lift = Math.min(dist * 0.45, 45);
          const normal = mid.clone().normalize();
          const midLifted = mid.clone().add(normal.multiplyScalar(lift));

          const cp1 = new THREE.Vector3().lerpVectors(p1, midLifted, 0.5);
          const cp2 = new THREE.Vector3().lerpVectors(p2, midLifted, 0.5);

          const curve = new THREE.CubicBezierCurve3(p1, cp1, cp2, p2);
          const points = curve.getPoints(36);
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0x818cf8,
            transparent: true,
            opacity: 0.55,
          });
          const line = new THREE.Line(lineGeo, lineMat);
          arcGroup.add(line);

          const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
          pulseMesh.position.copy(p1);
          arcGroup.add(pulseMesh);

          arcsData.push({
            curve,
            pulseMesh,
            speed: 0.003 + (idx % 3) * 0.0015,
            progress: (idx * 0.1) % 1,
          });
        });

        // Starfield
        const starCount = isMobile ? 500 : 1000;
        const starGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
          const dist = 380 + Math.random() * 500;
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
          size: 1.6,
          vertexColors: true,
          map: circleTexture,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        });
        const starPoints = new THREE.Points(starGeo, starMat);
        scene.add(starPoints);

        // Scroll camera
        let targetCameraZ = BASE_CAMERA_Z;
        let currentCameraZ = BASE_CAMERA_Z;

        const onScroll = () => {
          const scrollY = window.scrollY || window.pageYOffset || 0;
          const docHeight = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            1
          );
          const scrollRatio = Math.min(Math.max(scrollY / docHeight, 0), 1);
          targetCameraZ = BASE_CAMERA_Z - scrollRatio * ZOOM_IN_OFFSET;
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        // Window resize
        const onResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
          setDebugInfo((prev) => ({
            ...prev,
            width: window.innerWidth,
            height: window.innerHeight,
          }));
        };
        window.addEventListener("resize", onResize, { passive: true });

        // Animation Loop & Adaptive FPS throttling
        let animationFrameId: number;
        let isPaused = false;
        const clock = new THREE.Clock();

        let frameCounter = 0;
        let fpsStartTime = performance.now();
        let lowFpsStreak = 0;

        const onVisibilityChange = () => {
          isPaused = document.hidden;
          if (!isPaused) clock.getDelta();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        const animate = (time: number) => {
          animationFrameId = requestAnimationFrame(animate);

          if (isPaused) return;

          // FPS monitoring & auto-adaptation
          frameCounter++;
          if (time - fpsStartTime >= 1000) {
            const currentFps = Math.round((frameCounter * 1000) / (time - fpsStartTime));
            setDebugInfo((prev) => ({ ...prev, fps: currentFps }));

            // If FPS is critically low, automatically scale down pixel ratio
            if (currentFps < 28 && currentFps > 0) {
              lowFpsStreak++;
              if (lowFpsStreak >= 2 && currentPixelRatio > 1.0) {
                currentPixelRatio = 1.0;
                renderer.setPixelRatio(currentPixelRatio);
              } else if (lowFpsStreak >= 4 && currentPixelRatio > 0.8) {
                currentPixelRatio = 0.8;
                renderer.setPixelRatio(currentPixelRatio);
                starPoints.visible = false; // Disable heavy starfield for performance
              }
            } else if (currentFps >= 45) {
              lowFpsStreak = 0;
            }

            frameCounter = 0;
            fpsStartTime = time;
          }

          const delta = clock.getDelta();
          const elapsed = clock.getElapsedTime();

          currentCameraZ += (targetCameraZ - currentCameraZ) * 0.055;

          const driftX = Math.sin(elapsed * 0.18) * 12;
          const driftY = Math.cos(elapsed * 0.14) * 8;
          camera.position.set(driftX, driftY, currentCameraZ);
          camera.lookAt(0, 0, 0);

          globeGroup.rotation.y += delta * 0.12;
          globeGroup.rotation.x = 0.22 + Math.sin(elapsed * 0.08) * 0.03;
          starPoints.rotation.y += delta * 0.015;

          arcsData.forEach((arc) => {
            arc.progress = (arc.progress + arc.speed) % 1;
            const pos = arc.curve.getPointAt(arc.progress);
            arc.pulseMesh.position.copy(pos);
          });

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
          renderer.dispose();
        };
      } catch (err) {
        console.warn("[Global3DBackground] WebGL failed to initialize. Switching to 2D Canvas fallback.", err);
        start2DFallback();
      }
    };

    // Initialize: WebGL if supported, otherwise 2D Canvas
    if (checkWebGLSupport()) {
      startWebGL();
    } else {
      start2DFallback();
    }

    return () => {
      if (cleanupWebGL) cleanupWebGL();
      if (cleanup2D) cleanup2D();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#030407]"
      aria-hidden="true"
    >
      {/* Dynamic Canvas (WebGL with 2D fallback) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />

      {/* Gentle vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030407]/10 to-[#030407]/30 pointer-events-none" />

      {/* Development on-screen debug line: ‘WebGL: ok / failed, canvas size, FPS’ */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed bottom-2 right-2 z-50 pointer-events-none px-2.5 py-1 rounded bg-black/80 border border-white/10 font-mono text-[10px] text-white/70 shadow-lg select-none">
          WebGL:{" "}
          <span
            className={
              debugInfo.webglStatus === "ok"
                ? "text-emerald-400 font-bold"
                : "text-amber-400 font-bold"
            }
          >
            {debugInfo.webglStatus === "ok" ? "ok" : "failed (2D canvas fallback)"}
          </span>{" "}
          | {debugInfo.width}x{debugInfo.height} | {debugInfo.fps} FPS
        </div>
      )}
    </div>
  );
}

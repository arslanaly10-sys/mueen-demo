"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// The logo's "doorway of connected steps" in 3D: a light travels from request (sand) to verified outcome (green).
const MINT = 0xe4f1eb, GREEN = 0x187a62, SAND = 0xc6a96b, SKY = 0xb9d8e0;
const STEPS = [0.04, 0.27, 0.5, 0.73, 0.96]; // request → checked → approved → submitted → confirmed

function doorway(w = 1.35, h = 1.5): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(new THREE.LineCurve3(new THREE.Vector3(-w, -h, 0), new THREE.Vector3(-w, 0.2, 0)));
  path.add(arc(w));
  path.add(new THREE.LineCurve3(new THREE.Vector3(w, 0.2, 0), new THREE.Vector3(w, -h, 0)));
  return path;
}
function arc(w: number) {
  const pts = new THREE.EllipseCurve(0, 0.2, w, w, Math.PI, 0, true).getPoints(48).map((p) => new THREE.Vector3(p.x, p.y, 0));
  return new THREE.CatmullRomCurve3(pts);
}

export default function HeroScene({ rtl = false }: { rtl?: boolean }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // no WebGL: the hero keeps its static background
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 0.1, 7);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 4, 5);
    scene.add(key);

    const root = new THREE.Group();
    root.scale.x = rtl ? -1 : 1; // the journey reads in the page's direction
    scene.add(root);

    const curve = doorway();
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 200, 0.055, 16, false),
      new THREE.MeshStandardMaterial({ color: MINT, roughness: 0.35, metalness: 0.1, emissive: MINT, emissiveIntensity: 0.22 }),
    );
    root.add(tube);

    // Faint arches behind: the other connected services.
    [0.6, 1.2].forEach((z, i) => {
      const ghost = new THREE.Mesh(tube.geometry, new THREE.MeshBasicMaterial({ color: SKY, transparent: true, opacity: 0.18 - i * 0.06 }));
      ghost.position.set(0, -0.05 * (i + 1), -z);
      ghost.scale.setScalar(1 + 0.12 * (i + 1));
      root.add(ghost);
    });

    const nodeGeo = new THREE.SphereGeometry(0.17, 32, 32);
    const nodes = STEPS.map((t, i) => {
      const color = i === 0 ? SAND : i === STEPS.length - 1 ? GREEN : MINT;
      const m = new THREE.Mesh(nodeGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1, emissive: color, emissiveIntensity: 0.15 }));
      m.position.copy(curve.getPointAt(t));
      root.add(m);
      return m;
    });

    const traveller = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: SAND, emissiveIntensity: 0.9 }),
    );
    const glow = new THREE.PointLight(SAND, 2.2, 2.5);
    traveller.add(glow);
    root.add(traveller);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tmp = new THREE.Color();
    const frame = (time: number) => {
      const s = time / 1000;
      const t = reduced ? 1 : (s * 0.16) % 1;
      traveller.position.copy(curve.getPointAt(Math.min(t, 0.999)));
      glow.color.copy(tmp.setHex(SAND).lerp(new THREE.Color(GREEN), t));
      (traveller.material as THREE.MeshStandardMaterial).emissive.copy(glow.color);
      nodes.forEach((n, i) => {
        const reached = t >= STEPS[i] - 0.01;
        const mat = n.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, reached ? 0.75 : 0.12, 0.08);
        n.scale.setScalar(1 + (reached && !reduced ? 0.06 * Math.sin(s * 3 + i) : 0));
      });
      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, (reduced ? 0 : Math.sin(s * 0.3) * 0.25) + pointer.x * 0.35, 0.05);
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, pointer.y * 0.15, 0.05);
      root.position.y = reduced ? 0 : Math.sin(s * 0.8) * 0.05;
      renderer.render(scene, camera);
    };

    // Only animate while visible; reduced motion renders a single settled frame.
    const io = new IntersectionObserver(([e]) => renderer.setAnimationLoop(e.isIntersecting && !reduced ? frame : null));
    io.observe(el);
    if (reduced) frame(0);

    return () => {
      renderer.setAnimationLoop(null);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [rtl]);

  return <div ref={host} className="absolute inset-0 [&>canvas]:!h-full [&>canvas]:!w-full" aria-hidden="true" />;
}

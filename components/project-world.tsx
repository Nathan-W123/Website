'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ExternalLink, FolderGit2, Map, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const WORLD = { width: 1536, height: 1024 };
const START = { x: 720, y: 946 };
const PLAYER_SPEED = 150;
const INTERACTION_RADIUS = 58;

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Direction = 'up' | 'down' | 'left' | 'right';

type Project = {
  id: string;
  number: string;
  location: string;
  projectName: string;
  category: string;
  href: string;
  summary: string;
  details: string[];
  area: string;
  accent: string;
  landmark: Point;
  approach: Point;
  building: Rect;
};

const PROJECTS: Project[] = [
  {
    id: 'black-hole', number: '01', location: 'Starfall Observatory', projectName: 'Black Hole Sim', category: 'ASTROPHYSICS · PYTHON',
    href: 'https://github.com/Nathan-W123/Black-Hole-Sim', area: 'Starfall Highlands', accent: '#f1c66d',
    summary: 'A general-relativistic simulator for tracing light and matter around a Schwarzschild black hole.',
    details: ['Backward ray tracing from an arbitrary camera', 'Relativistic accretion-disk color and Doppler shifts', 'Photon rings, lensed starfields, and secondary images'],
    landmark: { x: 307, y: 104 }, approach: { x: 307, y: 196 }, building: { x: 224, y: 28, w: 166, h: 134 },
  },
  {
    id: 'gambit', number: '02', location: "Knight's Rest", projectName: 'Gambit', category: 'MACHINE LEARNING · PYTHON',
    href: 'https://github.com/Nathan-W123/Gambit', area: 'Alderwatch', accent: '#8cb4e5',
    summary: 'A chess-playing neural network trained on human games and built to compete through the official Lichess Bot API.',
    details: ['Policy-and-value residual convolutional network', 'Alpha-beta search tuned for bullet time controls', 'ONNX inference and legal-move masking'],
    landmark: { x: 659, y: 155 }, approach: { x: 659, y: 242 }, building: { x: 532, y: 72, w: 250, h: 157 },
  },
  {
    id: 'siege', number: '03', location: 'The Proving Grounds', projectName: 'Siege', category: 'REINFORCEMENT LEARNING · PYTHON',
    href: 'https://github.com/Nathan-W123/Siege', area: 'Alderwatch', accent: '#d7784b',
    summary: 'An educational reinforcement-learning project that learns strategy inside a custom battle simulator.',
    details: ['Config-driven simulator and scripted opponents', 'Masked policy with league self-play', 'Training reports and a live WebGL network viewer'],
    landmark: { x: 489, y: 328 }, approach: { x: 489, y: 406 }, building: { x: 420, y: 277, w: 138, h: 110 },
  },
  {
    id: 'kumi', number: '04', location: "Weaver's Guild", projectName: 'Kumi', category: 'AGENT SYSTEMS · TYPESCRIPT',
    href: 'https://github.com/Nathan-W123/Kumi', area: 'Alderwatch', accent: '#d4a84e',
    summary: 'An agent-neutral coordination layer for scheduling, isolating, validating, and integrating parallel software work.',
    details: ['Isolated worktrees and conflict-aware scheduling', 'Human and multi-agent task coordination', 'Approvals, audit history, and atomic promotion'],
    landmark: { x: 730, y: 357 }, approach: { x: 730, y: 430 }, building: { x: 656, y: 286, w: 150, h: 120 },
  },
  {
    id: 'kumi-site', number: '05', location: 'The Printworks', projectName: 'Kumi Website', category: 'WEB · HTML',
    href: 'https://github.com/Nathan-W123/Kumi-Website', area: 'Alderwatch', accent: '#e08250',
    summary: 'The public face of Kumi: a fast, framework-free multi-page site with clean routing and accessible motion.',
    details: ['Nine hand-authored pages and one shared stylesheet', 'Path-prefix-safe links for embedded previews', 'Accessibility and reduced-motion regression tests'],
    landmark: { x: 928, y: 376 }, approach: { x: 928, y: 441 }, building: { x: 854, y: 320, w: 154, h: 103 },
  },
  {
    id: 'voice-agents', number: '06', location: 'Signal House', projectName: 'Voice Agents', category: 'VOICE AI · TYPESCRIPT',
    href: 'https://github.com/Nathan-W123/YCHackVoiceAgents', area: 'Alderwatch', accent: '#c99357',
    summary: 'A TypeScript voice-agent experiment built for a YC hackathon around expressive real-time conversation.',
    details: ['Realtime conversational interface', 'Hackathon-scale product experiment', 'An exploration of expressive voice interaction'],
    landmark: { x: 1095, y: 239 }, approach: { x: 1095, y: 314 }, building: { x: 1050, y: 187, w: 93, h: 108 },
  },
  {
    id: 'aero', number: '07', location: 'Gale Works', projectName: 'Aero', category: 'FLUID DYNAMICS · PYTHON',
    href: 'https://github.com/Nathan-W123/Aero', area: 'Gale Coast', accent: '#65bccc',
    summary: 'A from-scratch 2D and 3D lattice-Boltzmann wind-tunnel simulator for external and internal flows.',
    details: ['D2Q9 and D3Q19 solvers with multiple collision models', 'Analytic geometry and STL voxelization workflows', 'Lift, drag, scalar, thermal, and force observables'],
    landmark: { x: 1370, y: 169 }, approach: { x: 1362, y: 263 }, building: { x: 1292, y: 87, w: 172, h: 150 },
  },
  {
    id: 'quantize', number: '08', location: 'Atom Garden', projectName: 'Quantize', category: 'MOLECULAR SCIENCE · PYTHON',
    href: 'https://github.com/Nathan-W123/Quantize', area: 'Lumenwood', accent: '#a786ff',
    summary: 'Hybrid molecular-geometry inversion from rotational spectroscopy and quantum chemistry.',
    details: ['SVD separates spectroscopy-sensitive and null directions', 'Quantum gradients stabilize underspecified structures', 'Multi-isotopologue fitting with correction provenance'],
    landmark: { x: 205, y: 554 }, approach: { x: 205, y: 627 }, building: { x: 133, y: 506, w: 148, h: 105 },
  },
  {
    id: 'formulate', number: '09', location: 'Glassroot Conservatory', projectName: 'Formulate', category: 'MATERIALS DESIGN · PYTHON',
    href: 'https://github.com/Nathan-W123/Formulate', area: 'Glassroot Fields', accent: '#7ecf92',
    summary: 'A behavior-driven inverse materials engine that maps desired properties to ranked molecules and formulations.',
    details: ['Unit-safe target specifications and uncertainty', 'Search, expert prediction, and Pareto ranking', 'Selective quantum and molecular-dynamics validation'],
    landmark: { x: 617, y: 593 }, approach: { x: 617, y: 674 }, building: { x: 526, y: 508, w: 184, h: 137 },
  },
  {
    id: 'hf-scf', number: '10', location: 'Violet Spire', projectName: 'HF–SCF Engine', category: 'QUANTUM CHEMISTRY · PYTHON',
    href: 'https://github.com/Nathan-W123/HF-SCF-Engine', area: 'Violet Reach', accent: '#a878e8',
    summary: 'A Hartree–Fock self-consistent field engine with an interactive browser-facing demo.',
    details: ['Quantum-chemistry computation from first principles', 'Self-consistent field iteration', 'An interactive project demo for the browser'],
    landmark: { x: 1044, y: 560 }, approach: { x: 1044, y: 676 }, building: { x: 992, y: 467, w: 109, h: 183 },
  },
  {
    id: 'website', number: '11', location: "Traveler's Archive", projectName: 'Nathan’s World', category: 'INTERACTIVE WEB · TYPESCRIPT',
    href: 'https://github.com/Nathan-W123/Website', area: 'Glassroot Fields', accent: '#f3c75e',
    summary: 'The world you are standing in: a playable portfolio where every project becomes a place worth discovering.',
    details: ['Top-down exploration with keyboard and touch controls', 'Place-based project storytelling', 'A growing world for future work and experiments'],
    landmark: { x: 720, y: 829 }, approach: { x: 720, y: 914 }, building: { x: 588, y: 744, w: 271, h: 145 },
  },
];

const WORLD_BLOCKERS: Rect[] = PROJECTS.map((project) => project.building);

const directionRow: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function areaAt(point: Point) {
  if (point.y < 240 && point.x < 455) return 'Starfall Highlands';
  if (point.x > 1190 && point.y < 530) return 'Gale Coast';
  if (point.y > 480 && point.x < 470) return 'Lumenwood';
  if (point.y > 470 && point.x > 900) return 'Violet Reach';
  if (point.y > 470) return 'Glassroot Fields';
  return 'Alderwatch';
}

function clearsBlockers(point: Point) {
  const feet = { x: point.x - 6, y: point.y - 11, w: 12, h: 14 };
  return !WORLD_BLOCKERS.some((blocker) => overlaps(feet, blocker));
}

type RotorLayer = { canvas: HTMLCanvasElement; x: number; y: number; center: number; phase: number };
type WorldLayers = {
  base: HTMLCanvasElement;
  water: HTMLCanvasElement;
  lights: HTMLCanvasElement;
  trees: HTMLCanvasElement;
  rotors: RotorLayer[];
};

const ROTORS = [
  { x: 1375, y: 109, radius: 65, phase: 0 },
  { x: 1111, y: 780, radius: 52, phase: 420 },
];

const LIGHT_REGIONS: Rect[] = [
  { x: 210, y: 36, w: 190, h: 180 }, { x: 100, y: 470, w: 220, h: 230 },
  { x: 500, y: 480, w: 240, h: 200 }, { x: 570, y: 710, w: 320, h: 190 },
  { x: 640, y: 270, w: 380, h: 170 }, { x: 970, y: 445, w: 170, h: 225 },
  { x: 1040, y: 170, w: 130, h: 150 }, { x: 1280, y: 70, w: 200, h: 190 },
];

const TREE_REGIONS = [
  { x: 392, y: 214, rx: 42, ry: 50 }, { x: 820, y: 164, rx: 44, ry: 48 },
  { x: 1135, y: 240, rx: 48, ry: 52 }, { x: 310, y: 600, rx: 48, ry: 56 },
  { x: 470, y: 665, rx: 50, ry: 58 }, { x: 880, y: 642, rx: 48, ry: 56 },
  { x: 1180, y: 658, rx: 48, ry: 55 }, { x: 1350, y: 604, rx: 48, ry: 55 },
];

const STEAM_MASKS: Rect[] = [
  { x: 731, y: 690, w: 45, h: 67 },
  { x: 744, y: 267, w: 37, h: 58 },
];

const STEAM_SOURCES = [
  { x: 750, y: 746, phase: 0, height: 48 },
  { x: 759, y: 309, phase: .43, height: 39 },
];

function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD.width;
  canvas.height = WORLD.height;
  return canvas;
}

function insideRect(x: number, y: number, rect: Rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function bladeMetric(x: number, y: number, rotor: (typeof ROTORS)[number]) {
  const dx = x - rotor.x;
  const dy = y - rotor.y;
  let best: { parallel: number; perpendicular: number; px: number; py: number } | null = null;
  for (let arm = 0; arm < 4; arm += 1) {
    const angle = Math.PI / 4 + arm * Math.PI / 2;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const parallel = dx * ux + dy * uy;
    const perpendicular = Math.abs(-dx * uy + dy * ux);
    if (parallel > 7 && parallel < rotor.radius + 5 && (!best || perpendicular < best.perpendicular)) {
      best = { parallel, perpendicular, px: -uy, py: ux };
    }
  }
  return best;
}

function prepareWorldLayers(world: HTMLImageElement): WorldLayers {
  const source = makeCanvas();
  source.getContext('2d')!.drawImage(world, 0, 0);
  const sourceImage = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, WORLD.width, WORLD.height);
  const original = sourceImage.data;
  const baseImage = new ImageData(new Uint8ClampedArray(original), WORLD.width, WORLD.height);
  const waterImage = new ImageData(WORLD.width, WORLD.height);
  const lightImage = new ImageData(WORLD.width, WORLD.height);
  const treeImage = new ImageData(WORLD.width, WORLD.height);
  const blueWater = new Uint8Array(WORLD.width * WORLD.height);

  for (let pixel = 0; pixel < blueWater.length; pixel += 1) {
    const index = pixel * 4;
    const red = original[index];
    const green = original[index + 1];
    const blue = original[index + 2];
    if (blue > 100 && blue > red * 1.25 && blue > green * 1.04 && green > 62) blueWater[pixel] = 1;
  }

  for (let y = 0; y < WORLD.height; y += 1) {
    for (let x = 0; x < WORLD.width; x += 1) {
      const pixel = y * WORLD.width + x;
      const index = pixel * 4;
      const red = original[index];
      const green = original[index + 1];
      const blue = original[index + 2];
      let water = Boolean(blueWater[pixel]);
      if (!water && red > 165 && green > 175 && blue > 175) {
        for (let oy = -3; oy <= 3 && !water; oy += 1) {
          for (let ox = -3; ox <= 3; ox += 1) {
            const nearX = x + ox;
            const nearY = y + oy;
            if (nearX >= 0 && nearX < WORLD.width && nearY >= 0 && nearY < WORLD.height && blueWater[nearY * WORLD.width + nearX]) {
              water = true;
              break;
            }
          }
        }
      }
      if (water) {
        waterImage.data.set(original.subarray(index, index + 4), index);
        baseImage.data[index] = 36 + ((x + y) % 3) * 3;
        baseImage.data[index + 1] = 126 + ((x + y) % 4) * 3;
        baseImage.data[index + 2] = 166 + ((x + y) % 5) * 3;
      }

      const inLightRegion = LIGHT_REGIONS.some((region) => insideRect(x, y, region));
      const warmLight = red > 176 && green > 108 && green < 225 && blue < 130 && red > green * 1.03;
      const arcaneLight = (blue > 145 && red > 85 && blue > green * 1.12) || (green > 150 && blue > 145 && red < 145);
      if (inLightRegion && (warmLight || arcaneLight)) {
        lightImage.data.set(original.subarray(index, index + 4), index);
        baseImage.data[index] = Math.round(red * .42);
        baseImage.data[index + 1] = Math.round(green * .42);
        baseImage.data[index + 2] = Math.round(blue * .42);
      }

      const treeRegion = TREE_REGIONS.find((region) => {
        const nx = (x - region.x) / region.rx;
        const ny = (y - region.y) / region.ry;
        return nx * nx + ny * ny <= 1;
      });
      const leafy = green > red * 1.12 && green > blue * 1.07 && green > 55 && green < 158;
      if (treeRegion && leafy) {
        treeImage.data.set(original.subarray(index, index + 4), index);
        const sampleX = clamp(x + 3, 0, WORLD.width - 1);
        const sampleIndex = (y * WORLD.width + sampleX) * 4;
        baseImage.data.set(original.subarray(sampleIndex, sampleIndex + 4), index);
      }

      for (const mask of STEAM_MASKS) {
        if (!insideRect(x, y, mask)) continue;
        const paleSmoke = red > 125 && green > 125 && blue > 115 && Math.max(red, green, blue) - Math.min(red, green, blue) < 62;
        if (paleSmoke) {
          const sampleX = clamp(mask.x + mask.w + ((x - mask.x) % 18), 0, WORLD.width - 1);
          const sampleIndex = (y * WORLD.width + sampleX) * 4;
          baseImage.data.set(original.subarray(sampleIndex, sampleIndex + 4), index);
        }
      }
    }
  }

  const rotors: RotorLayer[] = ROTORS.map((rotor, rotorIndex) => {
    const size = rotor.radius * 2 + 14;
    const rotorCanvas = document.createElement('canvas');
    rotorCanvas.width = size;
    rotorCanvas.height = size;
    const rotorImage = new ImageData(size, size);
    const center = Math.floor(size / 2);
    for (let localY = 0; localY < size; localY += 1) {
      for (let localX = 0; localX < size; localX += 1) {
        const worldX = Math.round(rotor.x + localX - center);
        const worldY = Math.round(rotor.y + localY - center);
        if (worldX < 0 || worldY < 0 || worldX >= WORLD.width || worldY >= WORLD.height) continue;
        const metric = bladeMetric(worldX, worldY, rotor);
        if (!metric) continue;
        const width = metric.parallel > rotor.radius * .55 ? 13 : 6;
        if (metric.perpendicular > width) continue;
        const sourceIndex = (worldY * WORLD.width + worldX) * 4;
        const targetIndex = (localY * size + localX) * 4;
        const red = original[sourceIndex];
        const green = original[sourceIndex + 1];
        const blue = original[sourceIndex + 2];
        const likelyBlade = (red > 115 && green > 82 && blue < 125) || (red > 50 && red > green * 1.07 && blue < 82);
        if (likelyBlade) rotorImage.data.set(original.subarray(sourceIndex, sourceIndex + 4), targetIndex);

        const sampleDistance = width + 7;
        const sampleX = clamp(Math.round(worldX + metric.px * sampleDistance), 0, WORLD.width - 1);
        const sampleY = clamp(Math.round(worldY + metric.py * sampleDistance), 0, WORLD.height - 1);
        const sampleIndex = (sampleY * WORLD.width + sampleX) * 4;
        baseImage.data.set(original.subarray(sampleIndex, sampleIndex + 4), sourceIndex);
      }
    }
    rotorCanvas.getContext('2d')!.putImageData(rotorImage, 0, 0);
    return { canvas: rotorCanvas, x: rotor.x, y: rotor.y, center, phase: rotorIndex * 420 };
  });

  const base = makeCanvas();
  const water = makeCanvas();
  const lights = makeCanvas();
  const trees = makeCanvas();
  base.getContext('2d')!.putImageData(baseImage, 0, 0);
  water.getContext('2d')!.putImageData(waterImage, 0, 0);
  lights.getContext('2d')!.putImageData(lightImage, 0, 0);
  trees.getContext('2d')!.putImageData(treeImage, 0, 0);
  return { base, water, lights, trees, rotors };
}

function drawSteam(context: CanvasRenderingContext2D, time: number) {
  for (const source of STEAM_SOURCES) {
    for (let puff = 0; puff < 5; puff += 1) {
      const progress = (time / 2300 + source.phase + puff / 5) % 1;
      const drift = Math.round(Math.sin(progress * 5.8 + source.phase * 4) * 6);
      const size = 4 + Math.round(progress * 7);
      context.globalAlpha = Math.max(0, (1 - progress) * .86);
      context.fillStyle = progress > .48 ? '#d7ded7' : '#f0ead8';
      context.fillRect(Math.round(source.x + drift - size / 2), Math.round(source.y - progress * source.height), size, size);
      if (size > 7) context.fillRect(Math.round(source.x + drift + size / 3), Math.round(source.y - progress * source.height - 3), Math.round(size * .65), Math.round(size * .55));
    }
  }
}

function drawAnimatedWorld(context: CanvasRenderingContext2D, layers: WorldLayers, time: number) {
  context.drawImage(layers.base, 0, 0);
  const waterX = Math.floor(time / 240) % 4;
  const waterY = Math.floor(time / 420) % 3;
  context.globalAlpha = .97;
  context.drawImage(layers.water, waterX - 2, waterY - 1);

  const sway = Math.round(Math.sin(time / 700) * 2);
  context.globalAlpha = 1;
  context.drawImage(layers.trees, sway, 0);

  const lightPulse = .32 + (Math.sin(time / 620) + 1) * .34;
  context.globalAlpha = lightPulse;
  context.globalCompositeOperation = 'screen';
  context.drawImage(layers.lights, 0, 0);
  context.globalCompositeOperation = 'source-over';

  for (const rotor of layers.rotors) {
    const step = Math.floor((time + rotor.phase) / 150) % 24;
    context.save();
    context.translate(rotor.x, rotor.y);
    context.rotate(step * Math.PI / 12);
    context.globalAlpha = 1;
    context.drawImage(rotor.canvas, -rotor.center, -rotor.center);
    context.restore();
  }

  context.globalAlpha = 1;
  drawSteam(context, time);
  context.globalAlpha = 1;
}

export function ProjectWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapPlayerRef = useRef<HTMLSpanElement>(null);
  const positionRef = useRef<Point>({ ...START });
  const keysRef = useRef(new Set<string>());
  const directionRef = useRef<Direction>('up');
  const joystickVectorRef = useRef<Point>({ x: 0, y: 0 });
  const joystickKnobRef = useRef<HTMLSpanElement>(null);
  const nearbyRef = useRef<Project | null>(PROJECTS[10]);
  const modalOpenRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [nearbyProject, setNearbyProject] = useState<Project | null>(PROJECTS[10]);
  const [activeProject, setActiveProject] = useState<Project>(PROJECTS[10]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [area, setArea] = useState('Glassroot Fields');
  const areaRef = useRef(area);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      setDiscovered(new Set(JSON.parse(localStorage.getItem('nathan-world-discoveries-v2') || '[]') as string[]));
    } catch {
      setDiscovered(new Set());
    }
  }, []);

  useEffect(() => {
    modalOpenRef.current = projectOpen;
    if (projectOpen) keysRef.current.clear();
  }, [projectOpen]);

  useEffect(() => {
    if (muted) return;
    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audio = new AudioContextCtor();
    const gain = audio.createGain();
    gain.gain.value = 0.014;
    gain.connect(audio.destination);
    const notes = [65.41, 98, 130.81].map((frequency, index) => {
      const oscillator = audio.createOscillator();
      const voice = audio.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      voice.gain.value = index === 0 ? 0.6 : 0.12;
      oscillator.connect(voice).connect(gain);
      oscillator.start();
      return oscillator;
    });
    return () => {
      gain.gain.setTargetAtTime(0, audio.currentTime, 0.03);
      notes.forEach((note) => note.stop(audio.currentTime + 0.1));
      window.setTimeout(() => void audio.close(), 130);
    };
  }, [muted]);

  const interact = useCallback(() => {
    const project = nearbyRef.current;
    if (!project) return;
    setActiveProject(project);
    setProjectOpen(true);
    setDiscovered((current) => {
      const next = new Set(current).add(project.id);
      try {
        localStorage.setItem('nathan-world-discoveries-v2', JSON.stringify([...next]));
      } catch {
        // Progress is intentionally device-local and optional.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        keysRef.current.add(key);
      }
      if ((key === 'e' || key === 'enter') && !event.repeat) interact();
      if (key === 'm' && !event.repeat) setMapOpen((value) => !value);
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    const clearKeys = () => keysRef.current.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, [interact]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const world = new Image();
    const player = new Image();
    let loaded = 0;
    let frame = 0;
    let lastTime = performance.now();
    let terrainPixels: Uint8ClampedArray | null = null;
    let worldLayers: WorldLayers | null = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const markLoaded = () => {
      loaded += 1;
      if (loaded === 2) setReady(true);
    };
    world.onload = () => {
      worldLayers = prepareWorldLayers(world);
      const collisionCanvas = document.createElement('canvas');
      collisionCanvas.width = WORLD.width;
      collisionCanvas.height = WORLD.height;
      const collisionContext = collisionCanvas.getContext('2d', { willReadFrequently: true });
      if (collisionContext) {
        collisionContext.drawImage(world, 0, 0);
        terrainPixels = collisionContext.getImageData(0, 0, WORLD.width, WORLD.height).data;
      }
      markLoaded();
    };
    player.onload = markLoaded;
    world.onerror = markLoaded;
    player.onerror = markLoaded;
    world.src = '/world/nathans-world-map.png';
    player.src = '/world/explorer-sheet.png';

    const resize = () => {
      const viewportWidth = Math.round(window.visualViewport?.width ?? window.innerWidth);
      const viewportHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
      const mobileControls = window.matchMedia('(pointer: coarse)').matches || viewportWidth <= 900;
      const renderScale = mobileControls ? 1 : 2;
      canvas.width = Math.ceil(viewportWidth / renderScale);
      canvas.height = Math.ceil(viewportHeight / renderScale);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      context.imageSmoothingEnabled = false;
    };

    const terrainBlocks = (point: Point) => {
      if (!terrainPixels) return false;
      const samples = [[0, 0], [-3, 0], [3, 0]];
      return samples.some(([offsetX, offsetY]) => {
        const x = clamp(Math.round(point.x + offsetX), 0, WORLD.width - 1);
        const y = clamp(Math.round(point.y + offsetY), 0, WORLD.height - 1);
        const index = (y * WORLD.width + x) * 4;
        const red = terrainPixels![index];
        const green = terrainPixels![index + 1];
        const blue = terrainPixels![index + 2];
        return blue > 112 && blue > red * 1.34 && blue > green * 1.08 && green > 68;
      });
    };

    const canStand = (point: Point) => clearsBlockers(point) && !terrainBlocks(point);

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      let dx = 0;
      let dy = 0;
      const keys = keysRef.current;
      if (!modalOpenRef.current) {
        if (keys.has('w') || keys.has('arrowup')) dy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) dy += 1;
        if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
        if (keys.has('d') || keys.has('arrowright')) dx += 1;
        dx += joystickVectorRef.current.x;
        dy += joystickVectorRef.current.y;
      }
      const walking = Boolean(dx || dy);

      if (walking) {
        const length = Math.hypot(dx, dy);
        dx /= length;
        dy /= length;
        directionRef.current = Math.abs(dx) > Math.abs(dy)
          ? dx < 0 ? 'left' : 'right'
          : dy < 0 ? 'up' : 'down';
        const current = positionRef.current;
        const nextX = { x: clamp(current.x + dx * PLAYER_SPEED * delta, 18, WORLD.width - 18), y: current.y };
        if (canStand(nextX)) current.x = nextX.x;
        const nextY = { x: current.x, y: clamp(current.y + dy * PLAYER_SPEED * delta, 18, WORLD.height - 18) };
        if (canStand(nextY)) current.y = nextY.y;
      }

      const position = positionRef.current;
      let nearest: Project | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const project of PROJECTS) {
        const distance = Math.hypot(position.x - project.approach.x, position.y - project.approach.y);
        if (distance < INTERACTION_RADIUS && distance < nearestDistance) {
          nearest = project;
          nearestDistance = distance;
        }
      }
      if (nearbyRef.current?.id !== nearest?.id) {
        nearbyRef.current = nearest;
        setNearbyProject(nearest);
      }

      const nextArea = areaAt(position);
      if (areaRef.current !== nextArea) {
        areaRef.current = nextArea;
        setArea(nextArea);
      }
      if (mapPlayerRef.current) {
        mapPlayerRef.current.style.left = `${(position.x / WORLD.width) * 100}%`;
        mapPlayerRef.current.style.top = `${(position.y / WORLD.height) * 100}%`;
      }

      const viewWidth = canvas.width;
      const viewHeight = canvas.height;
      const cameraX = clamp(Math.round(position.x - viewWidth / 2), 0, Math.max(0, WORLD.width - viewWidth));
      const cameraY = clamp(Math.round(position.y - viewHeight / 2), 0, Math.max(0, WORLD.height - viewHeight));
      context.clearRect(0, 0, viewWidth, viewHeight);
      if (worldLayers) {
        context.save();
        context.translate(-cameraX, -cameraY);
        drawAnimatedWorld(context, worldLayers, reducedMotion ? 0 : time);
        context.restore();
      } else if (world.complete && world.naturalWidth) {
        context.drawImage(world, -cameraX, -cameraY);
      }

      if (nearest) {
        const pulse = Math.floor(time / 360) % 2;
        const x = Math.round(nearest.approach.x - cameraX);
        const y = Math.round(nearest.approach.y - cameraY - 20 - pulse * 2);
        context.fillStyle = '#15100c';
        context.fillRect(x - 6, y - 7, 12, 12);
        context.fillStyle = nearest.accent;
        context.fillRect(x - 4, y - 5, 8, 8);
        context.fillStyle = '#fff6d8';
        context.fillRect(x - 1, y - 3, 2, 4);
        context.fillRect(x - 1, y + 2, 2, 2);
      }

      if (player.complete && player.naturalWidth) {
        const cellWidth = player.width / 4;
        const cellHeight = player.height / 4;
        const column = walking ? [1, 2, 3, 2][Math.floor(time / 125) % 4] : 0;
        const row = directionRow[directionRef.current];
        context.drawImage(
          player,
          column * cellWidth,
          row * cellHeight,
          cellWidth,
          cellHeight,
          Math.round(position.x - cameraX - 22),
          Math.round(position.y - cameraY - 43),
          44,
          58,
        );
      }
      frame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
    };
  }, []);

  const moveJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const maxDistance = rect.width * .31;
    const rawX = event.clientX - (rect.left + rect.width / 2);
    const rawY = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(rawX, rawY);
    const strength = Math.min(distance, maxDistance);
    const unitX = distance ? rawX / distance : 0;
    const unitY = distance ? rawY / distance : 0;
    const deadZone = distance < 8;
    joystickVectorRef.current = deadZone ? { x: 0, y: 0 } : { x: unitX, y: unitY };
    if (joystickKnobRef.current) {
      const x = deadZone ? 0 : unitX * strength;
      const y = deadZone ? 0 : unitY * strength;
      joystickKnobRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  };

  const startJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    moveJoystick(event);
  };

  const dragJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) moveJoystick(event);
  };

  const stopJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    joystickVectorRef.current = { x: 0, y: 0 };
    if (joystickKnobRef.current) joystickKnobRef.current.style.transform = 'translate(0, 0)';
  };
  const progress = `${discovered.size}/${PROJECTS.length}`;

  return (
    <main className="pixel-world-shell" aria-label="Nathan's playable project world">
      <canvas ref={canvasRef} className="pixel-world-canvas" role="img" aria-label="A top-down pixel-art world containing Nathan's project landmarks">
        Explore Nathan&apos;s projects as a pixel-art world.
      </canvas>

      <header className="pixel-hud">
        <a className="pixel-brand" href="https://github.com/Nathan-W123" target="_blank" rel="noreferrer">
          <span>NW</span>
          <span><b>NATHAN&apos;S WORLD</b><small>PLAYABLE PROJECT ARCHIVE</small></span>
        </a>
        <div key={area} className="pixel-location"><small>NOW ENTERING</small><b>{area.toUpperCase()}</b></div>
        <div className="pixel-hud-actions">
          <span className="pixel-progress">{progress} DISCOVERED</span>
          <button className="pixel-icon-button" type="button" onClick={() => setMapOpen((value) => !value)} aria-label="Toggle world map"><Map /></button>
          <button className="pixel-icon-button" type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Turn ambient sound on' : 'Mute ambient sound'}>{muted ? <VolumeX /> : <Volume2 />}</button>
        </div>
      </header>

      {mapOpen && (
        <aside className="pixel-map" aria-label="World map">
          <div className="pixel-map-image">
            {PROJECTS.map((project) => (
              <span
                key={project.id}
                className={`pixel-map-dot ${discovered.has(project.id) ? 'is-found' : ''}`}
                style={{ left: `${(project.landmark.x / WORLD.width) * 100}%`, top: `${(project.landmark.y / WORLD.height) * 100}%` }}
                title={project.location}
              />
            ))}
            <span ref={mapPlayerRef} className="pixel-map-player" />
          </div>
          <div className="pixel-map-caption"><b>REGION MAP</b><small>GOLD MARKS PLACES YOU&apos;VE VISITED</small></div>
        </aside>
      )}

      <div className={`pixel-interact ${nearbyProject ? 'is-visible' : ''}`} aria-hidden={!nearbyProject}>
        <button type="button" onClick={interact} tabIndex={nearbyProject ? 0 : -1}>
          <kbd>E</kbd>
          <span><b>Enter {nearbyProject?.location ?? 'landmark'}</b><small>PROJECT: {nearbyProject?.projectName ?? 'Unknown'}</small></span>
        </button>
      </div>

      <div className="pixel-help"><span><kbd>WASD</kbd> MOVE</span><span><kbd>E</kbd> ENTER</span><span><kbd>M</kbd> MAP</span></div>

      <div
        className="pixel-joystick"
        role="group"
        aria-label="Drag to move"
        onPointerDown={startJoystick}
        onPointerMove={dragJoystick}
        onPointerUp={stopJoystick}
        onPointerCancel={stopJoystick}
        onLostPointerCapture={stopJoystick}
      >
        <span className="pixel-joystick-arrows" aria-hidden="true">＋</span>
        <span ref={joystickKnobRef} className="pixel-joystick-knob" aria-hidden="true" />
      </div>

      <button className="pixel-mobile-action" type="button" onClick={interact} disabled={!nearbyProject} aria-label={nearbyProject ? `Enter ${nearbyProject.location}` : 'No nearby location'}>
        <b>E</b><span>{nearbyProject ? 'ENTER' : 'ACTION'}</span>
      </button>

      {!ready && <div className="pixel-loading">DRAWING THE WORLD…</div>}

      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="world-dialog" showCloseButton>
          <div className="world-dialog-scene" aria-hidden="true">
            <img src="/world/nathans-world-map.png" alt="" style={{ objectPosition: `${(activeProject.landmark.x / WORLD.width) * 100}% ${(activeProject.landmark.y / WORLD.height) * 100}%` }} />
            <span>DISCOVERY {activeProject.number}</span>
          </div>
          <div className="world-dialog-copy">
            <DialogHeader className="world-dialog-header">
              <div className="world-dialog-eyebrow" style={{ color: activeProject.accent }}>PROJECT: {activeProject.projectName.toUpperCase()}</div>
              <DialogTitle>{activeProject.location}</DialogTitle>
              <div className="world-dialog-category">{activeProject.category}</div>
              <DialogDescription>{activeProject.summary}</DialogDescription>
            </DialogHeader>
            <ul className="world-dialog-details">
              {activeProject.details.map((detail) => <li key={detail}><i style={{ backgroundColor: activeProject.accent }} />{detail}</li>)}
            </ul>
            <div className="world-dialog-actions">
              <Button nativeButton={false} render={<a href={activeProject.href} target="_blank" rel="noreferrer" />} className="world-dialog-primary"><FolderGit2 /> Explore project <ExternalLink /></Button>
              <Button variant="ghost" onClick={() => setProjectOpen(false)}>Return to world</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

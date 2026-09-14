'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

const WORLD_BLOCKERS: Rect[] = [
  { x: 0, y: 421, w: 424, h: 88 },
  { x: 499, y: 428, w: 710, h: 84 },
  { x: 1269, y: 418, w: 267, h: 112 },
  ...PROJECTS.map((project) => project.building),
];

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

const WATER_GLINTS: Point[] = [
  { x: 17, y: 477 }, { x: 74, y: 454 }, { x: 353, y: 460 }, { x: 390, y: 486 },
  { x: 546, y: 462 }, { x: 642, y: 479 }, { x: 780, y: 472 }, { x: 876, y: 486 },
  { x: 1124, y: 470 }, { x: 1288, y: 454 }, { x: 1420, y: 505 }, { x: 1490, y: 352 },
  { x: 1452, y: 66 }, { x: 1510, y: 188 }, { x: 1360, y: 330 }, { x: 1510, y: 690 },
  { x: 1435, y: 930 }, { x: 1235, y: 1005 }, { x: 960, y: 1008 }, { x: 314, y: 1003 },
];

const GLOW_POINTS = [
  { x: 205, y: 541, color: '#77dfff', phase: 0 }, { x: 158, y: 684, color: '#876dff', phase: .7 },
  { x: 296, y: 675, color: '#8c72ff', phase: 1.3 }, { x: 1044, y: 510, color: '#ba77ff', phase: .4 },
  { x: 1008, y: 604, color: '#996cff', phase: 1.1 }, { x: 1080, y: 621, color: '#c48bff', phase: 1.8 },
  { x: 307, y: 112, color: '#ffd471', phase: .2 }, { x: 617, y: 580, color: '#a6f0a7', phase: 1.5 },
];

const STEAM_SOURCES = [
  { x: 746, y: 300, phase: 0 }, { x: 925, y: 331, phase: .35 },
  { x: 700, y: 759, phase: .7 }, { x: 1095, y: 217, phase: .15 },
];

const TREE_SWAY = [
  { x: 433, y: 258, color: '#245e3d' }, { x: 833, y: 197, color: '#2e7347' },
  { x: 1153, y: 282, color: '#28613d' }, { x: 342, y: 650, color: '#144a39' },
  { x: 475, y: 711, color: '#1b533a' }, { x: 887, y: 688, color: '#245b39' },
  { x: 1182, y: 705, color: '#286443' }, { x: 1362, y: 646, color: '#2b6845' },
];

function drawWindmill(context: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number) {
  const angle = Math.floor(time / 160) % 12 * (Math.PI / 6);
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  for (let arm = 0; arm < 4; arm += 1) {
    context.rotate(Math.PI / 2);
    context.fillStyle = '#513d27';
    context.fillRect(-3, -radius, 6, radius - 3);
    context.fillStyle = '#e7d6a1';
    context.fillRect(-1, -radius + 2, 3, radius - 7);
    context.fillRect(2, -radius + 4, 5, Math.max(5, Math.round(radius * .36)));
  }
  context.fillStyle = '#3b2d21';
  context.fillRect(-5, -5, 10, 10);
  context.fillStyle = '#d39d4a';
  context.fillRect(-2, -2, 4, 4);
  context.restore();
}

function drawAmbientWorld(context: CanvasRenderingContext2D, time: number) {
  const waterFrame = Math.floor(time / 220) % 4;
  context.save();
  for (let index = 0; index < WATER_GLINTS.length; index += 1) {
    const point = WATER_GLINTS[index];
    const offset = (waterFrame + index) % 4;
    context.globalAlpha = .42 + offset * .08;
    context.fillStyle = offset % 2 ? '#b8eced' : '#82d6e6';
    context.fillRect(point.x + offset * 2, point.y, 7 + (index % 3) * 2, 2);
    context.fillRect(point.x - 5 + offset, point.y + 5, 4, 1);
  }

  const breeze = Math.round(Math.sin(time / 620));
  context.globalAlpha = .72;
  for (const tree of TREE_SWAY) {
    context.fillStyle = '#12392f';
    context.fillRect(tree.x - 4 + breeze, tree.y - 2, 9, 3);
    context.fillStyle = tree.color;
    context.fillRect(tree.x - 6 + breeze, tree.y - 5, 7, 4);
    context.fillRect(tree.x + 1 + breeze, tree.y - 7, 6, 5);
  }

  for (const source of STEAM_SOURCES) {
    for (let puff = 0; puff < 3; puff += 1) {
      const progress = (time / 1900 + source.phase + puff / 3) % 1;
      const drift = Math.round(Math.sin(progress * Math.PI * 2 + source.phase) * 3);
      context.globalAlpha = (1 - progress) * .65;
      context.fillStyle = progress > .55 ? '#dfe8de' : '#f4ead3';
      const size = progress > .5 ? 4 : 3;
      context.fillRect(source.x + drift, source.y - progress * 30, size, size);
      if (progress > .45) context.fillRect(source.x + drift + 4, source.y - progress * 30 - 2, 2, 2);
    }
  }

  for (const light of GLOW_POINTS) {
    const pulse = .35 + (Math.sin(time / 520 + light.phase) + 1) * .2;
    context.globalAlpha = pulse;
    context.fillStyle = light.color;
    context.fillRect(light.x - 5, light.y - 1, 11, 3);
    context.fillRect(light.x - 1, light.y - 5, 3, 11);
    context.globalAlpha = .9;
    context.fillRect(light.x, light.y, 2, 2);
  }

  context.globalAlpha = .78;
  drawWindmill(context, 1397, 117, 29, time);
  drawWindmill(context, 1092, 773, 19, time + 300);
  context.restore();
}

export function ProjectWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapPlayerRef = useRef<HTMLSpanElement>(null);
  const positionRef = useRef<Point>({ ...START });
  const keysRef = useRef(new Set<string>());
  const directionRef = useRef<Direction>('up');
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
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const markLoaded = () => {
      loaded += 1;
      if (loaded === 2) setReady(true);
    };
    world.onload = () => {
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
      canvas.width = Math.ceil(window.innerWidth / 2);
      canvas.height = Math.ceil(window.innerHeight / 2);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.imageSmoothingEnabled = false;
    };

    const terrainBlocks = (point: Point) => {
      if (!terrainPixels) return false;
      const samples = [[0, 0], [-5, -7], [5, -7], [-5, 2], [5, 2]];
      return samples.some(([offsetX, offsetY]) => {
        const x = clamp(Math.round(point.x + offsetX), 0, WORLD.width - 1);
        const y = clamp(Math.round(point.y + offsetY), 0, WORLD.height - 1);
        const index = (y * WORLD.width + x) * 4;
        const red = terrainPixels![index];
        const green = terrainPixels![index + 1];
        const blue = terrainPixels![index + 2];
        const water = blue > 105 && blue > red * 1.28 && blue > green * 1.06;
        const denseCanopy = green > red * 1.18 && green > blue * 1.12 && green < 88 && red < 67;
        const mountainEdge = y < 34 || (y < 90 && red > 140 && green > 150 && blue > 160);
        return water || denseCanopy || mountainEdge;
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
      if (world.complete && world.naturalWidth) context.drawImage(world, -cameraX, -cameraY);

      context.save();
      context.translate(-cameraX, -cameraY);
      drawAmbientWorld(context, reducedMotion ? 0 : time);
      context.restore();

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
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const setTouchKey = (key: string, down: boolean) => {
    if (down) keysRef.current.add(key);
    else keysRef.current.delete(key);
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

      <div className="pixel-touch" aria-label="Movement controls">
        <button type="button" onPointerDown={() => setTouchKey('w', true)} onPointerUp={() => setTouchKey('w', false)} onPointerCancel={() => setTouchKey('w', false)} aria-label="Move up">▲</button>
        <button type="button" onPointerDown={() => setTouchKey('a', true)} onPointerUp={() => setTouchKey('a', false)} onPointerCancel={() => setTouchKey('a', false)} aria-label="Move left">◀</button>
        <button type="button" onPointerDown={() => setTouchKey('s', true)} onPointerUp={() => setTouchKey('s', false)} onPointerCancel={() => setTouchKey('s', false)} aria-label="Move down">▼</button>
        <button type="button" onPointerDown={() => setTouchKey('d', true)} onPointerUp={() => setTouchKey('d', false)} onPointerCancel={() => setTouchKey('d', false)} aria-label="Move right">▶</button>
      </div>

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
              <Button render={<a href={activeProject.href} target="_blank" rel="noreferrer" />} className="world-dialog-primary"><FolderGit2 /> Explore project <ExternalLink /></Button>
              <Button variant="ghost" onClick={() => setProjectOpen(false)}>Return to world</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

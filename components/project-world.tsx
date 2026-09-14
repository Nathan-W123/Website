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

const WORLD = { width: 2200, height: 1500 };
const PLAYER_SPEED = 235;

type Point = { x: number; y: number };
type Direction = 'up' | 'down' | 'left' | 'right';
type Landmark =
  | 'observatory'
  | 'chess'
  | 'arena'
  | 'terminal'
  | 'kiosk'
  | 'radio'
  | 'tunnel'
  | 'molecule'
  | 'greenhouse'
  | 'quantum'
  | 'portal';

type Project = {
  id: string;
  number: string;
  name: string;
  kind: string;
  href: string;
  summary: string;
  details: string[];
  biome: string;
  x: number;
  y: number;
  landmark: Landmark;
  sigil: string;
  accent: string;
};

const PROJECTS: Project[] = [
  {
    id: 'black-hole', number: '01', name: 'Black Hole Sim', kind: 'ASTROPHYSICS / PYTHON',
    href: 'https://github.com/Nathan-W123/Black-Hole-Sim',
    summary: 'A physically validated general-relativistic simulator for timelike and null geodesics around a Schwarzschild black hole.',
    details: ['Backward ray tracing from an arbitrary camera', 'Novikov–Thorne accretion disk with Doppler shifts', 'Lensed starfields, photon rings, and secondary images'],
    biome: 'Astral Wilds', x: 1100, y: 310, landmark: 'observatory', sigil: '◉', accent: '#8df0d1',
  },
  {
    id: 'gambit', number: '02', name: 'Gambit', kind: 'MACHINE LEARNING / PYTHON',
    href: 'https://github.com/Nathan-W123/Gambit',
    summary: 'A neural network trained on human games to play bullet chess through the official Lichess Bot API.',
    details: ['Policy + value residual convolutional network', 'Alpha-beta search tuned for bullet time controls', 'ONNX inference path and legal-move masking'],
    biome: 'Strategy Gardens', x: 450, y: 360, landmark: 'chess', sigil: '♞', accent: '#f0c977',
  },
  {
    id: 'siege', number: '03', name: 'Siege', kind: 'REINFORCEMENT LEARNING / PYTHON',
    href: 'https://github.com/Nathan-W123/Siege',
    summary: 'An educational reinforcement-learning project that learns strategy inside a custom battle simulator.',
    details: ['Config-driven simulator and scripted opponents', 'Masked policy with league self-play', 'Training reports and a live WebGL network viewer'],
    biome: 'Strategy Gardens', x: 280, y: 680, landmark: 'arena', sigil: '⬢', accent: '#ffb96f',
  },
  {
    id: 'kumi', number: '04', name: 'Kumi', kind: 'AGENT SYSTEMS / TYPESCRIPT',
    href: 'https://github.com/Nathan-W123/Kumi',
    summary: 'An agent-neutral coordination layer that schedules, isolates, validates, and integrates parallel software work.',
    details: ['Isolated worktrees and conflict-aware scheduling', 'Human and multi-agent task coordination', 'Validation, approvals, audit history, and atomic promotion'],
    biome: 'Terminal Grove', x: 1750, y: 340, landmark: 'terminal', sigil: 'K', accent: '#6debb0',
  },
  {
    id: 'kumi-site', number: '05', name: 'Kumi Website', kind: 'WEB / HTML',
    href: 'https://github.com/Nathan-W123/Kumi-Website',
    summary: 'The public face of Kumi: a fast, framework-free multi-page marketing site with clean URL routing.',
    details: ['Nine hand-authored pages and one shared stylesheet', 'Path-prefix-safe links for embedded previews', 'Accessibility and reduced-motion regression tests'],
    biome: 'Terminal Grove', x: 1930, y: 620, landmark: 'kiosk', sigil: '⌁', accent: '#8bd8c2',
  },
  {
    id: 'voice-agents', number: '06', name: 'Voice Agents', kind: 'VOICE AI / TYPESCRIPT',
    href: 'https://github.com/Nathan-W123/YCHackVoiceAgents',
    summary: 'A TypeScript voice-agent experiment created for a YC hackathon.',
    details: ['Realtime conversational interface', 'Hackathon-scale product experiment', 'Built around expressive voice interaction'],
    biome: 'Terminal Grove', x: 1560, y: 670, landmark: 'radio', sigil: '⌁', accent: '#74d8ef',
  },
  {
    id: 'aero', number: '07', name: 'Aero', kind: 'FLUID DYNAMICS / PYTHON',
    href: 'https://github.com/Nathan-W123/Aero',
    summary: 'A from-scratch 2D and 3D lattice-Boltzmann wind-tunnel simulator for external and internal flows.',
    details: ['D2Q9 and D3Q19 solvers with multiple collision models', 'Analytic geometry and STL voxelization workflows', 'Force, lift, drag, scalar, and thermal observables'],
    biome: 'Wind Coast', x: 390, y: 1160, landmark: 'tunnel', sigil: '≋', accent: '#85dce9',
  },
  {
    id: 'quantize', number: '08', name: 'Quantize', kind: 'MOLECULAR SCIENCE / PYTHON',
    href: 'https://github.com/Nathan-W123/Quantize',
    summary: 'Hybrid molecular-geometry inversion from rotational spectroscopy and quantum chemistry.',
    details: ['SVD separates spectroscopy-sensitive and null directions', 'Quantum gradients stabilize underspecified structures', 'Multi-isotopologue fitting with correction provenance'],
    biome: 'Matter Marsh', x: 880, y: 1190, landmark: 'molecule', sigil: '⌬', accent: '#c7ea85',
  },
  {
    id: 'formulate', number: '09', name: 'Formulate', kind: 'MATERIALS DESIGN / PYTHON',
    href: 'https://github.com/Nathan-W123/Formulate',
    summary: 'A behavior-driven inverse materials engine that maps desired properties to ranked molecules and formulations.',
    details: ['Unit-safe target specifications and uncertainty', 'Search, expert prediction, and Pareto ranking', 'Selective quantum and molecular-dynamics validation'],
    biome: 'Matter Marsh', x: 1320, y: 1170, landmark: 'greenhouse', sigil: '✣', accent: '#d9df72',
  },
  {
    id: 'hf-scf', number: '10', name: 'HF–SCF Engine', kind: 'QUANTUM CHEMISTRY / PYTHON',
    href: 'https://github.com/Nathan-W123/HF-SCF-Engine',
    summary: 'A Hartree–Fock self-consistent field engine with an interactive browser-facing demo.',
    details: ['Quantum-chemistry computation from first principles', 'Self-consistent field iteration', 'Interactive project demo available on the web'],
    biome: 'Matter Marsh', x: 1810, y: 1130, landmark: 'quantum', sigil: 'Ψ', accent: '#d7a6f4',
  },
  {
    id: 'website', number: '11', name: 'Nathan’s World', kind: 'INTERACTIVE WEB / TYPESCRIPT',
    href: 'https://github.com/Nathan-W123/Website',
    summary: 'The world you are standing in: a playable portfolio where every project becomes a place to discover.',
    details: ['Top-down canvas exploration with keyboard and touch controls', 'Biome-based project storytelling', 'A living world designed to grow with new work'],
    biome: 'Crossroads', x: 1100, y: 800, landmark: 'portal', sigil: 'NW', accent: '#f2cf69',
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const hash = (x: number, y: number) => {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const biomeAt = (point: Point) => {
  if (point.y < 770 && point.x < 750) return 'Strategy Gardens';
  if (point.y < 780 && point.x > 1450) return 'Terminal Grove';
  if (point.y > 890 && point.x < 650) return 'Wind Coast';
  if (point.y > 900 && point.x >= 650) return 'Matter Marsh';
  if (point.y < 620) return 'Astral Wilds';
  return 'Crossroads';
};

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = '#e8f4cf') {
  ctx.save();
  ctx.font = '700 12px "Courier New", monospace';
  ctx.textAlign = 'center';
  const width = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(7, 13, 18, .82)';
  ctx.fillRect(Math.round(x - width / 2 - 7), Math.round(y - 12), Math.round(width + 14), 19);
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(x), Math.round(y + 1));
  ctx.restore();
}

function terrainColor(x: number, y: number, detail: number) {
  if (y < 770 && x < 750) return detail > 0.72 ? '#55462e' : '#493c2b';
  if (y < 780 && x > 1450) return detail > 0.72 ? '#183f39' : '#123530';
  if (y > 890 && x < 650) return detail > 0.72 ? '#315660' : '#294b55';
  if (y > 900 && x >= 650) return detail > 0.72 ? '#3f4f36' : '#35442f';
  if (y < 620) return detail > 0.72 ? '#315354' : '#294747';
  return detail > 0.72 ? '#365447' : '#2e493e';
}

function drawTerrain(ctx: CanvasRenderingContext2D) {
  const tile = 32;
  for (let y = 0; y < WORLD.height; y += tile) {
    for (let x = 0; x < WORLD.width; x += tile) {
      const d = hash(x / tile, y / tile);
      ctx.fillStyle = terrainColor(x, y, d);
      ctx.fillRect(x, y, tile, tile);
      if (d > 0.88) {
        const biome = biomeAt({ x, y });
        if (biome === 'Terminal Grove') {
          ctx.fillStyle = '#082a25'; ctx.fillRect(x + 8, y + 7, 17, 22);
          ctx.fillStyle = '#5cc18c'; ctx.fillRect(x + 11, y + 11, 11, 3); ctx.fillRect(x + 11, y + 18, 7, 3);
        } else if (biome === 'Wind Coast') {
          ctx.fillStyle = '#86bdc3'; ctx.fillRect(x + 4, y + 13, 20, 3); ctx.fillRect(x + 13, y + 20, 15, 2);
        } else if (biome === 'Matter Marsh') {
          ctx.fillStyle = '#a9be6d'; ctx.fillRect(x + 14, y + 12, 3, 16); ctx.fillRect(x + 7, y + 9, 8, 5); ctx.fillRect(x + 17, y + 5, 8, 6);
        } else {
          ctx.fillStyle = '#1c302d'; ctx.fillRect(x + 7, y + 6, 19, 23);
          ctx.fillStyle = biome === 'Strategy Gardens' ? '#927743' : '#527a5f'; ctx.fillRect(x + 2, y + 2, 29, 10); ctx.fillRect(x + 7, y - 4, 20, 10);
        }
      } else if (d < 0.075) {
        ctx.fillStyle = y < 620 ? '#a6d5ad' : '#b0b87c'; ctx.fillRect(x + 11, y + 15, 4, 4); ctx.fillRect(x + 18, y + 11, 3, 3);
      }
    }
  }
  const hub = PROJECTS.find((project) => project.id === 'website')!;
  for (const project of PROJECTS) {
    if (project.id === 'website') continue;
    ctx.strokeStyle = '#74806a'; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(hub.x, hub.y + 60);
    ctx.quadraticCurveTo((hub.x + project.x) / 2, hub.y, project.x, project.y + 105); ctx.stroke();
    ctx.strokeStyle = 'rgba(222, 223, 173, .45)'; ctx.lineWidth = 3; ctx.setLineDash([6, 15]); ctx.stroke(); ctx.setLineDash([]);
  }
  for (let i = 0; i < 100; i += 1) {
    const x = hash(i, 31) * WORLD.width; const y = hash(i, 72) * WORLD.height;
    ctx.fillStyle = i % 3 === 0 ? '#f3d784' : '#9bd6a5'; ctx.fillRect(Math.round(x), Math.round(y), 3, 3);
  }
}

function drawLandmark(ctx: CanvasRenderingContext2D, project: Project) {
  const { x, y, landmark } = project;
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(5, 12, 14, .24)'; ctx.fillRect(-82, 59, 164, 31);
  if (landmark === 'observatory') {
    ctx.fillStyle = 'rgba(91, 226, 194, .11)'; ctx.beginPath(); ctx.arc(0, 4, 142, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#17272c'; ctx.fillRect(-112, 22, 224, 112); ctx.fillStyle = '#b8c6b4';
    for (let row = 0; row < 5; row += 1) { const width = 196 - row * 20; ctx.fillRect(-width / 2, 17 - row * 12, width, 12); ctx.fillStyle = row % 2 ? '#879a91' : '#b8c6b4'; }
    ctx.fillStyle = '#10171e'; ctx.fillRect(-29, 75, 58, 59); ctx.save(); ctx.translate(39, -51); ctx.rotate(-0.55);
    ctx.fillStyle = '#d5e4cf'; ctx.fillRect(-18, -55, 36, 108); ctx.fillStyle = '#75928b'; ctx.fillRect(-24, -63, 48, 17); ctx.restore();
  } else if (landmark === 'chess') {
    ctx.fillStyle = '#2a2523'; ctx.fillRect(-78, -30, 156, 120);
    for (let row = 0; row < 6; row += 1) for (let col = 0; col < 8; col += 1) { ctx.fillStyle = (row + col) % 2 ? '#c7a865' : '#eee1b7'; ctx.fillRect(-72 + col * 18, -22 + row * 18, 18, 18); }
    ctx.fillStyle = '#171616'; ctx.font = '54px Georgia'; ctx.fillText('♞', -27, 26);
  } else if (landmark === 'arena') {
    ctx.fillStyle = '#6e4934'; ctx.fillRect(-88, -10, 176, 95); ctx.fillStyle = '#bb7852'; ctx.fillRect(-100, -22, 200, 24);
    ctx.fillStyle = '#d3b579'; ctx.fillRect(-60, 16, 120, 50); ctx.fillStyle = '#3e5b49'; ctx.fillRect(-44, 28, 88, 29); ctx.fillStyle = '#efe0af'; ctx.fillRect(-6, 28, 12, 29);
  } else if (landmark === 'terminal') {
    ctx.fillStyle = '#091b1a'; ctx.fillRect(-68, -74, 136, 164); ctx.fillStyle = '#1d4940'; ctx.fillRect(-77, -84, 154, 19);
    for (let row = 0; row < 5; row += 1) { ctx.fillStyle = row === 2 ? '#79efb3' : '#2e7e63'; ctx.fillRect(-48, -47 + row * 23, 96, 8); }
    ctx.fillStyle = '#76eaae'; ctx.fillRect(-13, 50, 26, 40);
  } else if (landmark === 'kiosk') {
    ctx.fillStyle = '#25493f'; ctx.fillRect(-77, -22, 154, 111); ctx.fillStyle = '#e7dcaa'; ctx.fillRect(-88, -37, 176, 25);
    ctx.fillStyle = '#0b2421'; ctx.fillRect(-55, 3, 110, 48); ctx.fillStyle = '#77e3b1'; ctx.fillRect(-43, 14, 70, 5); ctx.fillRect(-43, 27, 91, 4);
    ctx.fillStyle = '#101c1b'; ctx.fillRect(-18, 61, 36, 28);
  } else if (landmark === 'radio') {
    ctx.fillStyle = '#223f48'; ctx.fillRect(-64, 24, 128, 67); ctx.fillStyle = '#6bb4c7'; ctx.fillRect(-8, -40, 16, 72);
    ctx.strokeStyle = '#a9e5ef'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, -28, 48, 0.3, Math.PI - 0.3); ctx.stroke(); ctx.fillStyle = '#101c23'; ctx.fillRect(-18, 59, 36, 32);
  } else if (landmark === 'tunnel') {
    ctx.fillStyle = '#17333c'; ctx.fillRect(-112, -17, 224, 106); ctx.fillStyle = '#d1dfc9'; ctx.fillRect(-123, -29, 246, 20); ctx.fillStyle = '#77bac5';
    ctx.beginPath(); ctx.arc(-61, 35, 43, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1d3a41'; ctx.fillRect(-66, -2, 10, 74); ctx.fillRect(-98, 30, 74, 10);
    ctx.fillStyle = '#06171d'; ctx.fillRect(16, 13, 77, 55);
  } else if (landmark === 'molecule') {
    ctx.strokeStyle = '#d9eaa3'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-52, 50); ctx.lineTo(0, -34); ctx.lineTo(63, 45); ctx.moveTo(0, -34); ctx.lineTo(5, 74); ctx.stroke();
    for (const node of [[-52, 50], [0, -34], [63, 45], [5, 74]]) { ctx.fillStyle = node[0] === 0 ? '#eacb75' : '#99d887'; ctx.beginPath(); ctx.arc(node[0], node[1], 19, 0, Math.PI * 2); ctx.fill(); }
  } else if (landmark === 'greenhouse') {
    ctx.fillStyle = '#18372f'; ctx.fillRect(-102, 18, 204, 75); ctx.fillStyle = '#a6ce9b'; for (let col = 0; col < 5; col += 1) ctx.fillRect(-91 + col * 39, 29, 30, 48);
    ctx.strokeStyle = '#dce4b0'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-108, 19); ctx.lineTo(-67, -37); ctx.lineTo(67, -37); ctx.lineTo(108, 19); ctx.stroke();
    ctx.fillStyle = '#1c2c24'; ctx.fillRect(-17, 53, 34, 40);
  } else if (landmark === 'quantum') {
    ctx.fillStyle = '#242336'; ctx.fillRect(-84, 3, 168, 88); ctx.strokeStyle = '#d0a4ec'; ctx.lineWidth = 7; ctx.beginPath();
    ctx.ellipse(0, 4, 68, 25, 0.4, 0, Math.PI * 2); ctx.ellipse(0, 4, 68, 25, -0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f0d07a'; ctx.beginPath(); ctx.arc(0, 4, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0f151d'; ctx.fillRect(-18, 55, 36, 36);
  } else {
    ctx.fillStyle = 'rgba(242,207,105,.13)'; ctx.fillRect(-96, -61, 192, 178); ctx.strokeStyle = '#f2cf69'; ctx.lineWidth = 12; ctx.strokeRect(-58, -37, 116, 116);
    ctx.fillStyle = '#142b29'; ctx.fillRect(-44, -23, 88, 88); ctx.fillStyle = '#f2cf69'; ctx.font = '900 30px "Courier New"'; ctx.textAlign = 'center'; ctx.fillText('NW', 0, 31);
  }
  ctx.restore(); drawLabel(ctx, project.name.toUpperCase(), x, y - 127, project.accent);
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Point, direction: Direction, walking: boolean, time: number) {
  const bob = walking ? Math.round(Math.sin(time / 90) * 2) : 0; const x = Math.round(player.x); const y = Math.round(player.y + bob);
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-13, 17, 26, 7); ctx.fillStyle = '#17222b'; ctx.fillRect(-10, 10, 8, 12); ctx.fillRect(2, 10, 8, 12);
  ctx.fillStyle = '#f0c27b'; ctx.fillRect(-12, -15, 24, 22); ctx.fillStyle = '#203e4e'; ctx.fillRect(-14, 2, 28, 15); ctx.fillStyle = '#f1d36c'; ctx.fillRect(-15, 0, 30, 5);
  ctx.fillStyle = '#382c31'; ctx.fillRect(-12, -18, 24, 8); ctx.fillRect(direction === 'left' ? -14 : -12, -12, 5, 9);
  if (direction === 'down') { ctx.fillStyle = '#253138'; ctx.fillRect(-7, -7, 3, 3); ctx.fillRect(4, -7, 3, 3); }
  if (direction === 'up') { ctx.fillStyle = '#382c31'; ctx.fillRect(-10, -11, 20, 8); }
  ctx.restore();
}

export function ProjectWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapPlayerRef = useRef<HTMLSpanElement>(null);
  const positionRef = useRef<Point>({ x: 1100, y: 548 });
  const keysRef = useRef(new Set<string>());
  const directionRef = useRef<Direction>('up');
  const nearbyRef = useRef<Project | null>(PROJECTS[0]);
  const modalOpenRef = useRef(false);
  const [nearbyProject, setNearbyProject] = useState<Project | null>(PROJECTS[0]);
  const [activeProject, setActiveProject] = useState<Project>(PROJECTS[0]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  const [biome, setBiome] = useState('Astral Wilds');
  const biomeRef = useRef(biome);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());

  useEffect(() => {
    try { setDiscovered(new Set(JSON.parse(localStorage.getItem('nathan-world-discoveries') || '[]') as string[])); }
    catch { setDiscovered(new Set()); }
  }, []);

  useEffect(() => { modalOpenRef.current = projectOpen; if (projectOpen) keysRef.current.clear(); }, [projectOpen]);

  useEffect(() => {
    if (muted) return;
    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audio = new AudioContextCtor(); const gain = audio.createGain(); gain.gain.value = 0.022; gain.connect(audio.destination);
    const tones = [82.41, 123.47, 164.81].map((frequency, index) => {
      const oscillator = audio.createOscillator(); const voice = audio.createGain(); oscillator.type = index === 0 ? 'sine' : 'triangle'; oscillator.frequency.value = frequency;
      voice.gain.value = index === 0 ? 0.6 : 0.14; oscillator.connect(voice).connect(gain); oscillator.start(); return oscillator;
    });
    return () => { gain.gain.setTargetAtTime(0, audio.currentTime, 0.03); tones.forEach((tone) => tone.stop(audio.currentTime + 0.12)); window.setTimeout(() => void audio.close(), 160); };
  }, [muted]);

  const interact = useCallback(() => {
    const project = nearbyRef.current; if (!project) return; setActiveProject(project); setProjectOpen(true);
    setDiscovered((current) => {
      const next = new Set(current).add(project.id);
      try { localStorage.setItem('nathan-world-discoveries', JSON.stringify([...next])); } catch { /* optional local progress */ }
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) { event.preventDefault(); keysRef.current.add(key); }
      if ((key === 'e' || key === 'enter') && !event.repeat) interact();
      if (key === 'm' && !event.repeat) setMapOpen((value) => !value);
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    const clearKeys = () => keysRef.current.clear();
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', clearKeys);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', clearKeys); };
  }, [interact]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    let frame = 0; let lastTime = performance.now();
    const obstacles = PROJECTS.map((project) => ({ x: project.x - 96, y: project.y - 74, w: 192, h: 150 }));
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(window.innerWidth * ratio); canvas.height = Math.round(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`; canvas.style.height = `${window.innerHeight}px`; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.imageSmoothingEnabled = false;
    };
    const canMove = (next: Point) => !obstacles.some((obstacle) => rectsOverlap({ x: next.x - 9, y: next.y - 9, w: 18, h: 27 }, obstacle));
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05); lastTime = time; const keys = keysRef.current; let dx = 0; let dy = 0;
      if (!modalOpenRef.current) { if (keys.has('w') || keys.has('arrowup')) dy -= 1; if (keys.has('s') || keys.has('arrowdown')) dy += 1; if (keys.has('a') || keys.has('arrowleft')) dx -= 1; if (keys.has('d') || keys.has('arrowright')) dx += 1; }
      if (dx || dy) {
        const length = Math.hypot(dx, dy); dx /= length; dy /= length;
        directionRef.current = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        const current = positionRef.current; const nextX = { x: clamp(current.x + dx * PLAYER_SPEED * dt, 24, WORLD.width - 24), y: current.y };
        if (canMove(nextX)) current.x = nextX.x; const nextY = { x: current.x, y: clamp(current.y + dy * PLAYER_SPEED * dt, 24, WORLD.height - 24) };
        if (canMove(nextY)) current.y = nextY.y;
      }
      const player = positionRef.current; let nearest: Project | null = null; let nearestDistance = Number.POSITIVE_INFINITY;
      for (const project of PROJECTS) { const distance = Math.hypot(player.x - project.x, player.y - (project.y + 104)); if (distance < 112 && distance < nearestDistance) { nearest = project; nearestDistance = distance; } }
      if (nearbyRef.current?.id !== nearest?.id) { nearbyRef.current = nearest; setNearbyProject(nearest); }
      const nextBiome = biomeAt(player); if (biomeRef.current !== nextBiome) { biomeRef.current = nextBiome; setBiome(nextBiome); }
      if (mapPlayerRef.current) { mapPlayerRef.current.style.left = `${(player.x / WORLD.width) * 100}%`; mapPlayerRef.current.style.top = `${(player.y / WORLD.height) * 100}%`; }
      const viewWidth = window.innerWidth; const viewHeight = window.innerHeight;
      const cameraX = clamp(player.x - viewWidth / 2, 0, Math.max(0, WORLD.width - viewWidth)); const cameraY = clamp(player.y - viewHeight / 2, 0, Math.max(0, WORLD.height - viewHeight));
      ctx.clearRect(0, 0, viewWidth, viewHeight); ctx.save(); ctx.translate(-Math.round(cameraX), -Math.round(cameraY)); drawTerrain(ctx); PROJECTS.forEach((project) => drawLandmark(ctx, project));
      if (nearest) { ctx.strokeStyle = nearest.accent; ctx.lineWidth = 3; ctx.setLineDash([6, 7]); ctx.beginPath(); ctx.arc(nearest.x, nearest.y + 104, 45, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      drawPlayer(ctx, player, directionRef.current, Boolean(dx || dy), time); ctx.restore();
      const gradient = ctx.createRadialGradient(viewWidth / 2, viewHeight / 2, Math.min(viewWidth, viewHeight) * 0.22, viewWidth / 2, viewHeight / 2, Math.max(viewWidth, viewHeight) * 0.78);
      gradient.addColorStop(0, 'rgba(2, 9, 11, 0)'); gradient.addColorStop(1, 'rgba(2, 7, 10, .58)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, viewWidth, viewHeight);
      frame = requestAnimationFrame(render);
    };
    resize(); window.addEventListener('resize', resize); frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);

  const setTouchKey = (key: string, down: boolean) => { if (down) keysRef.current.add(key); else keysRef.current.delete(key); };
  const projectProgress = `${discovered.size}/${PROJECTS.length}`;

  return (
    <main className="game-shell" aria-label="Nathan's project world">
      <canvas ref={canvasRef} className="game-canvas" aria-hidden="true" />
      <header className="game-topbar">
        <a className="world-brand" href="https://github.com/Nathan-W123" target="_blank" rel="noreferrer">
          <span className="brand-glyph">NW</span><span><b>NATHAN&apos;S WORLD</b><small>PROJECT ARCHIVE · v0.1</small></span>
        </a>
        <div className="biome-pill"><i /> {biome.toUpperCase()}</div>
        <div className="game-actions">
          <span className="discovery-count">{projectProgress} FOUND</span>
          <button type="button" onClick={() => setMapOpen((value) => !value)} aria-label="Toggle world map"><Map /><span>Map</span></button>
          <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Turn ambient sound on' : 'Mute ambient sound'}>{muted ? <VolumeX /> : <Volume2 />}</button>
        </div>
      </header>
      <aside className="quest-card">
        <span>ACTIVE QUEST</span><b>Map the archive</b><p>Follow the paths, approach a landmark, and inspect the signal hidden there.</p>
        <div><i className={discovered.size >= 3 ? 'complete' : ''} /> DISCOVER 3 PROJECTS · {Math.min(discovered.size, 3)}/3</div>
      </aside>
      {mapOpen && (
        <aside className="mini-map expanded-map" aria-label="World map">
          <div className="mini-map-grid">
            <span className="map-zone zone-strategy">STRATEGY</span><span className="map-zone zone-terminal">TERMINAL</span><span className="map-zone zone-wind">WIND</span><span className="map-zone zone-matter">MATTER</span>
            {PROJECTS.map((project) => <span key={project.id} className={`map-project-dot ${discovered.has(project.id) ? 'is-found' : ''}`} style={{ left: `${(project.x / WORLD.width) * 100}%`, top: `${(project.y / WORLD.height) * 100}%` }} title={project.name} />)}
            <span ref={mapPlayerRef} className="map-player">●</span>
          </div>
          <b>WORLD MAP</b><small>{projectProgress} DISCOVERIES · GOLD = VISITED</small>
        </aside>
      )}
      <div className={`interact-prompt ${nearbyProject ? 'is-visible' : ''}`} aria-hidden={!nearbyProject}>
        <button type="button" onClick={interact} tabIndex={nearbyProject ? 0 : -1}><kbd>E</kbd><span><b>Inspect {nearbyProject?.name ?? 'landmark'}</b><small>{nearbyProject?.kind ?? 'Project signal detected'}</small></span></button>
      </div>
      <div className="controls-hint"><span><kbd>WASD</kbd> MOVE</span><span><kbd>E</kbd> INTERACT</span><span><kbd>M</kbd> MAP</span></div>
      <div className="touch-controls" aria-label="Movement controls">
        <button onPointerDown={() => setTouchKey('w', true)} onPointerUp={() => setTouchKey('w', false)} onPointerCancel={() => setTouchKey('w', false)} aria-label="Move up">▲</button>
        <button onPointerDown={() => setTouchKey('a', true)} onPointerUp={() => setTouchKey('a', false)} onPointerCancel={() => setTouchKey('a', false)} aria-label="Move left">◀</button>
        <button onPointerDown={() => setTouchKey('s', true)} onPointerUp={() => setTouchKey('s', false)} onPointerCancel={() => setTouchKey('s', false)} aria-label="Move down">▼</button>
        <button onPointerDown={() => setTouchKey('d', true)} onPointerUp={() => setTouchKey('d', false)} onPointerCancel={() => setTouchKey('d', false)} aria-label="Move right">▶</button>
      </div>
      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="project-dialog" showCloseButton>
          <div className={`project-visual visual-${activeProject.landmark}`} style={{ '--project-accent': activeProject.accent } as React.CSSProperties} aria-hidden="true">
            {activeProject.landmark === 'observatory' ? <><span className="black-hole" /><i className="orbit orbit-one" /><i className="orbit orbit-two" /></> : <strong className="project-sigil">{activeProject.sigil}</strong>}
            <small>ARCHIVE SIGNAL / {activeProject.biome.toUpperCase()}</small>
          </div>
          <DialogHeader className="project-dialog-header">
            <div className="project-eyebrow"><span>DISCOVERY {activeProject.number}</span><span>{activeProject.kind}</span></div>
            <DialogTitle>{activeProject.name}</DialogTitle><DialogDescription>{activeProject.summary}</DialogDescription>
          </DialogHeader>
          <ul className="project-features">{activeProject.details.map((detail) => <li key={detail}><i />{detail}</li>)}</ul>
          <div className="project-dialog-actions">
            <Button render={<a href={activeProject.href} target="_blank" rel="noreferrer" />} className="project-primary"><FolderGit2 /> Explore repository <ExternalLink /></Button>
            <Button variant="ghost" onClick={() => setProjectOpen(false)}>Return to world</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

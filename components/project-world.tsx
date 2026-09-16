'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ExternalLink, FolderGit2, Map as MapIcon, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createWorldAudio, type WorldAudio } from '@/components/world-audio';
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
const WALK_TARGET_REACH = 6;
const WALK_TARGET_BLOCKED_LIMIT = 0.4;
const TAP_MAX_DURATION = 300;
const TAP_MAX_MOVEMENT = 10;
const JOYSTICK_DEAD_ZONE = 8;
const MOBILE_BREAKPOINT = 900;
const VISIBLE_WORLD_WIDTH = { touch: 420, pointer: 760 };
const MAX_RENDER_SCALE = { touch: 2, pointer: 2.5 };
const STEP_INTERVAL = .3; // seconds between footstep sounds while walking
const SOUND_PREFERENCE_KEY = 'nathan-world-sound';

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Direction = 'up' | 'down' | 'left' | 'right';
type WalkTarget = Point & { blockedFor: number };
type TapCandidate = { pointerId: number; x: number; y: number; time: number };

type Project = {
  id: string;
  number: string;
  location: string;
  projectName: string;
  category: string;
  href: string;
  /** One line under the name: what it actually is. */
  tagline: string;
  /** Screenshot or terminal card, relative path under public/projects. */
  image: string;
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
    tagline: 'A general-relativistic ray tracer that renders black holes and their accretion disks.',
    image: 'projects/black-hole.webp',
    details: ['Backward ray tracing from an arbitrary camera', 'Relativistic accretion-disk color and Doppler shifts', 'Photon rings, lensed starfields, and secondary images'],
    landmark: { x: 307, y: 104 }, approach: { x: 306, y: 134 }, building: { x: 232, y: 28, w: 114, h: 90 },
  },
  {
    id: 'gambit', number: '02', location: "Knight's Rest", projectName: 'Gambit', category: 'MACHINE LEARNING · PYTHON',
    href: 'https://github.com/Nathan-W123/Gambit', area: 'Alderwatch', accent: '#8cb4e5',
    tagline: 'A chess neural network that plays bullet games on Lichess through the bot API.',
    image: 'projects/gambit.webp',
    details: ['Policy-and-value residual convolutional network', 'Alpha-beta search tuned for bullet time controls', 'ONNX inference and legal-move masking'],
    landmark: { x: 659, y: 155 }, approach: { x: 719, y: 236 }, building: { x: 619, y: 72, w: 168, h: 136 },
  },
  {
    id: 'siege', number: '03', location: 'The Proving Grounds', projectName: 'Siege', category: 'REINFORCEMENT LEARNING · PYTHON',
    href: 'https://github.com/Nathan-W123/Siege', area: 'Alderwatch', accent: '#d7784b',
    tagline: 'A reinforcement-learning agent that learns Clash Royale strategy inside a custom simulator.',
    image: 'projects/siege.webp',
    details: ['Config-driven simulator and scripted opponents', 'Masked policy with league self-play', 'Training reports and a live WebGL network viewer'],
    landmark: { x: 489, y: 328 }, approach: { x: 488, y: 398 }, building: { x: 422, y: 277, w: 135, h: 106 },
  },
  {
    id: 'kumi', number: '04', location: "Weaver's Guild", projectName: 'Kumi', category: 'AGENT SYSTEMS · TYPESCRIPT',
    href: 'https://github.com/Nathan-W123/Kumi', area: 'Alderwatch', accent: '#d4a84e',
    tagline: 'A coordination layer that lets people and coding agents work on one codebase in parallel.',
    image: 'projects/kumi.webp',
    details: ['Isolated worktrees and conflict-aware scheduling', 'Human and multi-agent task coordination', 'Approvals, audit history, and atomic promotion'],
    landmark: { x: 730, y: 357 }, approach: { x: 728, y: 404 }, building: { x: 658, y: 290, w: 146, h: 94 },
  },
  {
    id: 'voice-agents', number: '05', location: 'Signal House', projectName: 'Voice Agents', category: 'VOICE AI · TYPESCRIPT',
    href: 'https://github.com/Nathan-W123/YCHackVoiceAgents', area: 'Alderwatch', accent: '#c99357',
    tagline: 'A real-time voice-capture app built at a YC hackathon.',
    image: 'projects/voice-agents.webp',
    details: ['Expo / React Native app with a native iOS target', 'Python backend with Supabase storage for captures', 'Built in a weekend at a YC hackathon'],
    landmark: { x: 1095, y: 239 }, approach: { x: 1102, y: 298 }, building: { x: 1054, y: 190, w: 88, h: 82 },
  },
  {
    id: 'aero', number: '06', location: 'Gale Works', projectName: 'Aero', category: 'FLUID DYNAMICS · PYTHON',
    href: 'https://github.com/Nathan-W123/Aero', area: 'Gale Coast', accent: '#65bccc',
    tagline: 'A lattice-Boltzmann wind-tunnel simulator for 2D and 3D flows.',
    image: 'projects/aero.webp',
    details: ['D2Q9 and D3Q19 solvers with multiple collision models', 'Analytic geometry and STL voxelization workflows', 'Lift, drag, scalar, thermal, and force observables'],
    landmark: { x: 1370, y: 169 }, approach: { x: 1402, y: 228 }, building: { x: 1352, y: 124, w: 116, h: 78 },
  },
  {
    id: 'quantize', number: '07', location: 'Atom Garden', projectName: 'Quantize', category: 'MOLECULAR SCIENCE · PYTHON',
    href: 'https://github.com/Nathan-W123/Quantize', area: 'Lumenwood', accent: '#a786ff',
    tagline: 'Recovers molecular geometry from rotational spectra plus quantum chemistry.',
    image: 'projects/quantize.webp',
    details: ['SVD separates spectroscopy-sensitive and null directions', 'Quantum gradients stabilize underspecified structures', 'Multi-isotopologue fitting with correction provenance'],
    landmark: { x: 205, y: 554 }, approach: { x: 205, y: 624 }, building: { x: 143, y: 506, w: 135, h: 102 },
  },
  {
    id: 'formulate', number: '08', location: 'Glassroot Conservatory', projectName: 'Formulate', category: 'MATERIALS DESIGN · PYTHON',
    href: 'https://github.com/Nathan-W123/Formulate', area: 'Glassroot Fields', accent: '#7ecf92',
    tagline: 'An inverse materials engine that turns desired behaviour into ranked candidate molecules.',
    image: 'projects/formulate.webp',
    details: ['Unit-safe target specifications and uncertainty', 'Search, expert prediction, and Pareto ranking', 'Selective quantum and molecular-dynamics validation'],
    landmark: { x: 617, y: 593 }, approach: { x: 618, y: 648 }, building: { x: 536, y: 512, w: 156, h: 118 },
  },
  {
    id: 'hf-scf', number: '09', location: 'Violet Spire', projectName: 'HF–SCF Engine', category: 'QUANTUM CHEMISTRY · PYTHON',
    href: 'https://github.com/Nathan-W123/HF-SCF-Engine', area: 'Violet Reach', accent: '#a878e8',
    tagline: 'A Hartree–Fock quantum-chemistry engine with an interactive web calculator.',
    image: 'projects/hf-scf.webp',
    details: ['Restricted Hartree–Fock on a PySCF backend', 'Molecule input, basis-set picker and a 3D molecular viewer', 'Live at hf-scf-engine.vercel.app'],
    landmark: { x: 1044, y: 560 }, approach: { x: 1060, y: 676 }, building: { x: 1010, y: 467, w: 80, h: 130 },
  },
  {
    id: 'nonstandard', number: '10', location: 'Harbour Light', projectName: 'Nonstandard Conditions', category: 'GAME · REACT / THREE.JS / RDKIT',
    href: 'https://github.com/EthanVTruong/nonstandardconditions', area: 'Gale Coast', accent: '#f0b357',
    tagline: 'A single-player organic-chemistry workshop: buy materials, run a real three-station lab, fulfil commissions.',
    image: 'projects/nonstandard.webp',
    details: ['Real molecular transforms with an RDKit backend that owns chemistry, inventory and saves', 'Explorable 3D laboratory built with React, Three.js and Rapier', 'Built with Ethan Truong during OpenAI build week; playable at nsc.up.railway.app'],
    landmark: { x: 1358, y: 330 }, approach: { x: 1358, y: 410 }, building: { x: 1343, y: 300, w: 32, h: 96 },
  },
  {
    id: 'website', number: '11', location: "Traveler's Archive", projectName: 'Nathan’s World', category: 'INTERACTIVE WEB · TYPESCRIPT',
    href: 'https://github.com/Nathan-W123/Website', area: 'Glassroot Fields', accent: '#f3c75e',
    tagline: 'This playable map: a top-down world where every building is a project.',
    image: 'projects/website.webp',
    details: ['Top-down exploration with keyboard and touch controls', 'Place-based project storytelling', 'A growing world for future work and experiments'],
    landmark: { x: 720, y: 829 }, approach: { x: 716, y: 906 }, building: { x: 648, y: 764, w: 180, h: 118 },
  },
];

const WORLD_BLOCKERS: Rect[] = PROJECTS.map((project) => project.building);
// The archive the player starts in front of.
const START_PROJECT = PROJECTS.find((project) => project.id === 'website') ?? PROJECTS[PROJECTS.length - 1];

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

type RotorLayer = { canvas: HTMLCanvasElement; x: number; y: number; center: number; phase: number; smooth: boolean };
type SpriteLayer = { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number; amp: number; period: number; phase: number; glow: string; motion: 'bob' | 'wander' };
type ScrollLayer = { canvas: HTMLCanvasElement; mask: HTMLCanvasElement; scratch: HTMLCanvasElement; rect: Rect; speed: number };

declare global {
  interface Window {
    /** Dev-only handle to the prepared world layers, for screenshot tooling. */
    __nwLayers?: WorldLayers;
  }
}
type WorldLayers = {
  base: HTMLCanvasElement;
  water: HTMLCanvasElement;
  lights: HTMLCanvasElement;
  glow: HTMLCanvasElement;
  rotors: RotorLayer[];
  floaters: SpriteLayer[];
  waterfalls: ScrollLayer[];
};

/**
 * Village windmill: its sails are drawn as a clean cross over grass, so the sprite is one measured
 * sail (`templateArm`) stamped every 90 degrees, and each painted sail (`armAngles`/`armLengths`,
 * degrees clockwise from +x) is patched out of the base by mirroring the band beside it.
 */
type Rotor = {
  x: number;
  y: number;
  length: number;
  halfWidth: number;
  patchHalfWidth: number;
  templateArm: number;
  armAngles: [number, number, number, number];
  armLengths: [number, number, number, number];
  phase: number;
};
const ROTORS: Rotor[] = [
  { x: 1110, y: 762, length: 40, halfWidth: 10, patchHalfWidth: 14, templateArm: 2, armAngles: [56, 136, 237, 327], armLengths: [44, 46, 46, 46], phase: 0 },
];
const ROTOR_HUB = 8;

type ArmDirection = { ux: number; uy: number; px: number; py: number };
function armDirection(degrees: number): ArmDirection {
  const angle = degrees * Math.PI / 180;
  return { ux: Math.cos(angle), uy: Math.sin(angle), px: -Math.sin(angle), py: Math.cos(angle) };
}

/**
 * Gale Works windmill: drawn in perspective in front of its dome, so the four painted sails are
 * traced by hand as polygons (world px). The sprite is the first polygon stamped every 90 degrees
 * about the hub; the base under every painted sail is refilled from the same radius around the hub
 * (water stays water) or from the wall below it (building stays building).
 */
type PolygonRotor = { hub: Point; sails: [number, number][][]; reach: number; buildingFromY: number; phase: number };
const POLYGON_ROTORS: PolygonRotor[] = [
  {
    hub: { x: 1394, y: 117 },
    reach: 90,
    buildingFromY: 113,
    phase: 700,
    sails: [
      [[1366.9, 65.6], [1374, 64], [1396.9, 96.25], [1392.5, 113.75], [1358.1, 84.4]],
      [[1430, 75.6], [1439.4, 91.9], [1410.6, 115], [1400, 101.9]],
      [[1382.5, 114], [1353.75, 135], [1363.1, 149.4], [1388.1, 129.4]],
      [[1401.9, 125.6], [1410, 119.4], [1427.5, 155], [1418.75, 163.75]],
    ],
  },
];
const POLYGON_GROW = 6;
const POLYGON_FILL_STEPS = [35, -35, 55, -55, 90, -90, 135, -135].map((degrees) => degrees * Math.PI / 180);

function insidePolygon(x: number, y: number, polygon: [number, number][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Small glowing things that bob: the observatory orbs and crystal, the forest crystals. */
type Floater = Rect & { amp: number; period: number; phase: number; glow: string; motion: 'bob' | 'wander'; cut?: 'ellipse' | 'violet' };
const FLOATERS: Floater[] = [
  // Violet Spire crystal
  { x: 1045, y: 437, w: 30, h: 66, amp: 2.5, period: 3400, phase: 500, glow: 'rgba(200,120,255,', motion: 'bob', cut: 'violet' },
  // Sheep and the goat in the Glassroot pen: wander a few pixels and hop while moving.
  { x: 897, y: 634, w: 17, h: 15, amp: 1, period: 9000, phase: 0, glow: '', motion: 'wander' },
  { x: 858, y: 668, w: 17, h: 17, amp: 1, period: 11000, phase: 3000, glow: '', motion: 'wander' },
  { x: 878, y: 672, w: 17, h: 17, amp: 1, period: 8000, phase: 6000, glow: '', motion: 'wander' },
  { x: 862, y: 645, w: 16, h: 15, amp: 1, period: 12000, phase: 1500, glow: '', motion: 'wander' },
  { x: 215, y: 503, w: 19, h: 24, amp: 2, period: 2600, phase: 0, glow: 'rgba(120,190,255,', motion: 'bob' },
  { x: 181, y: 491, w: 11, h: 12, amp: 2, period: 2200, phase: 900, glow: 'rgba(120,190,255,', motion: 'bob' },
  { x: 257, y: 494, w: 11, h: 12, amp: 2, period: 2400, phase: 1500, glow: 'rgba(120,190,255,', motion: 'bob' },
  { x: 75, y: 522, w: 17, h: 12, amp: 1.5, period: 2800, phase: 300, glow: 'rgba(190,130,255,', motion: 'bob' },
  { x: 251, y: 585, w: 10, h: 17, amp: 1.5, period: 2500, phase: 1200, glow: 'rgba(190,130,255,', motion: 'bob' },
  { x: 195, y: 639, w: 14, h: 12, amp: 1.5, period: 3000, phase: 600, glow: 'rgba(190,130,255,', motion: 'bob' },
  { x: 294, y: 604, w: 18, h: 19, amp: 1.5, period: 2700, phase: 2000, glow: 'rgba(190,130,255,', motion: 'bob' },
  { x: 238, y: 463, w: 12, h: 12, amp: 1.5, period: 2300, phase: 1700, glow: 'rgba(190,130,255,', motion: 'bob' },
  { x: 134, y: 632, w: 13, h: 12, amp: 1.5, period: 2600, phase: 400, glow: 'rgba(120,220,255,', motion: 'bob' },
];

/** Chimneys. `mask`/`source` patch the painted plume out of the base (a block copy from beside it). */
type Chimney = { mouth: Point; mask: Rect | null; sourceDx: number; height: number; phase: number };
const CHIMNEYS: Chimney[] = [
  { mouth: { x: 760, y: 768 }, mask: { x: 733, y: 718, w: 44, h: 52 }, sourceDx: 48, height: 56, phase: 0 },
  { mouth: { x: 793, y: 300 }, mask: { x: 783, y: 258, w: 32, h: 44 }, sourceDx: 38, height: 46, phase: .4 },
  { mouth: { x: 770, y: 320 }, mask: null, sourceDx: 0, height: 40, phase: .7 },
];
const PUFFS_PER_PLUME = 9;
const PUFF_CYCLE = 3800;

/** Lighthouse lamp and beam. The beam sweeps a horizontal circle seen obliquely: an ellipse squashed by . */
const LIGHTHOUSE = { x: 1356, y: 318, beam: 190, halfAngle: 11 * Math.PI / 180, period: 9000, tilt: .48 };

/** The mill race: this column of water scrolls downward on a loop. */
const WATERFALLS: { rect: Rect; speed: number }[] = [{ rect: { x: 797, y: 426, w: 33, h: 72 }, speed: 80 }];
const STREAK_TILE = 24;
let streakPattern: CanvasPattern | null = null;
function getStreakPattern(context: CanvasRenderingContext2D) {
  if (streakPattern) return streakPattern;
  const tile = document.createElement('canvas');
  tile.width = STREAK_TILE;
  tile.height = STREAK_TILE;
  const tileContext = tile.getContext('2d')!;
  tileContext.fillStyle = '#f2fbff';
  tileContext.fillRect(2, 0, 1, 7);
  tileContext.fillRect(9, 10, 1, 5);
  tileContext.fillRect(15, 3, 1, 8);
  tileContext.fillRect(20, 14, 1, 6);
  tileContext.fillRect(6, 17, 1, 4);
  streakPattern = context.createPattern(tile, 'repeat');
  return streakPattern;
}
/** The water wheel: a disc that turns in place (a disc rotated is still the same disc, so no patching). */
const WHEELS: { x: number; y: number; radius: number; period: number }[] = [{ x: 837, y: 479, radius: 18, period: 4500 }];

const LIGHT_REGIONS: Rect[] = [
  { x: 210, y: 36, w: 190, h: 180 }, { x: 100, y: 470, w: 220, h: 230 },
  { x: 500, y: 480, w: 240, h: 200 }, { x: 570, y: 710, w: 320, h: 190 },
  { x: 640, y: 270, w: 380, h: 170 }, { x: 970, y: 445, w: 170, h: 225 },
  { x: 1040, y: 170, w: 130, h: 150 }, { x: 1280, y: 70, w: 200, h: 190 },
];
const LIGHT_DIM = .5;

/** Cream sail cloth or its brown frame; excludes sky, water, grass, glass. */
function isSailPixel(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const cream = max > 150 && max - min < 70;
  const frame = red > 90 && red >= green && green >= blue && red - blue > 35;
  return cream || frame;
}

const GLINT_TILE = 32;
let glintPattern: CanvasPattern | null = null;
let scratchCanvas: HTMLCanvasElement | null = null;

function getGlintPattern(context: CanvasRenderingContext2D) {
  if (glintPattern) return glintPattern;
  const tile = document.createElement('canvas');
  tile.width = GLINT_TILE;
  tile.height = GLINT_TILE;
  const tileContext = tile.getContext('2d')!;
  tileContext.fillStyle = '#eef9ff';
  tileContext.fillRect(3, 6, 6, 1);
  tileContext.fillRect(19, 13, 4, 1);
  tileContext.fillRect(11, 22, 7, 1);
  tileContext.fillRect(26, 28, 3, 1);
  glintPattern = context.createPattern(tile, 'repeat');
  return glintPattern;
}

function getScratch(width: number, height: number) {
  if (!scratchCanvas) scratchCanvas = document.createElement('canvas');
  if (scratchCanvas.width !== width || scratchCanvas.height !== height) {
    scratchCanvas.width = width;
    scratchCanvas.height = height;
  }
  return scratchCanvas;
}

function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD.width;
  canvas.height = WORLD.height;
  return canvas;
}

function insideRect(x: number, y: number, rect: Rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function armCoordinates(dx: number, dy: number, direction: ArmDirection) {
  return { parallel: dx * direction.ux + dy * direction.uy, perpendicular: dx * direction.px + dy * direction.py };
}

function prepareWorldLayers(world: HTMLImageElement): WorldLayers {
  const source = makeCanvas();
  source.getContext('2d')!.drawImage(world, 0, 0);
  const sourceImage = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, WORLD.width, WORLD.height);
  const original = sourceImage.data;
  const baseImage = new ImageData(new Uint8ClampedArray(original), WORLD.width, WORLD.height);
  const waterImage = new ImageData(WORLD.width, WORLD.height);
  const lightImage = new ImageData(WORLD.width, WORLD.height);
  const blueWater = new Uint8Array(WORLD.width * WORLD.height);
  const lampColour = new Uint8Array(WORLD.width * WORLD.height);
  const readPixel = (x: number, y: number) =>
    (clamp(Math.round(y), 0, WORLD.height - 1) * WORLD.width + clamp(Math.round(x), 0, WORLD.width - 1)) * 4;
  // Anything cut out of the base must also leave the light layer, or its old pixels keep glowing in place.
  const clearLight = (index: number) => {
    lightImage.data[index] = 0;
    lightImage.data[index + 1] = 0;
    lightImage.data[index + 2] = 0;
    lightImage.data[index + 3] = 0;
  };
  const clearWater = (index: number) => {
    waterImage.data[index + 3] = 0;
  };

  for (let pixel = 0; pixel < blueWater.length; pixel += 1) {
    const index = pixel * 4;
    const red = original[index];
    const green = original[index + 1];
    const blue = original[index + 2];
    if (blue > 100 && blue > red * 1.25 && blue > green * 1.04 && green > 62) blueWater[pixel] = 1;
    // Lamp yellow/orange or violet crystal light. Cream walls, sails, sand and glass fail this.
    const warm = red > 200 && green > 120 && green < 215 && blue < 95 && red - blue > 120 && red > green * 1.08;
    const violet = blue > 160 && red > 110 && green < 130 && blue - green > 60 && blue > red * 1.15;
    if (warm || violet) lampColour[pixel] = 1;
  }
  // A lit pixel only counts inside a solid block of lit pixels, so one-pixel highlights on frames
  // and crates do not pulse.
  const solidLight = (x: number, y: number) => {
    let count = 0;
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const nearX = x + ox;
        const nearY = y + oy;
        if (nearX >= 0 && nearX < WORLD.width && nearY >= 0 && nearY < WORLD.height && lampColour[nearY * WORLD.width + nearX]) count += 1;
      }
    }
    return count >= 6;
  };

  for (let y = 0; y < WORLD.height; y += 1) {
    for (let x = 0; x < WORLD.width; x += 1) {
      const pixel = y * WORLD.width + x;
      const index = pixel * 4;
      const red = original[index];
      const green = original[index + 1];
      const blue = original[index + 2];

      // Water mask (blue water plus the pale foam right next to it). The base keeps the painted
      // water untouched; this mask only decides where the drifting glints are allowed to show.
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
      if (water) waterImage.data.set(original.subarray(index, index + 4), index);

      // Lit windows: dimmed in the base, re-added with a slow pulse so they glow rather than strobe.
      const inLightRegion = lampColour[pixel] === 1 && LIGHT_REGIONS.some((region) => insideRect(x, y, region));
      if (inLightRegion && solidLight(x, y)) {
        lightImage.data.set(original.subarray(index, index + 4), index);
        baseImage.data[index] = Math.round(red * LIGHT_DIM);
        baseImage.data[index + 1] = Math.round(green * LIGHT_DIM);
        baseImage.data[index + 2] = Math.round(blue * LIGHT_DIM);
      }
    }
  }

  const rotors: RotorLayer[] = ROTORS.map((rotor) => {
    const size = rotor.length * 2 + 8;
    const center = Math.floor(size / 2);
    const rotorCanvas = document.createElement('canvas');
    rotorCanvas.width = size;
    rotorCanvas.height = size;
    const rotorImage = new ImageData(size, size);
    const paintedArms = rotor.armAngles.map(armDirection);
    const template = paintedArms[rotor.templateArm];
    // The sprite's own cross: the template sail's angle, then every 90 degrees.
    const spriteArms = [0, 1, 2, 3].map((arm) => armDirection(rotor.armAngles[rotor.templateArm] + arm * 90));

    // 1. Patch the base where the painted sails are by mirroring the background band beside each
    //    sail across its edge, so the texture stays continuous instead of smearing into stripes.
    const band = rotor.patchHalfWidth;
    const insideAnyArm = (dx: number, dy: number) => {
      for (let arm = 0; arm < 4; arm += 1) {
        const { parallel, perpendicular } = armCoordinates(dx, dy, paintedArms[arm]);
        if (parallel >= ROTOR_HUB && parallel <= rotor.armLengths[arm] && Math.abs(perpendicular) <= band) return true;
      }
      return false;
    };
    const copyPixel = (fromX: number, fromY: number, toIndex: number) => {
      const sampleIndex = (clamp(Math.round(fromY), 0, WORLD.height - 1) * WORLD.width + clamp(Math.round(fromX), 0, WORLD.width - 1)) * 4;
      baseImage.data.set(original.subarray(sampleIndex, sampleIndex + 4), toIndex);
    };
    const reach = Math.max(...rotor.armLengths) + band + 2;
    for (let worldY = rotor.y - reach; worldY <= rotor.y + reach; worldY += 1) {
      for (let worldX = rotor.x - reach; worldX <= rotor.x + reach; worldX += 1) {
        if (worldX < 0 || worldY < 0 || worldX >= WORLD.width || worldY >= WORLD.height) continue;
        const dx = worldX - rotor.x;
        const dy = worldY - rotor.y;
        for (let arm = 0; arm < 4; arm += 1) {
          const direction = paintedArms[arm];
          const { parallel, perpendicular } = armCoordinates(dx, dy, direction);
          if (parallel < ROTOR_HUB || parallel > rotor.armLengths[arm] || Math.abs(perpendicular) > band) continue;
          const targetIndex = (worldY * WORLD.width + worldX) * 4;
          clearLight(targetIndex);
          clearWater(targetIndex);
          // Mirror across the sail edge: a pixel q inside maps to 2*band - q + 1 outside, same side.
          const side = perpendicular >= 0 ? 1 : -1;
          const mirrored = side * (2 * band + 1 - Math.abs(perpendicular));
          const mirrorX = direction.ux * parallel + direction.px * mirrored;
          const mirrorY = direction.uy * parallel + direction.py * mirrored;
          if (!insideAnyArm(mirrorX, mirrorY)) {
            copyPixel(rotor.x + mirrorX, rotor.y + mirrorY, targetIndex);
          } else {
            // Near the hub the mirror lands on the neighbouring sail; use the gap between arms.
            const radius = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx) + side * Math.PI / 4;
            const gapX = Math.cos(angle) * radius;
            const gapY = Math.sin(angle) * radius;
            if (!insideAnyArm(gapX, gapY)) copyPixel(rotor.x + gapX, rotor.y + gapY, targetIndex);
          }
          break;
        }
      }
    }

    // 2. Build a symmetric cross from the clean template sail, stamped once per arm.
    for (let localY = 0; localY < size; localY += 1) {
      for (let localX = 0; localX < size; localX += 1) {
        const dx = localX - center;
        const dy = localY - center;
        for (let arm = 0; arm < 4; arm += 1) {
          const { parallel, perpendicular } = armCoordinates(dx, dy, spriteArms[arm]);
          if (parallel < ROTOR_HUB || parallel > rotor.length || Math.abs(perpendicular) > rotor.halfWidth) continue;
          const sourceX = Math.round(rotor.x + template.ux * parallel + template.px * perpendicular);
          const sourceY = Math.round(rotor.y + template.uy * parallel + template.py * perpendicular);
          if (sourceX < 0 || sourceY < 0 || sourceX >= WORLD.width || sourceY >= WORLD.height) break;
          const sourceIndex = (sourceY * WORLD.width + sourceX) * 4;
          if (isSailPixel(original[sourceIndex], original[sourceIndex + 1], original[sourceIndex + 2])) {
            rotorImage.data.set(original.subarray(sourceIndex, sourceIndex + 4), (localY * size + localX) * 4);
          }
          break;
        }
      }
    }
    rotorCanvas.getContext('2d')!.putImageData(rotorImage, 0, 0);
    return { canvas: rotorCanvas, x: rotor.x, y: rotor.y, center, phase: rotor.phase, smooth: false };
  });


  // Gale Works windmill: patch the painted sails, then build a symmetric sprite from the first one.
  const polygonRotors: RotorLayer[] = POLYGON_ROTORS.map((rotor) => {
    const { hub, sails, reach } = rotor;
    const insideAnySail = (x: number, y: number) => {
      for (let oy = -POLYGON_GROW; oy <= POLYGON_GROW; oy += 1) {
        for (let ox = -POLYGON_GROW; ox <= POLYGON_GROW; ox += 1) {
          if (sails.some((sail) => insidePolygon(x + ox, y + oy, sail))) return true;
        }
      }
      return false;
    };
    const sailAt = (x: number, y: number) => {
      for (const sail of sails) {
        for (let oy = -POLYGON_GROW; oy <= POLYGON_GROW; oy += 1) {
          for (let ox = -POLYGON_GROW; ox <= POLYGON_GROW; ox += 1) {
            if (insidePolygon(x + ox, y + oy, sail)) return sail;
          }
        }
      }
      return null;
    };
    const seaCells: number[] = [];
    for (let y = hub.y - reach; y <= hub.y + reach; y += 1) {
      for (let x = hub.x - reach; x <= hub.x + reach; x += 1) {
        if (x < 0 || y < 0 || x >= WORLD.width || y >= WORLD.height) continue;
        const sail = sailAt(x, y);
        if (!sail) continue;
        const target = (y * WORLD.width + x) * 4;
        clearLight(target);
        if (y > rotor.buildingFromY) clearWater(target);
        else waterImage.data[target + 3] = 255;
        // Over the building: copy the wall/dome from further down the same column.
        if (y > rotor.buildingFromY && !insideAnySail(x, y + 28)) {
          baseImage.data.set(original.subarray(readPixel(x, y + 28), readPixel(x, y + 28) + 4), target);
          continue;
        }
        // Otherwise: the same radius around the hub, on the side this pixel leans toward.
        const dx = x - hub.x;
        const dy = y - hub.y;
        const radius = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const centreX = sail.reduce((sum, point) => sum + point[0], 0) / sail.length - hub.x;
        const centreY = sail.reduce((sum, point) => sum + point[1], 0) / sail.length - hub.y;
        const side = Math.sign(dx * centreY - dy * centreX) || 1;
        // Above the building only water may be copied in (never the mast); failing that, reach further out.
        const isWater = (px: number, py: number) => {
          const from = readPixel(px, py);
          return original[from + 2] > original[from] * 1.25 && original[from + 2] > 100;
        };
        let filled = false;
        // Over the sea the patch is solved as a smooth field after this loop (see below).
        if (y <= rotor.buildingFromY) {
          seaCells.push(y * WORLD.width + x);
          filled = true;
        }
        if (!filled) for (const step of POLYGON_FILL_STEPS) {
          const sampleAngle = angle + side * step;
          const sampleX = hub.x + Math.cos(sampleAngle) * radius;
          const sampleY = hub.y + Math.sin(sampleAngle) * radius;
          if (insideAnySail(sampleX, sampleY)) continue;
          if (y <= rotor.buildingFromY && !isWater(sampleX, sampleY)) continue;
          baseImage.data.set(original.subarray(readPixel(sampleX, sampleY), readPixel(sampleX, sampleY) + 4), target);
          filled = true;
          break;
        }
        if (!filled) {
          const farX = hub.x + Math.cos(angle) * (radius + 40);
          const farY = hub.y + Math.sin(angle) * (radius + 40);
          baseImage.data.set(original.subarray(readPixel(farX, farY), readPixel(farX, farY) + 4), target);
        }
      }
    }
    // Sea fill: iterate an average of water-only neighbours so the patch matches the surrounding water
    // exactly at its border with no seam; copied pixels could never match this depth gradient.
    if (seaCells.length) {
      const inSea = new Set(seaCells);
      const waterAt = (cell: number) => original[cell * 4 + 2] > original[cell * 4] * 1.25 && original[cell * 4 + 2] > 100;
      const values = new Float32Array(seaCells.length * 3);
      const lookup = new Map<number, number>();
      seaCells.forEach((cell, k) => lookup.set(cell, k));
      const sample = (cell: number, channel: number) => {
        const k = lookup.get(cell);
        return k === undefined ? baseImage.data[cell * 4 + channel] : values[k * 3 + channel];
      };
      let seed = [0, 0, 0];
      let seedCount = 0;
      for (const cell of seaCells) {
        for (const near of [cell - 1, cell + 1, cell - WORLD.width, cell + WORLD.width]) {
          if (inSea.has(near) || !waterAt(near)) continue;
          seed = [seed[0] + baseImage.data[near * 4], seed[1] + baseImage.data[near * 4 + 1], seed[2] + baseImage.data[near * 4 + 2]];
          seedCount += 1;
        }
      }
      for (let k = 0; k < seaCells.length; k += 1) {
        for (let channel = 0; channel < 3; channel += 1) values[k * 3 + channel] = seedCount ? seed[channel] / seedCount : 60;
      }
      const next = new Float32Array(values.length);
      for (let iteration = 0; iteration < 300; iteration += 1) {
        seaCells.forEach((cell, k) => {
          let count = 0;
          const sum = [0, 0, 0];
          for (const near of [cell - 1, cell + 1, cell - WORLD.width, cell + WORLD.width]) {
            if (!inSea.has(near) && !waterAt(near)) continue;
            for (let channel = 0; channel < 3; channel += 1) sum[channel] += sample(near, channel);
            count += 1;
          }
          for (let channel = 0; channel < 3; channel += 1) next[k * 3 + channel] = count ? sum[channel] / count : values[k * 3 + channel];
        });
        values.set(next);
      }
      seaCells.forEach((cell, k) => {
        baseImage.data[cell * 4] = Math.round(values[k * 3]);
        baseImage.data[cell * 4 + 1] = Math.round(values[k * 3 + 1]);
        baseImage.data[cell * 4 + 2] = Math.round(values[k * 3 + 2]);
      });
    }

    const size = reach * 2 + 2;
    const center = reach + 1;
    const rotorCanvas = document.createElement('canvas');
    rotorCanvas.width = size;
    rotorCanvas.height = size;
    const rotorImage = new ImageData(size, size);
    const template = sails[0];
    for (let localY = 0; localY < size; localY += 1) {
      for (let localX = 0; localX < size; localX += 1) {
        const dx = localX - center;
        const dy = localY - center;
        for (let arm = 0; arm < 4; arm += 1) {
          const angle = -arm * Math.PI / 2;
          const worldX = hub.x + dx * Math.cos(angle) - dy * Math.sin(angle);
          const worldY = hub.y + dx * Math.sin(angle) + dy * Math.cos(angle);
          let hit = false;
          for (let oy = -1; oy <= 1 && !hit; oy += 1) {
            for (let ox = -1; ox <= 1 && !hit; ox += 1) {
              if (insidePolygon(worldX + ox, worldY + oy, template)) hit = true;
            }
          }
          if (hit) {
            const from = readPixel(worldX, worldY);
            // Only sail cloth and frame; the dark mast behind the template sail must not rotate.
            if (isSailPixel(original[from], original[from + 1], original[from + 2])) {
              rotorImage.data.set(original.subarray(from, from + 4), (localY * size + localX) * 4);
            }
            break;
          }
        }
      }
    }
    rotorCanvas.getContext('2d')!.putImageData(rotorImage, 0, 0);
    return { canvas: rotorCanvas, x: hub.x, y: hub.y, center, phase: rotor.phase, smooth: false };
  });

  // Water wheels: only the wooden spokes and hub inside the rim turn. The base gets the dark
  // interior colour where the spokes were, so rock and water around the wheel never move.
  const wheels: RotorLayer[] = WHEELS.map((wheel) => {
    const size = wheel.radius * 2 + 2;
    const center = wheel.radius + 1;
    const isWood = (from: number) =>
      original[from] > 70 && original[from] > original[from + 1] && original[from + 1] > original[from + 2] && original[from] - original[from + 2] > 30;
    const interior: number[] = [];
    for (let localY = 0; localY < size; localY += 1) {
      for (let localX = 0; localX < size; localX += 1) {
        if (Math.hypot(localX - center, localY - center) > wheel.radius) continue;
        const from = readPixel(wheel.x + localX - center, wheel.y + localY - center);
        if (!isWood(from)) interior.push(from);
      }
    }
    const median = (offset: number) => {
      const values = interior.map((from) => original[from + offset]).sort((a, b) => a - b);
      return values.length ? values[Math.floor(values.length / 2)] : 20;
    };
    const dark = [median(0), median(1), median(2)];
    const wheelCanvas = document.createElement('canvas');
    wheelCanvas.width = size;
    wheelCanvas.height = size;
    const wheelImage = new ImageData(size, size);
    for (let localY = 0; localY < size; localY += 1) {
      for (let localX = 0; localX < size; localX += 1) {
        if (Math.hypot(localX - center, localY - center) > wheel.radius) continue;
        const worldX = wheel.x + localX - center;
        const worldY = wheel.y + localY - center;
        const from = readPixel(worldX, worldY);
        if (!isWood(from)) continue;
        const to = (localY * size + localX) * 4;
        wheelImage.data.set(original.subarray(from, from + 3), to);
        wheelImage.data[to + 3] = 255;
        const target = (worldY * WORLD.width + worldX) * 4;
        baseImage.data[target] = Math.round(dark[0] * .9);
        baseImage.data[target + 1] = Math.round(dark[1] * .9);
        baseImage.data[target + 2] = Math.round(dark[2] * .9);
      }
    }
    wheelCanvas.getContext('2d')!.putImageData(wheelImage, 0, 0);
    return { canvas: wheelCanvas, x: wheel.x, y: wheel.y, center, phase: wheel.period, smooth: true };
  });

  // Waterfalls: keep the painted column as a strip that scrolls with wrap-around.
  const waterfalls: ScrollLayer[] = WATERFALLS.map(({ rect, speed }) => {
    // Only the water itself scrolls: rock and wheel pixels inside the rectangle stay put.
    const strip = new ImageData(rect.w, rect.h);
    for (let localY = 0; localY < rect.h; localY += 1) {
      for (let localX = 0; localX < rect.w; localX += 1) {
        const from = readPixel(rect.x + localX, rect.y + localY);
        const red = original[from];
        const green = original[from + 1];
        const blue = original[from + 2];
        const isWater = (blue > red + 25 && blue > 110) || (red > 170 && green > 180 && blue > 190);
        if (!isWater) continue;
        const to = (localY * rect.w + localX) * 4;
        strip.data.set(original.subarray(from, from + 3), to);
        strip.data[to + 3] = 255;
      }
    }
    const stripCanvas = document.createElement('canvas');
    stripCanvas.width = rect.w;
    stripCanvas.height = rect.h;
    stripCanvas.getContext('2d')!.putImageData(strip, 0, 0);
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = rect.w;
    maskCanvas.height = rect.h;
    maskCanvas.getContext('2d')!.drawImage(stripCanvas, 0, 0);
    const scratch = document.createElement('canvas');
    scratch.width = rect.w;
    scratch.height = rect.h;
    return { canvas: stripCanvas, mask: maskCanvas, scratch, rect, speed };
  });

  // Chimneys: replace the painted plume with the trees/cliff beside it; puffs are drawn live.
  for (const chimney of CHIMNEYS) {
    if (!chimney.mask) continue;
    const { x: mx, y: my, w: mw, h: mh } = chimney.mask;
    for (let y = my; y < my + mh; y += 1) {
      for (let x = mx; x < mx + mw; x += 1) {
        const from = readPixel(x + chimney.sourceDx, y);
        baseImage.data.set(original.subarray(from, from + 4), (y * WORLD.width + x) * 4);
      }
    }
  }

  // Floaters: cut each glowing object into a feathered sprite and fill the hole from beside it.
  const floaters: SpriteLayer[] = FLOATERS.map((floater) => {
    const { x: fx, y: fy, w: fw, h: fh } = floater;
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = fw;
    spriteCanvas.height = fh;
    const spriteImage = new ImageData(fw, fh);
    const centreX = (fw - 1) / 2;
    const centreY = (fh - 1) / 2;
    for (let localY = 0; localY < fh; localY += 1) {
      for (let localX = 0; localX < fw; localX += 1) {
        const worldX = fx + localX;
        const worldY = fy + localY;
        const from = readPixel(worldX, worldY);
        let alpha: number;
        if (floater.cut === 'violet') {
          // The crystal itself is saturated violet or its pale highlights; the tower stone is greyish.
          const red = original[from];
          const green = original[from + 1];
          const blue = original[from + 2];
          const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
          const violet = blue > 110 && blue > green * 1.25 && red > green * 1.05 && saturation > 55;
          const highlight = red > 190 && blue > 200 && green > 150;
          alpha = violet || highlight ? 1 : 0;
        } else {
          const nx = (localX - centreX) / (fw / 2);
          const ny = (localY - centreY) / (fh / 2);
          alpha = clamp((1.05 - Math.hypot(nx, ny)) / .3, 0, 1);
        }
        if (alpha <= 0) continue;
        const to = (localY * fw + localX) * 4;
        spriteImage.data.set(original.subarray(from, from + 3), to);
        spriteImage.data[to + 3] = Math.round(alpha * 255);
        if (alpha > .5) {
          const leftEdge = readPixel(fx - 1, worldY);
          const rightEdge = readPixel(fx + fw, worldY);
          const useLeft = localX < centreX;
          const fill = useLeft ? leftEdge : rightEdge;
          baseImage.data.set(original.subarray(fill, fill + 4), (worldY * WORLD.width + worldX) * 4);
          clearLight((worldY * WORLD.width + worldX) * 4);
          clearWater((worldY * WORLD.width + worldX) * 4);
        }
      }
    }
    spriteCanvas.getContext('2d')!.putImageData(spriteImage, 0, 0);
    return { canvas: spriteCanvas, x: fx, y: fy, w: fw, h: fh, amp: floater.amp, period: floater.period, phase: floater.phase, glow: floater.glow, motion: floater.motion };
  });

  const base = makeCanvas();
  const water = makeCanvas();
  const lights = makeCanvas();
  const glow = makeCanvas();
  base.getContext('2d')!.putImageData(baseImage, 0, 0);
  water.getContext('2d')!.putImageData(waterImage, 0, 0);
  lights.getContext('2d')!.putImageData(lightImage, 0, 0);
  // Soft ambient glow around every lit window and lantern (blur is skipped where unsupported).
  const glowContext = glow.getContext('2d')!;
  glowContext.filter = 'blur(5px)';
  glowContext.drawImage(lights, 0, 0);
  glowContext.filter = 'none';
  return { base, water, lights, glow, rotors: [...rotors, ...polygonRotors, ...wheels], floaters, waterfalls };
}

function drawPixelDiamond(context: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, color: string) {
  context.fillStyle = color;
  const top = centerY - size / 2;
  for (let row = 0; row < size; row += 1) {
    const reach = Math.min(row, size - 1 - row) + 1;
    context.fillRect(centerX - reach, top + row, reach * 2, 1);
  }
}

function drawWalkTarget(context: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const size = Math.floor(time / 260) % 2 === 0 ? 6 : 4;
  drawPixelDiamond(context, x, y, size + 2, '#15100c');
  drawPixelDiamond(context, x, y, size, '#f1c66d');
}

function computeRenderScale(viewportWidth: number, touch: boolean) {
  const mode = touch ? 'touch' : 'pointer';
  return Math.round(clamp(viewportWidth / VISIBLE_WORLD_WIDTH[mode], 1, MAX_RENDER_SCALE[mode]) * 10) / 10;
}

function drawSmoke(context: CanvasRenderingContext2D, time: number) {
  for (const chimney of CHIMNEYS) {
    for (let puff = 0; puff < PUFFS_PER_PLUME; puff += 1) {
      const progress = ((time / PUFF_CYCLE) + chimney.phase + puff / PUFFS_PER_PLUME) % 1;
      const rise = progress * chimney.height;
      const sway = Math.sin(progress * 5.5 + puff * 1.7 + chimney.phase * 6) * (2 + progress * 4);
      const size = 3.5 + progress * 8.5;
      const alpha = Math.min(1, progress / .08) * Math.pow(1 - progress, 1.2) * .92;
      const x = chimney.mouth.x + sway;
      const y = chimney.mouth.y - 3 - rise;
      context.globalAlpha = alpha;
      context.fillStyle = progress > .5 ? '#cfd2ce' : '#ece9e2';
      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fill();
      if (size > 4) {
        context.fillStyle = progress > .5 ? '#dcdfdb' : '#f4f2ec';
        context.beginPath();
        context.arc(x - size * .4, y - size * .25, size * .55, 0, Math.PI * 2);
        context.arc(x + size * .35, y + size * .1, size * .5, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  context.globalAlpha = 1;
}

function drawLighthouse(context: CanvasRenderingContext2D, time: number) {
  const angle = (time / LIGHTHOUSE.period) * Math.PI * 2;
  // Pointing toward the viewer (down the screen) the beam is nearer, so slightly stronger.
  const nearness = .8 + Math.sin(angle) * .2;
  context.save();
  context.globalCompositeOperation = 'lighter';
  context.translate(LIGHTHOUSE.x, LIGHTHOUSE.y);
  // The sweep is a horizontal circle seen from above at an angle: squash the vertical axis.
  context.save();
  context.scale(1, LIGHTHOUSE.tilt);
  context.rotate(angle);
  const beamFill = context.createRadialGradient(0, 0, 4, 0, 0, LIGHTHOUSE.beam);
  beamFill.addColorStop(0, 'rgba(255, 240, 190, 0.75)');
  beamFill.addColorStop(.3, 'rgba(255, 232, 160, 0.34)');
  beamFill.addColorStop(1, 'rgba(255, 220, 140, 0)');
  context.fillStyle = beamFill;
  context.globalAlpha = nearness;
  context.beginPath();
  context.moveTo(0, 0);
  context.arc(0, 0, LIGHTHOUSE.beam, -LIGHTHOUSE.halfAngle, LIGHTHOUSE.halfAngle);
  context.closePath();
  context.fill();
  context.globalAlpha = nearness * .6;
  context.beginPath();
  context.moveTo(0, 0);
  context.arc(0, 0, LIGHTHOUSE.beam * .85, -LIGHTHOUSE.halfAngle * .3, LIGHTHOUSE.halfAngle * .3);
  context.closePath();
  context.fill();
  context.restore();
  const lamp = context.createRadialGradient(0, 0, 0, 0, 0, 16);
  const pulse = .55 + (Math.sin(time / 300) + 1) * .12;
  lamp.addColorStop(0, `rgba(255, 246, 200, ${pulse})`);
  lamp.addColorStop(1, 'rgba(255, 220, 140, 0)');
  context.globalAlpha = 1;
  context.fillStyle = lamp;
  context.beginPath();
  context.arc(0, 0, 16, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/**
 * Draws the world in world space (the caller has already translated by -camera). `view` is the
 * visible world rectangle. Nothing here shifts painted pixels except the sprites cut out on
 * purpose (windmill sails, floating crystals); everything else is additive light or masked glints.
 */
function drawAnimatedWorld(context: CanvasRenderingContext2D, layers: WorldLayers, time: number, view: Rect) {
  context.drawImage(layers.base, 0, 0);

  // Water glints: world-locked dashes drifting slowly, clipped to the water mask.
  const scratch = getScratch(view.w, view.h);
  const scratchContext = scratch.getContext('2d');
  const pattern = scratchContext && getGlintPattern(scratchContext);
  if (scratchContext && pattern) {
    scratchContext.globalCompositeOperation = 'source-over';
    scratchContext.clearRect(0, 0, view.w, view.h);
    const drift = Math.floor(time / 150) % GLINT_TILE;
    const offsetX = ((drift - view.x) % GLINT_TILE + GLINT_TILE) % GLINT_TILE;
    const offsetY = ((-view.y) % GLINT_TILE + GLINT_TILE) % GLINT_TILE;
    scratchContext.save();
    scratchContext.translate(offsetX, offsetY);
    scratchContext.fillStyle = pattern;
    scratchContext.globalAlpha = .36;
    scratchContext.fillRect(-GLINT_TILE, -GLINT_TILE, view.w + GLINT_TILE * 2, view.h + GLINT_TILE * 2);
    scratchContext.restore();
    scratchContext.globalAlpha = 1;
    // Keep the dashes only where the water mask is; the mask's own colours are never drawn.
    scratchContext.globalCompositeOperation = 'destination-in';
    scratchContext.drawImage(layers.water, view.x, view.y, view.w, view.h, 0, 0, view.w, view.h);
    scratchContext.globalCompositeOperation = 'source-over';
    context.drawImage(scratch, view.x, view.y);
  }

  // Ambient light: windows and lanterns breathe between dim and bright, with a soft halo.
  const breath = (Math.sin(time / 750) + 1) / 2;
  context.globalCompositeOperation = 'screen';
  context.globalAlpha = .35 + breath * .65;
  context.drawImage(layers.lights, 0, 0);
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = .1 + breath * .45;
  context.drawImage(layers.glow, 0, 0);
  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;

  drawSmoke(context, time);

  // Floating orbs and crystals bob with a matching halo; animals wander a few pixels and hop.
  for (const floater of layers.floaters) {
    const cycle = (time + floater.phase) / floater.period * Math.PI * 2;
    const wave = Math.sin(cycle);
    let x = floater.x;
    let y = floater.y + wave * floater.amp;
    if (floater.motion === 'wander') {
      // Walk a few pixels one way, graze, walk back, graze; whole-pixel steps, slow bob while walking.
      const progress = (((time + floater.phase) % floater.period) + floater.period) % floater.period / floater.period;
      const range = 8;
      let along = 0;
      let walking = false;
      if (progress < .3) {
        along = progress / .3;
        walking = true;
      } else if (progress < .55) {
        along = 1;
      } else if (progress < .85) {
        along = 1 - (progress - .55) / .3;
        walking = true;
      }
      x = floater.x + Math.round(along * range);
      y = floater.y - (walking && Math.floor(time / 260) % 2 === 0 ? 1 : 0);
      context.drawImage(floater.canvas, x, y);
      continue;
    }
    context.globalCompositeOperation = 'lighter';
    const halo = context.createRadialGradient(floater.x + floater.w / 2, y + floater.h / 2, 1, floater.x + floater.w / 2, y + floater.h / 2, Math.max(floater.w, floater.h));
    halo.addColorStop(0, `${floater.glow}${(.16 + (wave + 1) * .06).toFixed(3)})`);
    halo.addColorStop(1, `${floater.glow}0)`);
    context.fillStyle = halo;
    context.beginPath();
    context.arc(floater.x + floater.w / 2, y + floater.h / 2, Math.max(floater.w, floater.h), 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    context.drawImage(floater.canvas, x, y);
  }

  // Waterfalls: the painted water stays; bright streaks fall over it, clipped to the water mask.
  for (const fall of layers.waterfalls) {
    const { rect } = fall;
    const fallContext = fall.scratch.getContext('2d');
    const streaks = fallContext && getStreakPattern(fallContext);
    if (!fallContext || !streaks) continue;
    const offset = Math.floor((time / 1000 * fall.speed) % STREAK_TILE);
    fallContext.globalCompositeOperation = 'source-over';
    fallContext.clearRect(0, 0, rect.w, rect.h);
    fallContext.save();
    fallContext.translate(0, offset);
    fallContext.fillStyle = streaks;
    fallContext.globalAlpha = .5;
    fallContext.fillRect(0, -STREAK_TILE, rect.w, rect.h + STREAK_TILE * 2);
    fallContext.restore();
    fallContext.globalAlpha = 1;
    fallContext.globalCompositeOperation = 'destination-in';
    fallContext.drawImage(fall.mask, 0, 0);
    fallContext.globalCompositeOperation = 'source-over';
    context.drawImage(fall.scratch, rect.x, rect.y);
  }

  // Windmill sails step 15 degrees at a time; the water wheel turns smoothly.
  for (const rotor of layers.rotors) {
    const rotation = rotor.smooth ? (time / rotor.phase) * Math.PI * 2 : (Math.floor((time + rotor.phase) / 170) % 24) * Math.PI / 12;
    context.save();
    context.translate(rotor.x, rotor.y);
    context.rotate(rotation);
    context.drawImage(rotor.canvas, -rotor.center, -rotor.center);
    context.restore();
  }

  drawLighthouse(context, time);
}

export function ProjectWorld() {
  const shellRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapPlayerRef = useRef<HTMLSpanElement>(null);
  const positionRef = useRef<Point>({ ...START });
  const keysRef = useRef(new Set<string>());
  const directionRef = useRef<Direction>('up');
  const joystickVectorRef = useRef<Point>({ x: 0, y: 0 });
  const joystickPointerRef = useRef<number | null>(null);
  const joystickKnobRef = useRef<HTMLSpanElement>(null);
  const walkTargetRef = useRef<WalkTarget | null>(null);
  const nearbyRef = useRef<Project | null>(START_PROJECT);
  const modalOpenRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [nearbyProject, setNearbyProject] = useState<Project | null>(START_PROJECT);
  const [activeProject, setActiveProject] = useState<Project>(START_PROJECT);
  const [projectOpen, setProjectOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<WorldAudio | null>(null);
  const mutedRef = useRef(false);
  const discoveredRef = useRef<Set<string>>(new Set());
  const [area, setArea] = useState('Glassroot Fields');
  const areaRef = useRef(area);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = new Set(JSON.parse(localStorage.getItem('nathan-world-discoveries-v2') || '[]') as string[]);
      discoveredRef.current = saved;
      setDiscovered(saved);
      if (localStorage.getItem(SOUND_PREFERENCE_KEY) === 'muted') setMuted(true);
    } catch {
      setDiscovered(new Set());
    }
  }, []);

  useEffect(() => {
    modalOpenRef.current = projectOpen;
    if (projectOpen) {
      keysRef.current.clear();
      walkTargetRef.current = null;
    }
  }, [projectOpen]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const blockTouchScroll = (event: TouchEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-scrollable], [role="dialog"]')) return;
      if (event.cancelable) event.preventDefault();
    };
    shell.addEventListener('touchmove', blockTouchScroll, { passive: false });
    return () => shell.removeEventListener('touchmove', blockTouchScroll);
  }, []);

  // Music and effects are synthesised on the fly; browsers only let audio start after a gesture,
  // so the engine starts on the first press or key and the speaker button mutes it.
  useEffect(() => {
    const audio = createWorldAudio();
    audioRef.current = audio;
    const wake = () => audio.start();
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('keydown', wake);
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
    audioRef.current?.setMuted(muted);
    try {
      localStorage.setItem(SOUND_PREFERENCE_KEY, muted ? 'muted' : 'on');
    } catch {
      // Preference is optional.
    }
  }, [muted]);

  const interact = useCallback(() => {
    const project = nearbyRef.current;
    if (!project) return;
    setActiveProject(project);
    setProjectOpen(true);
    audioRef.current?.play(discoveredRef.current.has(project.id) ? 'open' : 'discover');
    discoveredRef.current = new Set(discoveredRef.current).add(project.id);
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
      if (key === 'm' && !event.repeat) {
        audioRef.current?.play('map');
        setMapOpen((value) => !value);
      }
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
      window.__nwLayers = worldLayers;
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

    const shell = shellRef.current;
    const camera: Point = { x: 0, y: 0 };
    let tap: TapCandidate | null = null;
    let stepClock = STEP_INTERVAL;
    let resizeFrame = 0;

    const resize = () => {
      resizeFrame = 0;
      const viewportWidth = Math.round(window.visualViewport?.width ?? window.innerWidth);
      const viewportHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
      const mobileControls = window.matchMedia('(pointer: coarse)').matches || viewportWidth <= MOBILE_BREAKPOINT;
      const renderScale = computeRenderScale(viewportWidth, mobileControls);
      canvas.width = Math.ceil(viewportWidth / renderScale);
      canvas.height = Math.ceil(viewportHeight / renderScale);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      context.imageSmoothingEnabled = false;
      if (shell) {
        shell.style.setProperty('--world-scale', String(renderScale));
        shell.dataset.input = mobileControls ? 'touch' : 'pointer';
        shell.dataset.orientation = viewportWidth >= viewportHeight ? 'landscape' : 'portrait';
      }
    };
    const scheduleResize = () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    };

    const onCanvasPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'mouse') return;
      // A primary pointer means no other finger is down, so it also replaces a stale candidate
      // whose pointerup landed elsewhere; a non-primary pointer (pinch, palm) is never a tap.
      tap = event.isPrimary ? { pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp } : null;
    };
    const onCanvasPointerUp = (event: PointerEvent) => {
      const candidate = tap;
      tap = null;
      if (!candidate || candidate.pointerId !== event.pointerId || modalOpenRef.current) return;
      if (event.timeStamp - candidate.time >= TAP_MAX_DURATION) return;
      if (Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) >= TAP_MAX_MOVEMENT) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const cssToWorld = canvas.width / rect.width;
      walkTargetRef.current = {
        x: clamp(camera.x + (event.clientX - rect.left) * cssToWorld, 18, WORLD.width - 18),
        y: clamp(camera.y + (event.clientY - rect.top) * cssToWorld, 18, WORLD.height - 18),
        blockedFor: 0,
      };
    };
    const onCanvasPointerCancel = () => {
      tap = null;
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
      const position = positionRef.current;
      if (!modalOpenRef.current) {
        if (keys.has('w') || keys.has('arrowup')) dy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) dy += 1;
        if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
        if (keys.has('d') || keys.has('arrowright')) dx += 1;
        dx += joystickVectorRef.current.x;
        dy += joystickVectorRef.current.y;
      }

      // Direct input always wins; a walk target only steers when nothing else does.
      let target = walkTargetRef.current;
      if (dx || dy) {
        walkTargetRef.current = null;
        target = null;
      } else if (target) {
        const toTargetX = target.x - position.x;
        const toTargetY = target.y - position.y;
        const remaining = Math.hypot(toTargetX, toTargetY);
        if (remaining <= WALK_TARGET_REACH) {
          walkTargetRef.current = null;
          target = null;
        } else {
          dx = toTargetX / remaining;
          dy = toTargetY / remaining;
        }
      }

      // Keyboard + joystick can exceed unit length; a partial joystick push must stay slow.
      const inputLength = Math.hypot(dx, dy);
      if (inputLength > 1) {
        dx /= inputLength;
        dy /= inputLength;
      }
      const walking = inputLength > 0;
      if (walking) {
        stepClock += delta;
        if (stepClock >= STEP_INTERVAL) {
          stepClock = 0;
          audioRef.current?.play('step');
        }
      } else {
        stepClock = STEP_INTERVAL;
      }

      if (walking) {
        directionRef.current = Math.abs(dx) > Math.abs(dy)
          ? dx < 0 ? 'left' : 'right'
          : dy < 0 ? 'up' : 'down';
        const startX = position.x;
        const startY = position.y;
        const nextX = { x: clamp(position.x + dx * PLAYER_SPEED * delta, 18, WORLD.width - 18), y: position.y };
        if (canStand(nextX)) position.x = nextX.x;
        const nextY = { x: position.x, y: clamp(position.y + dy * PLAYER_SPEED * delta, 18, WORLD.height - 18) };
        if (canStand(nextY)) position.y = nextY.y;

        if (target) {
          const intended = PLAYER_SPEED * delta;
          const moved = Math.hypot(position.x - startX, position.y - startY);
          target.blockedFor = moved < intended * 0.25 ? target.blockedFor + delta : 0;
          if (target.blockedFor > WALK_TARGET_BLOCKED_LIMIT) walkTargetRef.current = null;
        }
      }
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
        audioRef.current?.play('area');
      }
      if (mapPlayerRef.current) {
        mapPlayerRef.current.style.left = `${(position.x / WORLD.width) * 100}%`;
        mapPlayerRef.current.style.top = `${(position.y / WORLD.height) * 100}%`;
      }

      const viewWidth = canvas.width;
      const viewHeight = canvas.height;
      const cameraX = clamp(Math.round(position.x - viewWidth / 2), 0, Math.max(0, WORLD.width - viewWidth));
      const cameraY = clamp(Math.round(position.y - viewHeight / 2), 0, Math.max(0, WORLD.height - viewHeight));
      camera.x = cameraX;
      camera.y = cameraY;
      context.clearRect(0, 0, viewWidth, viewHeight);
      if (worldLayers) {
        context.save();
        context.translate(-cameraX, -cameraY);
        drawAnimatedWorld(context, worldLayers, reducedMotion ? 0 : time, { x: cameraX, y: cameraY, w: viewWidth, h: viewHeight });
        context.restore();
      } else if (world.complete && world.naturalWidth) {
        context.drawImage(world, -cameraX, -cameraY);
      }

      const walkTarget = walkTargetRef.current;
      if (walkTarget) {
        drawWalkTarget(context, Math.round(walkTarget.x - cameraX), Math.round(walkTarget.y - cameraY), reducedMotion ? 0 : time);
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

    // Optional spawn point for testing: /?at=x,y (world pixels).
    const spawn = new URLSearchParams(window.location.search).get('at')?.split(',').map(Number);
    if (spawn && spawn.length === 2 && spawn.every(Number.isFinite)) {
      positionRef.current.x = clamp(spawn[0], 18, WORLD.width - 18);
      positionRef.current.y = clamp(spawn[1], 18, WORLD.height - 18);
    }

    resize();
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', scheduleResize);
    window.visualViewport?.addEventListener('resize', scheduleResize);
    canvas.addEventListener('pointerdown', onCanvasPointerDown);
    canvas.addEventListener('pointerup', onCanvasPointerUp);
    canvas.addEventListener('pointercancel', onCanvasPointerCancel);
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', scheduleResize);
      window.removeEventListener('orientationchange', scheduleResize);
      window.visualViewport?.removeEventListener('resize', scheduleResize);
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
      canvas.removeEventListener('pointerup', onCanvasPointerUp);
      canvas.removeEventListener('pointercancel', onCanvasPointerCancel);
    };
  }, []);

  const moveJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const maxDistance = rect.width * .31;
    const rawX = event.clientX - (rect.left + rect.width / 2);
    const rawY = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(rawX, rawY);
    const deadZone = distance < JOYSTICK_DEAD_ZONE;
    const unitX = deadZone ? 0 : rawX / distance;
    const unitY = deadZone ? 0 : rawY / distance;
    // Analog: a gentle nudge walks slowly, a full push runs at PLAYER_SPEED.
    const strength = deadZone ? 0 : Math.min(1, distance / maxDistance);
    joystickVectorRef.current = { x: unitX * strength, y: unitY * strength };
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = `translate(${unitX * strength * maxDistance}px, ${unitY * strength * maxDistance}px)`;
    }
  };

  const startJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    // One finger drives the stick; a second one is ignored until the first lets go.
    if (joystickPointerRef.current !== null) return;
    event.preventDefault();
    joystickPointerRef.current = event.pointerId;
    walkTargetRef.current = null;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The touch can be cancelled between events; the pointer id is tracked regardless.
    }
    moveJoystick(event);
  };

  const dragJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId === joystickPointerRef.current) moveJoystick(event);
  };

  const stopJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== joystickPointerRef.current) return;
    joystickPointerRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture is already gone (lostpointercapture / cancelled touch); nothing to release.
    }
    joystickVectorRef.current = { x: 0, y: 0 };
    if (joystickKnobRef.current) joystickKnobRef.current.style.transform = 'translate(0, 0)';
  };
  const progress = `${discovered.size}/${PROJECTS.length}`;

  return (
    <main ref={shellRef} className="pixel-world-shell" aria-label="Nathan's playable project world">
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
          <button className="pixel-icon-button" type="button" onClick={() => { audioRef.current?.play('map'); setMapOpen((value) => !value); }} aria-label="Toggle world map"><MapIcon /></button>
          <button className="pixel-icon-button" type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Turn sound on' : 'Mute sound'}>{muted ? <VolumeX /> : <Volume2 />}</button>
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

      <Dialog open={projectOpen} onOpenChange={(open) => { if (!open) audioRef.current?.play('close'); setProjectOpen(open); }}>
        <DialogContent className="world-dialog" showCloseButton>
          <figure className="world-dialog-shot">
            <img src={activeProject.image} alt={`${activeProject.projectName} interface`} loading="lazy" />
            <figcaption><span style={{ background: activeProject.accent }} />{activeProject.location} · {activeProject.area}</figcaption>
          </figure>
          <div className="world-dialog-copy">
            <DialogHeader className="world-dialog-header">
              <DialogTitle>{activeProject.projectName}</DialogTitle>
              <DialogDescription className="world-dialog-tagline">{activeProject.tagline}</DialogDescription>
              <div className="world-dialog-category" style={{ color: activeProject.accent }}>{activeProject.category}</div>
            </DialogHeader>
            <ul className="world-dialog-details">
              {activeProject.details.map((detail) => <li key={detail}><i style={{ backgroundColor: activeProject.accent }} />{detail}</li>)}
            </ul>
            <div className="world-dialog-actions">
              <Button nativeButton={false} render={<a href={activeProject.href} target="_blank" rel="noreferrer" />} className="world-dialog-primary"><FolderGit2 /> View on GitHub <ExternalLink /></Button>
              <Button variant="ghost" onClick={() => setProjectOpen(false)}>Return to world</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

/**
 * Gallery images per project, shown in the project viewer (arrows step through
 * them); the first is the card cover. Paths are under public/. Credits are only
 * kept for images that are not Nathan's own screenshots or plots. A shot with a
 * `video` plays it as a muted loop in the viewer, with `src` as its poster (and
 * as the still wherever a card shows the shot). `video` is the path without its
 * extension: a .webm (VP9) and an .mp4 (H.264) sit side by side under it.
 */
export type Shot = { src: string; caption: string; credit?: string; video?: string };

export const GALLERY: Record<string, Shot[]> = {
  'siege': [
    { src: '/projects/siege/1.webp', caption: 'Clash Royale arena mid-battle (official Supercell screenshot)', credit: 'https://apps.apple.com/us/app/clash-royale/id1053012308' },
    { src: '/projects/siege/2.webp', caption: 'Live WebGL viewer of the policy network mid-match' },
    { src: '/projects/siege/3.webp', caption: 'Architecture diagram: 2.68M-parameter policy network' },
    { src: '/projects/siege/4.webp', caption: 'Self-play training curve vs five scripted archetypes' },
  ],
  'kumi': [
    { src: '/projects/kumi/1.webp', caption: 'Shared task board with owners and status' },
    { src: '/projects/kumi/2.webp', caption: 'Task overview: brief, access, Codex results' },
    { src: '/projects/kumi/3.webp', caption: 'Team chat with the Codex composer' },
    { src: '/projects/kumi/4.webp', caption: 'Task lifecycle states from the architecture reference' },
  ],
  'black-hole': [
    { src: '/projects/black-hole/1.webp', caption: 'Lensed accretion disk at 80° inclination' },
    { src: '/projects/black-hole/2.webp', caption: 'Fresh 60° render: photon ring and secondary image' },
    { src: '/projects/black-hole/3.webp', caption: 'Shadow with lensed checkerboard, analytic overlay' },
    { src: '/projects/black-hole/4.webp', caption: 'Precessing 3D timelike geodesics' },
  ],
  'aero': [
    { src: '/projects/aero/1.webp', video: '/projects/aero/1', caption: 'An STL aircraft in the 3D tunnel: the wake |u − U∞| replayed as a time-lapse while the camera orbits' },
    { src: '/projects/aero/2.webp', video: '/projects/aero/2', caption: 'The browser UI on a cylinder at Re 100: smoke advected on the GPU through the solved flow' },
    { src: '/projects/aero/3.webp', caption: 'The same UI in 3D: case properties, live checks, coefficients with 95 % intervals, convergence' },
    { src: '/projects/aero/4.webp', caption: 'Sphere drag against Schiller–Naumann: tunnel confinement, grid bias and local refinement' },
    { src: '/projects/aero/5.webp', caption: 'CPU throughput before and after the tiled, fused Numba kernels' },
  ],
  "hf-scf": [
    { src: "/projects/hf-scf/1.webp", caption: "The redesigned engine after a converged run: case setup, 3-D viewport and results in one window" },
    { src: "/projects/hf-scf/2.webp", caption: "Water's frontier orbitals, HOMO-3 up to LUMO+2, drawn from the cube the solver returns" },
    { src: "/projects/hf-scf/3.webp", caption: "The orbital table: occupancy and energy in Hartree and eV for every molecular orbital" },
    { src: "/projects/hf-scf/4.webp", caption: "The same app in its light theme, with the HOMO-3 isosurface in the viewport" },
  ],
  "quantize": [
    { src: "/projects/quantize/1.webp", caption: "Nine molecules, three methods: the hybrid against theory alone and against mixed estimation" },
    { src: "/projects/quantize/2.webp", caption: "It improves with the level of theory, and predicts isotopologues it never saw" },
    { src: "/projects/quantize/3.webp", caption: "Are the quoted error bars honest? 90 % coverage where 68 % would be ideal" },
    { src: "/projects/quantize/4.webp", caption: "The joint objective: a spectroscopic chi-square and the quantum energy, minimised together" },
  ],
  'formulate': [
    { src: '/projects/formulate/1.webp', caption: 'Pareto frontier of a coating-solvent design run' },
    { src: '/projects/formulate/2.webp', caption: 'Polymer Tg predictions: 22 K held-out RMSE' },
    { src: '/projects/formulate/3.webp', caption: 'Learned boiling point on 2,050 held-out compounds' },
    { src: '/projects/formulate/4.webp', caption: 'Expert uncertainty calibration vs 68% honesty line' },
  ],
  "high-risk-roads": [
    { src: "/projects/high-risk-roads/1.webp", caption: "The 11 flagged corridors across Sacramento" },
    { src: "/projects/high-risk-roads/2.webp", caption: "Every 2023 crash on the flagged roads" },
    { src: "/projects/high-risk-roads/3.webp", caption: "Crash share by hour: 22% fall in the 4-6 PM peak" },
    { src: "/projects/high-risk-roads/4.webp", caption: "Crash rate vs critical rate, road by road" },
  ],
  "aether6": [
    { src: "/projects/aether6/1.webp", caption: "Closed-loop 3-D flight path: six waypoints, two laps, flown on the EKF estimate in wind" },
    { src: "/projects/aether6/2.webp", caption: "Ground track and cross-track error: 11.8 m RMS on the nominal mission" },
    { src: "/projects/aether6/3.webp", caption: "The 18-state EKF converging in flight: position, velocity, attitude, gyro bias, baro bias" },
    { src: "/projects/aether6/4.webp", caption: "256-trial Monte Carlo: 248 completed, the 8 failures in the heavy, low-lift corner" },
  ],
  "ignis": [
    { src: "/projects/ignis/1.webp", video: "/projects/ignis/1", caption: "The RS-25's plume marched from rest and drawn as a GPU volume inside NASA's model of the bell" },
    { src: "/projects/ignis/2.webp", video: "/projects/ignis/2", caption: "The Engine Explorer's Flow tab: the RS-25 at 6 km, 21 ms of flow, beside Rocketdyne's numbers" },
    { src: "/projects/ignis/3.webp", caption: "The Explorer's thermal tab: integral boundary layer, live constraint checks, the real engine alongside" },
    { src: "/projects/ignis/4.webp", caption: "Ignis-M1 wall temperature: Bartz, the integral boundary layer, and the 3 % fuel film that fixed it" },
    { src: "/projects/ignis/5.webp", caption: "Gas-side heat transfer against a JPL air nozzle and a NASA hydrogen-oxygen rocket" },
    { src: "/projects/ignis/6.webp", caption: "The RS-25 against Rocketdyne's published engine and turbopump figures" },
    { src: "/projects/ignis/7.webp", caption: "Monte Carlo on the M1: 118 of 2,000 samples over the wall limit, down from 973" },
  ],
  "sparlab": [
    { src: "/projects/sparlab/1.webp", caption: "An engine mount optimised in 3-D, under its 12 kN vertical pin load" },
    { src: "/projects/sparlab/2.webp", caption: "The same part before and after: a CAD solid meshed in Gmsh, 25 % of the material kept" },
    { src: "/projects/sparlab/3.webp", caption: "A two-bolt bracket in plane, carrying the stress field of its own optimised topology" },
    { src: "/projects/sparlab/4.webp", caption: "What a stress constraint buys: the re-entrant corner rounded, peak stress down 25 %" },
  ],
  "machina": [
    { src: "/projects/machina/1.webp", caption: "Shape error over a formed part, before and after correction: the best and a typical case" },
    { src: "/projects/machina/2.webp", caption: "Four ways to form the part: 0.300 mm of error uncorrected, 0.189 mm with the edge pass and ML" },
    { src: "/projects/machina/3.webp", caption: "Per part across the eight held-out shapes; it beats the plain ML first shot on seven" },
    { src: "/projects/machina/4.webp", caption: "The forming solver against published measurements of a deep-drawn benchmark" },
  ],
};

/**
 * Gallery images per project, shown in the project viewer (arrows step through
 * them); the first is the card cover. Paths are under public/. Credits are only
 * kept for images that are not Nathan's own screenshots or plots.
 */
export type Shot = { src: string; caption: string; credit?: string };

export const GALLERY: Record<string, Shot[]> = {
  'gambit': [
    { src: '/projects/gambit/1.webp', caption: 'Alpha-beta over the net finds mate in 2' },
    { src: '/projects/gambit/2.webp', caption: 'Training curves: 42.8% to 48.2% move agreement' },
    { src: '/projects/gambit/3.webp', caption: 'Policy head opening preferences, no search' },
    { src: '/projects/gambit/4.webp', caption: 'Tactics sanity check, 4 of 4 found' },
  ],
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
  'voice-agents': [
    { src: '/projects/voice-agents/1.webp', caption: 'Clip app: projects, listening, checklist detail' },
    { src: '/projects/voice-agents/2.webp', caption: 'Voice capture flow from tap to listening' },
    { src: '/projects/voice-agents/3.webp', caption: 'Data collection notes, history, create sheet' },
  ],
  'nonstandard': [
    { src: '/projects/nonstandard/1.webp', caption: 'Title screen with wizard and owl' },
    { src: '/projects/nonstandard/2.webp', caption: 'Isometric workshop with three-station bench' },
    { src: '/projects/nonstandard/3.webp', caption: 'Shop with RDKit-drawn chemical structures' },
    { src: '/projects/nonstandard/4.webp', caption: 'Grimoire reaction page with electron-pushing mechanism' },
  ],
  'black-hole': [
    { src: '/projects/black-hole/1.webp', caption: 'Lensed accretion disk at 80° inclination' },
    { src: '/projects/black-hole/2.webp', caption: 'Fresh 60° render: photon ring and secondary image' },
    { src: '/projects/black-hole/3.webp', caption: 'Shadow with lensed checkerboard, analytic overlay' },
    { src: '/projects/black-hole/4.webp', caption: 'Precessing 3D timelike geodesics' },
  ],
  'aero': [
    { src: '/projects/aero/1.webp', caption: 'Kármán vortex street, cylinder at Re 150' },
    { src: '/projects/aero/2.webp', caption: 'Aero CFD Studio desktop GUI, 2D case' },
    { src: '/projects/aero/3.webp', caption: 'STL airplane voxelized onto D3Q19 lattice' },
    { src: '/projects/aero/4.webp', caption: '3D sphere wind tunnel with streamlets' },
  ],
  'hf-scf': [
    { src: '/projects/hf-scf/1.webp', caption: 'Water RHF/STO-3G converged with 3D ball-and-stick model' },
    { src: '/projects/hf-scf/2.webp', caption: 'Water HOMO isosurface rendered in the 3Dmol viewer' },
    { src: '/projects/hf-scf/3.webp', caption: 'Formaldehyde 6-31G* pi-star LUMO orbital lobes' },
    { src: '/projects/hf-scf/4.webp', caption: 'Energies, dipole, orbital table and time estimate' },
  ],
  'quantize': [
    { src: '/projects/quantize/1.webp', caption: 'RMS bond-length error: theory vs spectroscopy vs hybrid' },
    { src: '/projects/quantize/2.webp', caption: 'Systematic C–F bias in theory, removed by data' },
    { src: '/projects/quantize/3.webp', caption: 'Per-bond signed error for all three molecules' },
    { src: '/projects/quantize/4.webp', caption: 'SVD rank vs structural degrees of freedom' },
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
  "sasd-hfml": [
    { src: "/projects/sasd-hfml/3.webp", caption: "Five-phase pipeline diagram with trace detail" },
    { src: "/projects/sasd-hfml/1.webp", caption: "Streamlit control panel after a full Run All" },
  ],
  'hackdavis': [
    { src: '/projects/hackdavis/1.webp', caption: "Popup: idle, and mid-session enhancing 720p to 4K" },
    { src: '/projects/hackdavis/2.webp', caption: "Before and after the three shader passes" },
    { src: '/projects/hackdavis/3.webp', caption: "Icon set and the toggle injected into YouTube" },
  ],
  "aether6": [
    { src: "/projects/aether6/1.webp", caption: "Closed-loop 3-D flight path: six waypoints, two laps, flown on the EKF estimate in wind" },
    { src: "/projects/aether6/2.webp", caption: "Ground track and cross-track error: 11.8 m RMS on the nominal mission" },
    { src: "/projects/aether6/3.webp", caption: "The 18-state EKF converging in flight: position, velocity, attitude, gyro bias, baro bias" },
    { src: "/projects/aether6/4.webp", caption: "256-trial Monte Carlo: 248 completed, the 8 failures in the heavy, low-lift corner" },
  ],
  "ignis": [
    { src: "/projects/ignis/1.webp", caption: "The Ignis-M1 bell nozzle coloured by Mach number: M = 1 at the throat, 3.46 at the exit" },
    { src: "/projects/ignis/2.webp", caption: "Equilibrium chamber composition against mixture ratio, LOX/CH4 at 5.5 MPa" },
    { src: "/projects/ignis/3.webp", caption: "Cooling-channel design space: peak wall temperature and jacket pressure drop" },
    { src: "/projects/ignis/4.webp", caption: "Sensitivity ranking: the Bartz correlation alone drives wall temperature (SRC 0.994)" },
  ],
  "sparlab": [
    { src: "/projects/sparlab/1.webp", caption: "A two-bolt bracket going from solid plate to truss over the first 162 SIMP iterations" },
    { src: "/projects/sparlab/2.webp", caption: "The bracket density field and its interpretation as solid material at density ≥ 0.5" },
    { src: "/projects/sparlab/3.webp", caption: "Wing rib at 40 % volume: spar pads and skin flanges forced solid, the rest optimised" },
    { src: "/projects/sparlab/4.webp", caption: "Mass–stiffness trade and first natural frequency across the volume-fraction sweep" },
  ],
};

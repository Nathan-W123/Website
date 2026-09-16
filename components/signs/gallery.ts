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
};

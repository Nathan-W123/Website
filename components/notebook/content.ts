/**
 * Content for the painted field-notebook portfolio.
 *
 * Names, taglines, notes, links and print images mirror the PROJECTS array in
 * components/project-world.tsx (the playable map). Chapter order, ledes, stack
 * lines and wash colours follow docs/notebook-design.md.
 */

export type Wash = 'space' | 'fluid' | 'chem' | 'umber';

export type ChapterId = 'simulate' | 'learn' | 'make';

export type NotebookProject = {
  id: string;
  name: string;
  /** One line under the name: what it actually is. */
  tagline: string;
  /** Languages and the main techniques, separated by middle dots. */
  stack: string;
  /** Exactly three short annotations. */
  notes: string[];
  href: string;
  /** Print of the real output, served from public/. */
  image: string;
  wash: Wash;
  /** Hex of the wash colour, from the design tokens. */
  accentHex: string;
  chapter: ChapterId;
};

export type Chapter = {
  id: ChapterId;
  number: string;
  title: string;
  /** Two plain sentences. */
  lede: string;
  projects: NotebookProject[];
};

/** Wash colours from the design tokens (docs/notebook-design.md). */
export const WASH_HEX: Record<Wash, string> = {
  space: '#243A5E',
  fluid: '#2F6FA8',
  chem: '#6D4EA1',
  umber: '#8B5A2B',
};

/** The one accent: yellow-ochre for links, ticks and the scroll rule. */
export const MARK_HEX = '#D9A93B';

export const SITE = {
  name: 'Nathan W.',
  thesis:
    'I build simulators — of spacetime, air and molecules — and the agents and tools that learn and work inside them.',
  eyebrow: 'Field notebook · Nathan W.',
  contact: {
    github: 'https://github.com/Nathan-W123',
    email: 'hello@nathanw.me',
  },
};

const project = (
  chapter: ChapterId,
  wash: Wash,
  fields: Omit<NotebookProject, 'chapter' | 'wash' | 'accentHex' | 'image'>,
): NotebookProject => ({
  ...fields,
  chapter,
  wash,
  accentHex: WASH_HEX[wash],
  image: `/projects/${fields.id}.webp`,
});

export const CHAPTERS: Chapter[] = [
  {
    id: 'simulate',
    number: '01',
    title: 'Simulate',
    lede:
      'Solvers for physical systems, written from the governing equations: null geodesics around a black hole, lattice-Boltzmann flow past a body, Hartree–Fock for a molecule. Two of them run in reverse, recovering a structure from its spectrum or a candidate material from the behaviour you want.',
    projects: [
      project('simulate', 'space', {
        id: 'black-hole',
        name: 'Black Hole Sim',
        tagline: 'A general-relativistic ray tracer that renders black holes and their accretion disks.',
        stack: 'Python · NumPy · ray tracing',
        notes: [
          'Backward ray tracing from an arbitrary camera',
          'Relativistic accretion-disk color and Doppler shifts',
          'Photon rings, lensed starfields, and secondary images',
        ],
        href: 'https://github.com/Nathan-W123/Black-Hole-Sim',
      }),
      project('simulate', 'fluid', {
        id: 'aero',
        name: 'Aero',
        tagline: 'A lattice-Boltzmann wind-tunnel simulator for 2D and 3D flows.',
        stack: 'Python · NumPy · lattice Boltzmann · STL voxelization',
        notes: [
          'D2Q9 and D3Q19 solvers with multiple collision models',
          'Analytic geometry and STL voxelization workflows',
          'Lift, drag, scalar, thermal, and force observables',
        ],
        href: 'https://github.com/Nathan-W123/Aero',
      }),
      project('simulate', 'chem', {
        id: 'hf-scf',
        name: 'HF–SCF Engine',
        tagline: 'A Hartree–Fock quantum-chemistry engine with an interactive web calculator.',
        stack: 'Python · PySCF · web calculator · 3D viewer',
        notes: [
          'Restricted Hartree–Fock on a PySCF backend',
          'Molecule input, basis-set picker and a 3D molecular viewer',
          'Live at hf-scf-engine.vercel.app',
        ],
        href: 'https://github.com/Nathan-W123/HF-SCF-Engine',
      }),
      project('simulate', 'chem', {
        id: 'quantize',
        name: 'Quantize',
        tagline: 'Recovers molecular geometry from rotational spectra plus quantum chemistry.',
        stack: 'Python · NumPy · SVD · quantum-chemistry gradients',
        notes: [
          'SVD separates spectroscopy-sensitive and null directions',
          'Quantum gradients stabilize underspecified structures',
          'Multi-isotopologue fitting with correction provenance',
        ],
        href: 'https://github.com/Nathan-W123/Quantize',
      }),
      project('simulate', 'chem', {
        id: 'formulate',
        name: 'Formulate',
        tagline: 'An inverse materials engine that turns desired behaviour into ranked candidate molecules.',
        stack: 'Python · Pareto search · quantum and MD validation',
        notes: [
          'Unit-safe target specifications and uncertainty',
          'Search, expert prediction, and Pareto ranking',
          'Selective quantum and molecular-dynamics validation',
        ],
        href: 'https://github.com/Nathan-W123/Formulate',
      }),
      project('simulate', 'space', {
        id: 'aether6',
        name: "Aether-6",
        tagline: "A six-degree-of-freedom fixed-wing flight simulator: trim, LQR autopilots, waypoint guidance, simulated avionics and an error-state EKF, closed on its own estimate.",
        stack: "C++17 · Eigen · RK4 / Dormand-Prince · LQR · error-state EKF · Monte Carlo",
        notes: ["13-state nonlinear 6-DOF model with Dryden turbulence and multi-rate sensors", "LQR gains synthesised at run time from the linearised model", "256-trial Monte Carlo that found three real defects"],
        href: "https://github.com/Nathan-W123/Aether6",
      }),
      project('simulate', 'fluid', {
        id: 'ignis',
        name: "Ignis",
        tagline: "A thermochemical liquid-rocket engine simulator: equilibrium combustion, quasi-1D nozzle flow, regenerative cooling, start-up transients, optimisation and Monte Carlo.",
        stack: "C++17 · Eigen · Gibbs minimisation · quasi-1D nozzle · Bartz cooling · Nelder–Mead",
        notes: ["Agrees with NASA CEA to 0.18 % on flame temperature over 156 cases", "Every balance reported as a residual, not assumed", "Deterministic Monte Carlo, byte-identical at any thread count"],
        href: "https://github.com/Nathan-W123/Ignis",
      }),
      project('simulate', 'umber', {
        id: 'sparlab',
        name: "SparLab",
        tagline: "A 2-D finite-element solver with SIMP topology optimisation, built for lightweight aerospace parts and verified against exact answers.",
        stack: "C++17 · Eigen sparse · Q4 finite elements · SIMP · optimality criteria · modal analysis",
        notes: ["Bilinear quad elements, exact Dirichlet partitioning, sparse Cholesky", "Analytical sensitivities checked against central differences to 2e-8", "A bracket 41 % higher in first frequency than a plate of equal mass"],
        href: "https://github.com/Nathan-W123/SparLab",
      }),
    ],
  },
  {
    id: 'learn',
    number: '02',
    title: 'Learn',
    lede:
      'Agents that learn a game by playing it, where the rules are exact and the score cannot be argued with. One plays bullet chess against people on Lichess; the other learns Clash Royale against copies of itself in a simulator built for the purpose.',
    projects: [
      project('learn', 'umber', {
        id: 'gambit',
        name: 'Gambit',
        tagline: 'A chess neural network that plays bullet games on Lichess through the bot API.',
        stack: 'Python · residual CNN · alpha-beta search · ONNX',
        notes: [
          'Policy-and-value residual convolutional network',
          'Alpha-beta search tuned for bullet time controls',
          'ONNX inference and legal-move masking',
        ],
        href: 'https://github.com/Nathan-W123/Gambit',
      }),
      project('learn', 'umber', {
        id: 'siege',
        name: 'Siege',
        tagline: 'A reinforcement-learning agent that learns Clash Royale strategy inside a custom simulator.',
        stack: 'Python · self-play RL · WebGL network viewer',
        notes: [
          'Config-driven simulator and scripted opponents',
          'Masked policy with league self-play',
          'Training reports and a live WebGL network viewer',
        ],
        href: 'https://github.com/Nathan-W123/Siege',
      }),
    ],
  },
  {
    id: 'make',
    number: '03',
    title: 'Coordinate & make',
    lede:
      'Tools for working alongside other people and other agents, and things made quickly with them: a layer that lets humans and coding agents share one codebase, a chemistry game from a build week, a voice app from a hackathon weekend. The playable map this site used to be is kept at the end as an experiment.',
    projects: [
      project('make', 'umber', {
        id: 'kumi',
        name: 'Kumi',
        tagline: 'A coordination layer that lets people and coding agents work on one codebase in parallel.',
        stack: 'TypeScript · git worktrees · agent orchestration',
        notes: [
          'Isolated worktrees and conflict-aware scheduling',
          'Human and multi-agent task coordination',
          'Approvals, audit history, and atomic promotion',
        ],
        href: 'https://github.com/Nathan-W123/Kumi',
      }),
      project('make', 'fluid', {
        id: 'high-risk-roads',
        name: 'High Risk Roads',
        tagline: 'Which Sacramento streets are dangerous once traffic and length are accounted for: crash rates against a 95% critical rate, mapped.',
        stack: 'R · tidyverse · Leaflet · OpenStreetMap',
        notes: ['2023 collision records joined to AADT counts and OpenStreetMap road lengths', 'Crash rate per 10 million vehicle-miles tested against a critical rate; 11 corridors flagged', 'Final project for ECI 016 at UC Davis, written up as a 16-page report'],
        href: '/docs/high-risk-roads-sacramento.pdf',
      }),
      project('make', 'fluid', {
        id: 'sasd-hfml',
        name: 'SASD HFML Pipeline',
        tagline: "A desktop app that runs a sewer district's monthly high-frequency mainline pipeline: SQL to Excel to ArcGIS to PDF maps.",
        stack: 'Python · Streamlit · arcpy · SQL Server',
        notes: ['Five phases from database query to exported map, run from one Streamlit screen', 'Upsert sync into ArcGIS attribute tables and a recursive upstream trace of mains, laterals and parcels', 'Built for analysts with ArcGIS Pro on their own Windows machines'],
        href: 'https://github.com/Nathan-W123/SASD-HFML-Project',
      }),
      project('make', 'umber', {
        id: 'hackdavis',
        name: 'Green Giant',
        tagline: 'A Chrome extension that cleans up low-bitrate YouTube video on the GPU in real time, built at HackDavis 2026.',
        stack: 'JavaScript · WebGL shaders · ONNX Runtime Web · Chrome extension',
        notes: ['Three fragment-shader passes on every frame: deblock and deband, contrast-adaptive sharpening, an Anime4K-style edge restore', 'A performance guard that backs off when frame rate drops, and a popup that tallies the energy not spent streaming 4K', 'An experimental ONNX super-resolution path running in the background worker'],
        href: 'https://github.com/Nathan-W123/HackDavis26',
      }),
      project('make', 'chem', {
        id: 'nonstandard',
        name: 'Nonstandard Conditions',
        tagline:
          'A single-player organic-chemistry workshop: buy materials, run a real three-station lab, fulfil commissions.',
        stack: 'React · Three.js · Rapier · RDKit',
        notes: [
          'Real molecular transforms with an RDKit backend that owns chemistry, inventory and saves',
          'Explorable 3D laboratory built with React, Three.js and Rapier',
          'Built with Ethan Truong during OpenAI build week; playable at nsc.up.railway.app',
        ],
        href: 'https://github.com/EthanVTruong/nonstandardconditions',
      }),
      project('make', 'fluid', {
        id: 'voice-agents',
        name: 'Voice Agents',
        tagline: 'A real-time voice-capture app built at a YC hackathon.',
        stack: 'TypeScript · Expo / React Native · Python · Supabase',
        notes: [
          'Expo / React Native app with a native iOS target',
          'Python backend with Supabase storage for captures',
          'Built in a weekend at a YC hackathon',
        ],
        href: 'https://github.com/Nathan-W123/YCHackVoiceAgents',
      }),
      project('make', 'umber', {
        id: 'website',
        name: 'Nathan’s World',
        tagline: 'The earlier version of this site: a playable top-down world where every building is a project.',
        stack: 'TypeScript · React · Canvas · Cloudflare Workers',
        notes: [
          'Top-down exploration with keyboard and touch controls',
          'Place-based project storytelling',
          'A growing world for future work and experiments',
        ],
        href: 'https://github.com/Nathan-W123/Website',
      }),
    ],
  },
];

/** Every project in reading order (chapter by chapter). */
export const NOTEBOOK_PROJECTS: NotebookProject[] = CHAPTERS.flatMap((chapter) => chapter.projects);

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
        tagline: 'A lattice-Boltzmann wind tunnel for 2D and 3D flows, with a browser UI that renders the flow as live smoke.',
        stack: 'Python · Numba · lattice Boltzmann · WebGL2 volume rendering',
        notes: [
          'D2Q9, D3Q19 and D3Q27 with BGK, TRT, MRT and regularized collision',
          'Drag with a 95 % interval, a blockage correction and a grid study',
          'Sphere drag within 1.9 % of Schiller–Naumann once the tunnel walls are removed',
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
        tagline: "A thermochemical liquid-rocket engine simulator, from equilibrium combustion through the boundary layer, regenerative cooling and the turbopump cycle, with a desktop Explorer that opens on the RS-25.",
        stack: "C++17 · Eigen · Gibbs minimisation · integral boundary layer · turbopump cycles · PySide6 / OpenGL",
        notes: ["Agrees with NASA CEA to 0.18 % on flame temperature over 156 cases", "Heat transfer checked against two 1965 experiments; the RS-25 within 1 % on vacuum Isp", "Exhaust plume marched live and drawn as a GPU volume inside NASA's model of the bell"],
        href: "https://github.com/Nathan-W123/Ignis",
      }),
      project('simulate', 'umber', {
        id: 'sparlab',
        name: "SparLab",
        tagline: "A 2-D and 3-D finite-element solver with SIMP topology optimisation, built for lightweight aerospace parts and cross-validated against CalculiX.",
        stack: "C++17 · Eigen sparse · Hex8 / Tet10 solids · SIMP · algebraic multigrid · stress and buckling constraints",
        notes: ["One dimension-generic core: plates, solids and CAD parts meshed in Gmsh", "Multigrid CG solves a million degrees of freedom in three seconds", "A 3-D bracket 25.7 % higher in first frequency at 30 % of the mass"],
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
      project('learn', 'umber', {
        id: 'machina',
        name: "Machina",
        tagline: "A forming simulator and ML surrogate that predicts how a sheet-metal part springs back, and forms a corrected shape so the first part lands on target.",
        stack: "C++17 · Eigen · contact and plasticity FE · scikit-learn / PyTorch surrogates · Bayesian optimisation",
        notes: ["A C++ forming solver: moving rigid tools, frictional contact, Hill48 / Chaboche plasticity", "ML surrogates with uncertainty, an out-of-distribution check and a transfer model", "37 % less shape error than no correction, in one forming run instead of two"],
        href: "https://github.com/Nathan-W123/springback-precomp",
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

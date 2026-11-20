/**
 * Where each project's pictures sit in its write-up: a chip goes in right
 * after the phrase the pictures show (before any full stop or comma that
 * follows it), and opens into those pictures. `shots` are indices into the
 * project's gallery (components/signs/gallery.ts), one to three a chip, and
 * every picture of every project is placed somewhere. Phrases are copied
 * from the write-ups (components/signs/studies.ts); one that is not found
 * is skipped (the page warns in development).
 */
export type Place = { after: string; shots: number[] };

export const PLACES: Record<string, Place[]> = {
  machina: [
    { after: 'away from what you asked for', shots: [0] },
    { after: 'plasticity at finite strain', shots: [3] },
    { after: 'On eight held-out parts', shots: [2, 1] },
  ],
  siege: [
    { after: 'on an elixir budget', shots: [0] },
    { after: 'both masked for legality', shots: [1, 2] },
    { after: 'over 100 matches each', shots: [3] },
  ],
  gambit: [
    { after: 'a distribution over 4,672 moves', shots: [2, 3] },
    { after: "plays the human's move 48.2% of the time", shots: [1] },
    { after: 'scores the leaves with the value head', shots: [0] },
  ],
  aero: [
    { after: 'an STL of an aircraft', shots: [0] },
    { after: 'and live convergence', shots: [2, 1] },
    { after: 'about 29 MLUPS', shots: [4] },
    { after: 'expected band for that blockage', shots: [3] },
  ],
  aether6: [
    { after: 'never the true state', shots: [2] },
    { after: 'flown twice in 300 seconds', shots: [0, 1] },
    { after: 'closed-loop regression and determinism', shots: [3] },
  ],
  ignis: [
    { after: 'from the propellants up', shots: [0] },
    { after: 'regenerative cooling', shots: [3, 4, 6] },
    { after: 'RS-25 bell', shots: [1, 2] },
    { after: 'to within 4.5 per cent', shots: [5] },
  ],
  'black-hole': [
    { after: 'from a camera near it', shots: [0] },
    { after: 'integrated forward from the camera', shots: [3] },
    { after: 'the disk is struck more than once', shots: [1] },
    { after: 'against closed-form values', shots: [2] },
  ],
  sparlab: [
    { after: 'load cases and a mass budget', shots: [0, 1] },
    { after: 'a part rather than a grey field', shots: [2, 3] },
  ],
  'hf-scf': [
    { after: 'minimize the electronic energy self-consistently', shots: [1] },
    { after: 'behind a FastAPI backend', shots: [0] },
    { after: 'any orbital from HOMO-3 to LUMO+3', shots: [2, 3] },
  ],
  quantize: [
    { after: 'One joint objective', shots: [3] },
    { after: '6.9 for spectroscopy alone', shots: [0, 1, 2] },
  ],
  formulate: [
    { after: 'a boiling-point window', shots: [2] },
    { after: 'a panel of seventeen property experts', shots: [1] },
    { after: 'each carrying its own uncertainty', shots: [3] },
    { after: 'a three-compound Pareto frontier', shots: [0] },
  ],
  olson: [
    { after: 'three automatic sliding doors', shots: [0, 1] },
    { after: 'down the west side to meet it', shots: [2, 3] },
    { after: 'the seismic demand on the same wall is 3.7 psf', shots: [4] },
    { after: 'are all sized to it', shots: [5] },
  ],
  terra: [
    { after: 'a local-first assistant for orchard growers', shots: [2, 0, 1] },
    // the raw and filtered maps were near twins of the flagged one: the
    // flagged station and the chat about it, then the neighbours' map
    { after: 'nine kinds of fault', shots: [5, 7] },
    { after: "with its neighbours'", shots: [6, 9] },
    { after: 'per station-month', shots: [8] },
  ],
  'high-risk-roads': [
    { after: 'are actually dangerous', shots: [0] },
    { after: '2023 collision records', shots: [1, 2] },
    { after: 'flagged for engineering attention', shots: [3] },
  ],
};

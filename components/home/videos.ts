/** a page of its own for a video, so it has a link to send (LinkedIn, say):
 *  /video/<id>/ (app/video/[id]/page.tsx), with its title, a line about it,
 *  the picture a sent link shows (drawn by work/ref/video-og.mjs) and the
 *  project's code */
export type Share = { title: string; about: string; og: string; code?: string };

/** a video a write-up can play, from a button beside its code link: the path
 *  without its ending (a .webm and an .mp4), its poster, and what it shows */
export type Video = { src?: string; poster?: string; embed?: string; caption: string; sound?: boolean; share?: Share };

export const VIDEOS: Record<string, Video> = {
  // the videos Nathan made for LinkedIn (work/ref/project-videos.mjs)
  aether6: {
    // a new name, not flight: browsers kept the old clip cached under that one
    src: '/projects/aether6/circuit',
    poster: '/projects/aether6/circuit.webp',
    caption: 'The autonomous circuit: the autopilot flying the waypoints lap after lap on its own estimate',
  },
  // two clips from the old site's gallery (components/signs/gallery.ts), silent loops
  aero: {
    src: '/projects/aero/1',
    poster: '/projects/aero/1.webp',
    caption: 'An aircraft in the 3D tunnel: its wake replayed as a time-lapse while the camera orbits',
  },
  ignis: {
    src: '/projects/ignis/1',
    poster: '/projects/ignis/1.webp',
    caption: 'The RS-25’s plume, marched from rest and drawn as a GPU volume inside NASA’s model of the bell',
  },
  // Terra's video, as its landing page (terra-orchard-landing.vercel.app) embeds it
  terra: {
    embed: 'https://www.youtube-nocookie.com/embed/awrDA6VIbRQ?autoplay=1&rel=0',
    caption: 'Terra, from its landing page',
  },
  // the narrated explainer from his application (work/ref/quantize-video.mjs):
  // it has sound, so it plays once, unmuted, rather than as a silent loop.
  // Its poster is the frame 14 s in, the molecule beside its measured
  // constants, which is also the picture its link shows
  quantize: {
    src: '/projects/quantize/video',
    poster: '/projects/quantize/video.webp',
    caption: 'Quantize, explained: recovering a molecule’s shape from how it spins, with theory deciding where the data are blind',
    sound: true,
    share: {
      title: 'Quantize, explained',
      about: 'Recovering a molecule’s shape from how it spins, with theory deciding where the data are blind. A four-minute narrated explainer.',
      og: '/projects/quantize/video-og.png',
      code: 'https://github.com/Nathan-W123/Quantize',
    },
  },
  sparlab: {
    src: '/projects/sparlab/tower',
    poster: '/projects/sparlab/tower.webp',
    caption: 'An algorithm designs a tower: under a 1 kN load and 100 N·m of torsion, 176 iterations move the material to where the strain energy is highest, and a truss is left',
  },
  // H + H2 -> H2 + H, run for this page by the engine itself (UHF/6-31G forces,
  // velocity Verlet at 0.25 fs) and drawn by work/ref/h3-render.mjs
  'ab-initio-md': {
    src: '/projects/ab-initio-md/reaction',
    poster: '/projects/ab-initio-md/reaction.webp',
    caption: 'H + H₂ → H₂ + H, run by the engine with Hartree–Fock forces at every step: a hydrogen atom (blue) flies into H₂, takes one of its atoms and sends the other away, and the total energy stays flat',
  },
};

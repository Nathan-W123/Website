'use client';

import { Shell } from './chrome';

/**
 * Work, after the reference's Work page: a line down the left with a dot at
 * each role, the dates, the role and where, and a few lines on what was done.
 * Taken from Nathan's resume (Downloads/NW.Resume.pdf, November 2026),
 * nothing added, and kept to a line or two without figures, as the reference
 * does; the current role first, then the rest by when they ended (the
 * reference's order). MESA's dates are from Nathan, not the resume.
 */
type Role = { when?: string; role: string; at: string; what: string };

const WORK: Role[] = [
  {
    when: 'Apr 2026 – Present',
    role: 'Quantum Mechanics Research',
    at: 'UC Davis',
    what:
      "Developing a method that pins down molecular structures when lab data alone can't by combining rotational spectroscopy with quantum chemistry.",
  },
  {
    when: 'Jun 2026 – Sep 2026',
    role: 'Industrial Engineer Intern',
    at: 'Pacific Coast Producers',
    what:
      'Ran time studies and root-cause analysis to find the top loss drivers on a production line, and implemented long-term fixes.',
  },
  {
    when: 'Oct 2023 – Jun 2026',
    role: 'Software Engineering Intern',
    at: 'Sacramento Area Sewer District',
    what:
      "Developed internal tools for the district's infrastructure, streamlining project efficiency and performance.",
  },
  {
    when: 'Sep 2024 – May 2025',
    role: 'Tutor',
    at: 'MESA',
    what: 'Tutored students in quantum mechanics, differential equations, organic chemistry and electromagnetism.',
  },
];

export function Work() {
  return (
    <Shell page="work" banner="infinity">
      <section className="nw-col nw-section" aria-labelledby="nw-work">
        <h1 id="nw-work">Work</h1>
        <p className="nw-lede">Read to see what I&apos;ve been up to.</p>
        <ol className="nw-timeline">
          {WORK.map((w) => (
            <li key={w.at}>
              {w.when && <p className="nw-when">{w.when}</p>}
              <h2 className="nw-role">
                {w.role} · {w.at}
              </h2>
              <p className="nw-what">{w.what}</p>
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}

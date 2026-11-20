'use client';

import { Shell } from './chrome';

/**
 * Work, after the reference's Work page: a line down the left with a dot at
 * each role, the dates, the role and where, and a few lines on what was done.
 * Taken from Nathan's resume (Downloads/NW.Resume.pdf, November 2026),
 * nothing added, and kept to a line or two without figures, as the reference
 * does; current role first, then by start date.
 */
type Role = { when?: string; role: string; at: string; what: string };

const WORK: Role[] = [
  {
    when: 'Apr 2026 – Present',
    role: 'Quantum Mechanics Research',
    at: 'UC Davis',
    what:
      "Developing a method that pins down molecular structures when lab data alone can't by combining rotational spectroscopy with quantum chemistry. It outperforms quantum chemistry alone against published structures.",
  },
  {
    when: 'Jun 2026 – Sep 2026',
    role: 'Industrial Engineer Intern',
    at: 'Pacific Coast Producers',
    what:
      'Ran a root-cause investigation into recurring stoppages on a production line, combining time studies, downtime data and operator interviews to find failure modes the logs never captured. Specified the fixes and custom parts that cut downtime and lifted daily output, and presented capacity and staffing plans to plant managers.',
  },
  {
    when: 'Oct 2023 – Jun 2026',
    role: 'Engineer Intern (Part-time)',
    at: 'Sacramento Area Sewer District',
    what:
      "Replaced weeks of manual staffing projections with a SQL/VBA pipeline I proposed and built, now used by dozens of staff, and automated the district's monthly maintenance maps with Python, SQL and ArcGIS.",
  },
  {
    role: 'Tutor',
    at: 'MESA',
    what: 'Tutored students in quantum mechanics, differential equations, organic chemistry and electromagnetism.',
  },
];

export function Work() {
  return (
    <Shell page="work">
      <section className="nw-col nw-section" aria-labelledby="nw-work">
        <h1 id="nw-work">Work</h1>
        <p className="nw-lede">Read below to see what I&apos;ve been up to.</p>
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

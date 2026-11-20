'use client';

import { Shell } from './chrome';

/**
 * Work, after the reference's Work page: a line down the left with a dot at
 * each role, the dates, the role and where, and a few lines on what was done.
 * Taken from Nathan's resume (Downloads/NW.Resume.pdf, November 2026),
 * nothing added; current role first, then by start date.
 */
type Role = { when?: string; role: string; at: string; what: string };

const WORK: Role[] = [
  {
    when: 'Apr 2026 – Present',
    role: 'Quantum Mechanics Research Assistant',
    at: 'UC Davis',
    what:
      "Developed a method to pin down molecular structures when lab data alone can't, combining rotational spectroscopy with quantum chemistry in one weighted objective so each source counts only where it is reliable. Against published structures for 9 molecules it cut the mean bond-length error of quantum chemistry alone by half, and it predicted held-out measurements better than theory alone on 5 of 5 molecules.",
  },
  {
    when: 'Jun 2026 – Sep 2026',
    role: 'Industrial Engineer Intern',
    at: 'Pacific Coast Producers',
    what:
      "Investigated recurring stoppages on a production line with time studies at 7 stations, 100+ hours of downtime data and interviews with operators. Ranked the fixes by cost and downtime impact, specified custom parts for the plant's mechanics to build, and tracked the results: line downtime fell 32% and average daily output rose 9.1%.",
  },
  {
    when: 'Oct 2023 – Jun 2026',
    role: 'Engineer Intern (Part-time)',
    at: 'Sacramento Area Sewer District',
    what:
      'Automated staffing projections that took weeks of manual work with a SQL/VBA pipeline, validated against the manual process and now under an hour for 50+ users, and automated the monthly maintenance maps with Python, SQL and ArcGIS, cutting days of GIS work to about 20 minutes.',
  },
  {
    role: 'Tutor',
    at: 'MESA',
    what: 'Tutored 40+ students for 300+ hours in quantum mechanics, differential equations, organic chemistry and electromagnetism.',
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

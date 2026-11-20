'use client';

import { Fragment } from 'react';
import { ART, PROJECT_GROUPS } from '@/components/signs/content';
import { Shell } from './chrome';

/** Projects: every project by group, its tile, name and what it is; linked to its code where there is some. */
export function Projects() {
  return (
    <Shell page="projects">
      <section className="nw-col nw-section" aria-labelledby="nw-projects">
        <h1 id="nw-projects">Projects</h1>
        {PROJECT_GROUPS.map((g) => (
          <Fragment key={g.id}>
            <h2>{g.label}</h2>
            <ul className="nw-work">
              {g.cards.map((c) => {
                const body = (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/tiles/${c.id}.webp`} alt="" loading="lazy" />
                    <span>
                      <strong>{c.title}</strong>
                      <span className="nw-work-tag">{c.tag}</span>
                    </span>
                  </>
                );
                return (
                  <li key={c.id}>
                    {c.href ? (
                      <a href={c.href} target="_blank" rel="noreferrer">
                        {body}
                      </a>
                    ) : (
                      <div>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Fragment>
        ))}
      </section>
    </Shell>
  );
}

/** Art: the drawings, shoes and doodles, each with its caption. */
export function Art() {
  return (
    <Shell page="art">
      <section className="nw-col nw-section" aria-labelledby="nw-art">
        <h1 id="nw-art">Art</h1>
        {ART.map((s) => (
          <Fragment key={s.id}>
            <h2>{s.label}</h2>
            <ul className="nw-art">
              {s.items.map((it) => (
                <li key={it.image}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image} alt={it.caption} loading="lazy" />
                  {it.caption && <span>{it.caption}</span>}
                </li>
              ))}
            </ul>
          </Fragment>
        ))}
      </section>
    </Shell>
  );
}

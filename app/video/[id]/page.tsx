import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/home/chrome';
import { VIDEOS } from '@/components/home/videos';
import { Watch } from '@/components/home/watch';

/**
 * A project's video on a page of its own, so it has a link to send: one page
 * for each video in components/home/videos.ts with a `share`, at
 * /video/<id>/. A sent link shows the share's picture (the video's frame
 * under a play button) with its title and line, not the site's own card.
 */
type Props = { params: Promise<{ id: string }> };

const shared = (id: string) => {
  const v = VIDEOS[id];
  return v?.src && v.share ? { ...v, src: v.src, share: v.share } : null;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VIDEOS)
    .filter((id) => shared(id))
    .map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const v = shared(id);
  if (!v) return {};
  const url = `/video/${id}/`;
  const { title, about, og } = v.share;
  // the whole of openGraph and twitter, since a page's replace the layout's
  return {
    title: `${title} · Nathan W.`,
    description: about,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: about,
      url,
      siteName: 'Nathan W.',
      type: 'video.other',
      images: [{ url: og, type: 'image/png', width: 1200, height: 630, alt: v.caption }],
      // whole, since Next leaves a video's address as written (an image's it completes)
      videos: [{ url: `https://nateward.me${v.src}.mp4`, type: 'video/mp4', width: 1280, height: 720 }],
    },
    twitter: { card: 'summary_large_image', title, description: about, images: [og] },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const v = shared(id);
  if (!v) notFound();
  return (
    <Shell page="projects">
      <Watch src={v.src} poster={v.poster} caption={v.caption} sound={v.sound} />
      <section className="nw-col nw-section nw-watch-text" aria-labelledby="nw-watch-title">
        <h1 id="nw-watch-title">{v.share.title}</h1>
        <p className="nw-lede">{v.share.about}</p>
        <p className="nw-proj-link nw-watch-links">
          <a href={`/projects/#${id}`}>Read the write-up</a>
          {v.share.code && (
            <a href={v.share.code} target="_blank" rel="noreferrer">
              Code ↗
            </a>
          )}
        </p>
      </section>
    </Shell>
  );
}

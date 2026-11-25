'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * A project's video on a page of its own (app/video/[id]), the link that is
 * sent. One with sound (a narrated explainer) waits on its poster under a
 * round play button, the one its link's picture shows, and plays with sound
 * and the browser's controls once that is pressed; a silent clip loops
 * muted from the start, as it does in the write-up.
 */
export function Watch({ src, poster, caption, sound = false }: { src: string; poster?: string; caption: string; sound?: boolean }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [started, setStarted] = useState(!sound);
  // a silent clip: muted as an attribute as well as a property (React only
  // sets the property, and iOS Safari judges autoplay by the attribute), as
  // the banners' loops are (chrome.tsx)
  const mount = useCallback(
    (v: HTMLVideoElement | null) => {
      video.current = v;
      if (!v || sound) return;
      v.muted = true;
      v.defaultMuted = true;
      v.setAttribute('muted', '');
      v.play()?.catch(() => {});
    },
    [sound],
  );
  const play = () => {
    setStarted(true);
    // in the press itself, so the browser lets it play with sound; if it is
    // refused anyway, the controls are showing now, and their play works
    video.current?.play()?.catch(() => {});
  };
  return (
    <figure className="nw-watch">
      <div className="nw-watch-frame">
        <video
          ref={mount}
          poster={poster}
          controls={started}
          autoPlay={!sound}
          loop={!sound}
          muted={!sound}
          playsInline
          preload={sound ? 'metadata' : 'auto'}
          aria-label={caption}
        >
          <source src={`${src}.webm`} type="video/webm" />
          <source src={`${src}.mp4`} type="video/mp4" />
        </video>
        {!started && (
          <button type="button" className="nw-watch-play" aria-label="Play the video, with sound" onClick={play}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.2v13.6L18.6 12z" />
            </svg>
          </button>
        )}
      </div>
    </figure>
  );
}

/**
 * Plate loader for the photoreal cinematic (docs/photoreal-spec.md, "Loading strategy").
 *
 * Behaviour:
 * - Fetches `/plates/manifest.json` (shape: {@link PlateManifest}).
 * - Preloads every orbit plate as a decoded `HTMLImageElement` (`await img.decode()`),
 *   then resolves. The drive frames keep streaming in the background, sequentially in
 *   chunks of {@link DRIVE_CHUNK} (`Promise.all` per chunk), filling `drive.images` in
 *   place as they arrive. They are requested with `fetchPriority = 'low'` (where the
 *   browser supports it) so they never compete with fonts, the poster or the HUD.
 * - Progress is reported as ONE monotonic loader fraction in [0, 1]: the orbit stage
 *   occupies [0, {@link ORBIT_SHARE}] and the drive stage [ORBIT_SHARE, 1]. `stage`
 *   names the stage that produced the update so the HUD can label it.
 * - A frame that fails to load is retried once and otherwise left `null` in the array;
 *   a single bad frame never rejects. Only a missing/malformed manifest, or an abort
 *   before the orbit set is ready, rejects.
 * - `driveReady()` is the number of drive frames loaded contiguously from index 0,
 *   i.e. the compositor may safely display frames `0 .. driveReady() - 1`.
 * - Successfully decoded images are kept in a module-level cache for the session, so a
 *   remount (React StrictMode, navigation) reuses them instead of refetching.
 */

export type PlateSet = {
  /** Filled progressively for the drive set; `null` = not loaded (yet) or failed. */
  images: (HTMLImageElement | null)[];
  count: number;
  width: number;
  height: number;
};

export type PlateStage = 'orbit' | 'drive';

export type PlateProgress = (fraction: number, stage: PlateStage) => void;

export type PlateManifestEntry = {
  count: number;
  width: number;
  height: number;
  /** URL pattern with `{i2}` / `{i3}` (zero-padded index) placeholders. */
  pattern: string;
  fps?: number;
};

export type PlateManifest = {
  orbit: PlateManifestEntry;
  drive: PlateManifestEntry;
};

export type LoadedPlates = {
  orbit: PlateSet;
  drive: PlateSet;
  /** Contiguous count of drive frames loaded from index 0. */
  driveReady: () => number;
};

export const MANIFEST_URL = '/plates/manifest.json';
/** Share of the loader bar taken by the orbit stage (spec: loader 0-40%, then 40-100%). */
export const ORBIT_SHARE = 0.4;
/**
 * Drive frames are fetched sequentially in chunks of this size. 16 keeps the
 * HTTP/2 connection busy without a single chunk starving other page requests.
 */
export const DRIVE_CHUNK = 16;

const RETRY_DELAY_MS = 350;

/** Decoded images kept alive for the session, keyed by URL. */
const imageCache = new Map<string, HTMLImageElement>();

/** Expands `{i}`, `{i2}`, `{i3}`, ... placeholders with the (zero-padded) index. */
export function formatPattern(pattern: string, index: number): string {
  return pattern.replace(/\{i(\d*)\}/g, (_match: string, digits: string) => {
    const text = String(index);
    return digits ? text.padStart(Number(digits), '0') : text;
  });
}

function isManifestEntry(value: unknown): value is PlateManifestEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.count === 'number' &&
    Number.isInteger(entry.count) &&
    entry.count >= 0 &&
    typeof entry.width === 'number' &&
    typeof entry.height === 'number' &&
    typeof entry.pattern === 'string' &&
    (entry.fps === undefined || typeof entry.fps === 'number')
  );
}

function isManifest(value: unknown): value is PlateManifest {
  if (typeof value !== 'object' || value === null) return false;
  const manifest = value as Record<string, unknown>;
  return isManifestEntry(manifest.orbit) && isManifestEntry(manifest.drive);
}

function abortError(): DOMException {
  return new DOMException('Plate loading was aborted', 'AbortError');
}

function makeSet(entry: PlateManifestEntry): PlateSet {
  return {
    images: Array.from(
      { length: entry.count },
      (): HTMLImageElement | null => null,
    ),
    count: entry.count,
    width: entry.width,
    height: entry.height,
  };
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
  });
}

/**
 * Loads and decodes one image. Resolves `null` (never rejects) on failure or abort.
 * Falls back to "loaded" when `decode()` rejects but the bitmap is actually available
 * (Safari rejects with EncodingError when its decode cache is full).
 * `lowPriority` requests the image with `fetchPriority = 'low'` where supported.
 */
function loadImage(
  url: string,
  signal: AbortSignal,
  lowPriority: boolean,
): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(url);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  if (signal.aborted) return Promise.resolve(null);

  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    // Runtime guard: lib.dom types the property, but Firefox < 132 / older Safari
    // ignore it and some older engines lack it entirely.
    if (lowPriority && 'fetchPriority' in img) img.fetchPriority = 'low';
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      if (ok) imageCache.set(url, img);
      resolve(ok ? img : null);
    };
    const onAbort = () => {
      // Clearing the source cancels an in-flight fetch in every major browser.
      img.src = '';
      finish(false);
    };

    signal.addEventListener('abort', onAbort, { once: true });
    img.src = url;
    img.decode().then(
      () => finish(true),
      () => finish(img.complete && img.naturalWidth > 0),
    );
  });
}

/** `loadImage` with a single retry after a short pause; still never rejects. */
async function loadFrame(
  url: string,
  signal: AbortSignal,
  lowPriority = false,
): Promise<HTMLImageElement | null> {
  const first = await loadImage(url, signal, lowPriority);
  if (first || signal.aborted) return first;
  await delay(RETRY_DELAY_MS, signal);
  if (signal.aborted) return null;
  return loadImage(url, signal, lowPriority);
}

async function fetchManifest(signal: AbortSignal): Promise<PlateManifest> {
  const response = await fetch(MANIFEST_URL, { signal });
  if (!response.ok) {
    throw new Error(
      `Plate manifest request failed (${String(response.status)})`,
    );
  }
  const data: unknown = await response.json();
  if (!isManifest(data)) {
    throw new Error('Plate manifest has an unexpected shape');
  }
  return data;
}

/**
 * Loads the plate sets described by the manifest.
 *
 * Resolves as soon as the orbit plates are decoded; drive frames continue loading in
 * the background (low fetch priority, chunks of {@link DRIVE_CHUNK}) and appear in
 * `drive.images` as they arrive. Abort via
 * `signal` cancels in-flight requests; if that happens before the orbit set is ready
 * the promise rejects with an `AbortError` DOMException, otherwise the background drive
 * loading simply stops.
 *
 * `onProgress(fraction, stage)` receives a monotonic overall fraction in [0, 1]
 * (orbit 0 -> 0.4, drive 0.4 -> 1) and the stage it belongs to.
 */
export async function loadPlates(
  onProgress: PlateProgress,
  signal: AbortSignal,
): Promise<LoadedPlates> {
  if (signal.aborted) throw abortError();

  const manifest = await fetchManifest(signal);
  if (signal.aborted) throw abortError();

  const orbit = makeSet(manifest.orbit);
  const drive = makeSet(manifest.drive);

  let reported = -1;
  const report = (fraction: number, stage: PlateStage) => {
    const clamped = Math.min(1, Math.max(0, fraction));
    if (clamped < reported) return;
    reported = clamped;
    onProgress(clamped, stage);
  };

  // --- Orbit: everything up front, decoded, before we resolve. ---
  report(0, 'orbit');
  let orbitSettled = 0;
  await Promise.all(
    orbit.images.map(async (_slot, index) => {
      const image = await loadFrame(
        formatPattern(manifest.orbit.pattern, index),
        signal,
      );
      orbit.images[index] = image;
      orbitSettled += 1;
      if (!signal.aborted)
        report(ORBIT_SHARE * (orbitSettled / orbit.count), 'orbit');
    }),
  );
  if (signal.aborted) throw abortError();
  report(ORBIT_SHARE, 'orbit');

  // --- Drive: background, sequential chunks of DRIVE_CHUNK. ---
  let contiguous = 0;
  const advance = () => {
    while (contiguous < drive.count && drive.images[contiguous])
      contiguous += 1;
  };

  const loadDrive = async () => {
    let driveSettled = 0;
    for (let start = 0; start < drive.count; start += DRIVE_CHUNK) {
      if (signal.aborted) return;
      const end = Math.min(drive.count, start + DRIVE_CHUNK);
      const chunk: Promise<void>[] = [];
      for (let index = start; index < end; index += 1) {
        chunk.push(
          loadFrame(
            formatPattern(manifest.drive.pattern, index),
            signal,
            true,
          ).then((image) => {
            drive.images[index] = image;
            driveSettled += 1;
            advance();
            if (!signal.aborted) {
              report(
                ORBIT_SHARE +
                  (1 - ORBIT_SHARE) * (driveSettled / drive.count),
                'drive',
              );
            }
          }),
        );
      }
      await Promise.all(chunk);
    }
  };

  report(ORBIT_SHARE, 'drive');
  if (drive.count === 0) {
    report(1, 'drive');
  } else {
    // loadFrame swallows every per-frame failure, so this cannot reject; the catch only
    // guarantees the detached background task can never surface as unhandled.
    void loadDrive().catch(() => undefined);
  }

  return { orbit, drive, driveReady: () => contiguous };
}

#!/usr/bin/env node
/**
 * build-plates.mjs — photographic plate pipeline (see docs/photoreal-spec.md, "Asset pipeline").
 *
 * Inputs : public/orbit/frame-00..10.webp, public/free-supercar-drive.mp4
 * Outputs: public/plates/orbit/00..10.webp   1280x720, graded, webp q80
 *          public/plates/drive/000..NNN.webp 1600x900 (lanczos), graded + seam-matched to orbit
 *                                            plate 10 (see SEAM_MATCH), webp q72 (lowered if > budget)
 *          public/plates/poster.webp         orbit plate 00 graded, 1280x720, q70
 *          public/plates/manifest.json
 * Then moves the two source mp4s from public/ into sequence-work/ (only once all outputs exist).
 *
 * Run: npm run plates   (or: node scripts/build-plates.mjs)
 *
 * Trial mode: node scripts/build-plates.mjs --trial[=0,80]
 *   Runs the exact drive chain (grade + tone + bands + seam calibration + knee) but renders only
 *   the listed drive frame indices (default 0 and 80 == t 0 s and t 4 s) into work/polish/ as
 *   trial-NNN.webp at the shipping quality. Touches nothing under public/ and moves no videos.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

// ---------------------------------------------------------------------------
// Configuration (values chosen by the video/grade analysis step)
// ---------------------------------------------------------------------------
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TRIM_START = 0; // seconds into the drive video
const TRIM_END = 9.8; // seconds (full clip)
const DRIVE_FPS = 20;

const ORBIT_COUNT = 11; // frame-00 .. frame-10 (frame-11 == drive t=0, so it is not a plate)
const ORBIT_W = 1280,
  ORBIT_H = 720,
  ORBIT_QUALITY = 80;
const DRIVE_W = 1600,
  DRIVE_H = 900;
const DRIVE_QUALITY = Number(process.env.PLATES_DRIVE_QUALITY) || 72;
const DRIVE_QUALITY_STEP = 4;
const DRIVE_QUALITY_MIN = 40;
const DRIVE_BUDGET_BYTES = 12_000_000; // spec: total drive payload <= 12 MB (decimal MB — the stricter reading)
const POSTER_QUALITY = 70;

// One grade applied identically to orbit plates and drive frames (analysis candidate "F2_hybrid_pinkfix"):
// selectivecolor neutralises the RGB sill underglow (magenta pulled hard, greens/blues cooled),
// channel mixer bleeds a little blue into R/G so remaining colour reads cool-neutral,
// eq lowers saturation / lifts contrast, colorbalance cools shadows and warms highlights slightly,
// unsharp adds a touch of acutance lost to lanczos + webp.
const GRADE =
  'selectivecolor=reds=0.12 0 0 0:magentas=0 -0.65 0 0:greens=0 0.4 0 0:blues=0 0 0.25 0.03:cyans=0 0.15 0.1 0:yellows=0 0 0.1 -0.06,' +
  'colorchannelmixer=rr=1.0:rb=0.08:gg=1.0:gb=0.06:bb=0.88,' +
  'eq=contrast=1.08:brightness=-0.012:saturation=0.52,' +
  'colorbalance=rs=-0.02:gs=0.0:bs=0.03:rm=0.0:gm=0.0:bm=-0.01:rh=0.07:gh=0.045:bh=-0.05,' +
  'unsharp=5:5:0.3:5:5:0.0';

// Drive-only seam match (integration QA deviation from "one grade applied identically"):
// orbit frame-11 (== the video's t=0 framing) was generated already darkened/desaturated to
// the orbit look, so the identically graded drive frames keep a blue cast the orbit plates
// do not (drive/000 mean RGB 18.8/28.1/38.6 vs orbit/10 22.1/25.2/26.0) and the plate-10 ->
// drive-0 crossfade showed a colour jump. The drive chain therefore gets two extra steps
// after GRADE: DRIVE_TONE (negative vibrance: pulls saturation out of the most saturated
// pixels only, which turns the cyan/green/violet RGB sill underglow into a neutral/cool white
// glow while leaving the muted city tones alone) and a per-channel linear `lutrgb` calibrated
// at build time (four passes, so black clipping is accounted for — two passes still left the
// R mean 2.3 levels high once the bands below were added) such that drive frame 0's channel
// means and standard deviations equal orbit plate 10's. Every drive frame gets the same fixed
// transform. Disable with PLATES_SEAM_MATCH=0.
const SEAM_MATCH = process.env.PLATES_SEAM_MATCH !== '0';
// Two negative-vibrance passes: one was not enough — the sill underglow still read as a
// green-cyan puddle and the splitter glowed orange in every drive frame.
const DRIVE_TONE = 'vibrance=intensity=-0.8,vibrance=intensity=-1.0';
// Feathered car-band darkening, drive only, applied BEFORE the seam LUT so the calibration
// accounts for it: the car flank tripled in brightness from orbit plate 10 to drive frame 0
// while the road dropped. Motion analysis shows the car is locked to the same screen band
// (y 26%..64%) for the whole clip, so a fixed band works: `curves` darkens a copy of the frame
// and `blend` mixes it back in with a per-pixel weight that ramps over 5% of the height at both
// band edges. This is a labeled filtergraph (split/blend), so it must travel as ONE -vf argv
// element — ffmpeg() uses spawnSync without a shell, and preflightChain() renders one frame
// with the final chain before the full run.
// Curve depth: the whole-frame std-matching LUT (gain ~1.45-1.65) lifts everything back up, so a
// mild curve (0.5 -> 0.42) still left the flank band 1.39x (car-only 1.9x) brighter than orbit
// plate 10 and the road 0.8x. A single-frame trial of drive frame 0 through the same
// calibration gave, for 0.5 -> 0.26 with a 0.8 -> 0.68 shoulder: flank band 0.97x, car-only
// 1.30x, road 1.00x, neutral sill glow, and no step in the background luma profile across
// either feathered band edge (measured on t = 0 s and t = 5 s).
// Lower edge: 0.70 (was 0.64) so the sill light strip (y ~0.60-0.64) sits inside the full-weight
// zone instead of on the feather (it only got ~40% of the darkening there and shipped as a
// clipped white bar, row mean ~237 with ~15% of the strip above 248).
const CAR_BAND =
  "split[base][car];[car]curves=m='0/0 0.16/0.06 0.5/0.26 0.8/0.68 1/1'[dark];" +
  "[base][dark]blend=all_expr='A*(1-clip((Y-0.26*H)/(0.05*H),0,1)*clip((0.70*H-Y)/(0.05*H),0,1))+B*clip((Y-0.26*H)/(0.05*H),0,1)*clip((0.70*H-Y)/(0.05*H),0,1)'";
// Feathered top-band darkening (sky / buildings / tree), drive only, same technique as CAR_BAND
// and also applied BEFORE the seam LUT. Without it the whole-frame std-matching LUT lifted the
// drive background band (y 8-26%) to 1.37x (frame 0) .. 1.65x (frame 60) of orbit plate 10's
// luma while the car band and road already matched. Full weight above y = 24%, feathering to 0
// by y = 30% (it overlaps the car band's 26-31% ramp, which is what hides the edge).
const TOP_BAND =
  "split[tbase][sky];[sky]curves=m='0/0 0.5/0.37 1/1'[skydark];" +
  "[tbase][skydark]blend=all_expr='A*(1-clip((0.30*H-Y)/(0.06*H),0,1))+B*clip((0.30*H-Y)/(0.06*H),0,1)'";
// Mild feathered road darkening, drive only, ramping up (y 65% -> 70%) exactly where CAR_BAND
// ramps down so the two never leave a lighter stripe between them. Needed because every pre-LUT
// darkening feeds back through the whole-frame std match: TOP_BAND lowered the frame's std, the
// LUT gain rose from ~1.55x to ~1.97x, and the untouched road went from 0.99x to 1.11x of orbit
// plate 10. Depth is deliberately shallow — 0.5 -> 0.42 overshot (road 0.92x, top/car pushed to
// 1.10x/1.12x); 0.5 -> 0.46 lands drive frame 0 at top 1.06x, car 1.06x, road 1.02x.
const ROAD_BAND =
  "split[rbase][road];[road]curves=m='0/0 0.5/0.46 1/1'[roaddark];" +
  "[rbase][roaddark]blend=all_expr='A*(1-clip((Y-0.65*H)/(0.05*H),0,1))+B*clip((Y-0.65*H)/(0.05*H),0,1)'";
// Highlight soft knee, drive only, appended AFTER the seam LUT: the sill light strip (row mean
// ~237, 15% of it clipped at 255) becomes a ~215 peak with visible falloff instead of a flat
// white bar; tail-light / window highlights keep their shape (255 -> 234). The 0.25 and 0.5
// identity points are load-bearing: ffmpeg's natural cubic spline through just
// 0/0 0.7/0.7 0.85/0.8 1/0.92 bulges +10 levels through the mids (24 -> 27, 128 -> 137) and
// brightened the whole frame; pinned, it deviates at most +2 (around 150), so the knee no longer
// disturbs the mean/std calibration.
const HIGHLIGHT_KNEE =
  "curves=all='0/0 0.25/0.25 0.5/0.5 0.7/0.7 0.85/0.8 1/0.92'";
const SEAM_PASSES = 4;

const ORBIT_SRC_DIR = join(ROOT, 'public', 'orbit');
const PLATES_DIR = join(ROOT, 'public', 'plates');
const ORBIT_OUT_DIR = join(PLATES_DIR, 'orbit');
const DRIVE_OUT_DIR = join(PLATES_DIR, 'drive');
const POSTER_OUT = join(PLATES_DIR, 'poster.webp');
const MANIFEST_OUT = join(PLATES_DIR, 'manifest.json');
const SEQUENCE_WORK_DIR = join(ROOT, 'sequence-work');
const VIDEOS_TO_MOVE = ['free-supercar-drive.mp4', 'cinematic-drive-free.mp4'];
const TRIAL_OUT_DIR = join(ROOT, 'work', 'polish');

/** `--trial` / `--trial=0,80` -> drive frame indices to render in trial mode, else null. */
function parseTrialArg(argv) {
  const arg = argv.find((a) => a === '--trial' || a.startsWith('--trial='));
  if (!arg) return null;
  const list = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : '0,80';
  const frames = list
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0);
  if (frames.length === 0)
    throw new Error(`--trial: no valid frame indices in "${list}"`);
  return frames;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const pad2 = (n) => String(n).padStart(2, '0');
const pad3 = (n) => String(n).padStart(3, '0');
const fmtBytes = (b) =>
  b >= 1_000_000
    ? `${(b / 1_000_000).toFixed(2)} MB`
    : `${(b / 1000).toFixed(1)} KB`;
const now = () => performance.now();

function ffmpeg(args, label) {
  if (!ffmpegPath || !existsSync(ffmpegPath)) {
    throw new Error(`ffmpeg-static binary not found at ${ffmpegPath}`);
  }
  const r = spawnSync(
    ffmpegPath,
    ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...args],
    {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (r.error)
    throw new Error(`[${label}] failed to spawn ffmpeg: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(
      `[${label}] ffmpeg exited with ${r.status}\n${(r.stderr || '').trim()}`,
    );
  }
  const warn = (r.stderr || '').trim();
  if (warn) console.warn(`[${label}] ffmpeg stderr:\n${warn}`);
}

/** ffmpeg with stdout captured as a Buffer (for raw frame reads). */
function ffmpegRaw(args, label) {
  if (!ffmpegPath || !existsSync(ffmpegPath)) {
    throw new Error(`ffmpeg-static binary not found at ${ffmpegPath}`);
  }
  const r = spawnSync(
    ffmpegPath,
    ['-hide_banner', '-loglevel', 'error', '-nostdin', ...args],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  if (r.error)
    throw new Error(`[${label}] failed to spawn ffmpeg: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(
      `[${label}] ffmpeg exited with ${r.status}\n${(r.stderr ? r.stderr.toString() : '').trim()}`,
    );
  }
  return r.stdout;
}

/** Per-channel mean / standard deviation of the first frame produced by `vf`. */
function channelStats(inputArgs, vf, width, height, label) {
  const raw = ffmpegRaw(
    [
      ...inputArgs,
      '-vf',
      vf,
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ],
    label,
  );
  const n = width * height;
  if (raw.length !== n * 3) {
    throw new Error(
      `[${label}] unexpected raw frame size ${raw.length} (expected ${n * 3})`,
    );
  }
  const sum = [0, 0, 0];
  const sq = [0, 0, 0];
  for (let i = 0; i < raw.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      const v = raw[i + c];
      sum[c] += v;
      sq[c] += v * v;
    }
  }
  const mean = sum.map((s) => s / n);
  const std = sq.map((s, c) =>
    Math.sqrt(Math.max(0, s / n - mean[c] * mean[c])),
  );
  return { mean, std };
}

const fmtStats = (s) =>
  `mean ${s.mean.map((v) => v.toFixed(1)).join('/')}  std ${s.std.map((v) => v.toFixed(1)).join('/')}`;

/** `lutrgb` filter applying out = a * in + b per channel (clipped to 0..255). */
function lutFilter(coef) {
  return `lutrgb=${['r', 'g', 'b']
    .map(
      (ch, c) =>
        `${ch}='clip(val*${coef[c].a.toFixed(4)}${coef[c].b >= 0 ? '+' : ''}${coef[c].b.toFixed(2)},0,255)'`,
    )
    .join(':')}`;
}

/**
 * Calibrates the drive-only seam match: returns the `lutrgb` filter that makes drive frame 0
 * (through `preChain`) match orbit plate 10's per-channel mean / std.
 */
function calibrateSeam(video, preChain) {
  const target = channelStats(
    ['-i', join(ORBIT_SRC_DIR, `frame-${pad2(ORBIT_COUNT - 1)}.webp`)],
    `scale=${ORBIT_W}:${ORBIT_H}:flags=lanczos,${GRADE}`,
    ORBIT_W,
    ORBIT_H,
    'seam orbit',
  );
  const driveIn = ['-ss', String(TRIM_START), '-i', video, '-t', '0.25'];
  const before = channelStats(
    driveIn,
    preChain,
    DRIVE_W,
    DRIVE_H,
    'seam drive',
  );
  let coef = [
    { a: 1, b: 0 },
    { a: 1, b: 0 },
    { a: 1, b: 0 },
  ];
  let current = before;
  for (let pass = 0; pass < SEAM_PASSES; pass++) {
    if (pass > 0) {
      current = channelStats(
        driveIn,
        `${preChain},${lutFilter(coef)}`,
        DRIVE_W,
        DRIVE_H,
        `seam pass ${pass}`,
      );
    }
    coef = coef.map((k, c) => {
      const gain = current.std[c] > 1e-6 ? target.std[c] / current.std[c] : 1;
      const offset = target.mean[c] - gain * current.mean[c];
      return { a: k.a * gain, b: k.b * gain + offset };
    });
  }
  const filter = lutFilter(coef);
  const after = channelStats(
    driveIn,
    `${preChain},${filter}`,
    DRIVE_W,
    DRIVE_H,
    'seam result',
  );
  console.log(`  orbit/${pad2(ORBIT_COUNT - 1)}  ${fmtStats(target)}`);
  console.log(`  drive/000 before  ${fmtStats(before)}`);
  console.log(`  drive/000 after   ${fmtStats(after)}`);
  console.log(
    `  lut: ${coef.map((k) => `${k.a.toFixed(3)}x${k.b >= 0 ? '+' : ''}${k.b.toFixed(1)}`).join(' | ')}`,
  );
  return filter;
}

/**
 * Renders one drive frame through `chain` to a null sink so a broken filtergraph fails here,
 * in ~1 s, instead of part-way through the full extraction. Throws on a non-zero exit.
 */
function preflightChain(video, chain, label) {
  const t0 = now();
  ffmpeg(
    [
      '-ss',
      String(TRIM_START),
      '-i',
      video,
      '-t',
      '0.25',
      '-vf',
      chain,
      '-frames:v',
      '1',
      '-f',
      'null',
      '-',
    ],
    label,
  );
  console.log(`  ${label}: ffmpeg exit 0 (${((now() - t0) / 1000).toFixed(1)}s)`);
}

function listWebp(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.webp$/i.test(f))
    .sort();
}

function dirBytes(dir) {
  return listWebp(dir).reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
}

function cleanWebp(dir) {
  mkdirSync(dir, { recursive: true });
  for (const f of listWebp(dir)) rmSync(join(dir, f));
}

/** Locate the source drive video: still in public/, or already moved into sequence-work/. */
function findDriveVideo() {
  const candidates = [
    join(ROOT, 'public', 'free-supercar-drive.mp4'),
    join(SEQUENCE_WORK_DIR, 'free-supercar-drive.mp4'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found)
    throw new Error(
      `Drive video not found. Looked in:\n  ${candidates.join('\n  ')}`,
    );
  return found;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
function buildOrbit() {
  const t0 = now();
  cleanWebp(ORBIT_OUT_DIR);
  for (let i = 0; i < ORBIT_COUNT; i++) {
    const src = join(ORBIT_SRC_DIR, `frame-${pad2(i)}.webp`);
    if (!existsSync(src)) throw new Error(`Missing orbit source plate: ${src}`);
    const out = join(ORBIT_OUT_DIR, `${pad2(i)}.webp`);
    ffmpeg(
      [
        '-i',
        src,
        '-vf',
        `scale=${ORBIT_W}:${ORBIT_H}:flags=lanczos,${GRADE}`,
        '-frames:v',
        '1',
        '-f',
        'image2',
        '-update',
        '1',
        '-c:v',
        'libwebp',
        '-quality',
        String(ORBIT_QUALITY),
        '-compression_level',
        '6',
        out,
      ],
      `orbit ${pad2(i)}`,
    );
    process.stdout.write(
      `  orbit/${pad2(i)}.webp  ${fmtBytes(statSync(out).size)}\n`,
    );
  }
  console.log(
    `orbit: ${ORBIT_COUNT} plates, ${fmtBytes(dirBytes(ORBIT_OUT_DIR))} total, ${((now() - t0) / 1000).toFixed(1)}s`,
  );
}

function buildPoster() {
  const src = join(ORBIT_SRC_DIR, 'frame-00.webp');
  ffmpeg(
    [
      '-i',
      src,
      '-vf',
      `scale=${ORBIT_W}:${ORBIT_H}:flags=lanczos,${GRADE}`,
      '-frames:v',
      '1',
      '-f',
      'image2',
      '-update',
      '1',
      '-c:v',
      'libwebp',
      '-quality',
      String(POSTER_QUALITY),
      '-compression_level',
      '6',
      POSTER_OUT,
    ],
    'poster',
  );
  console.log(`poster: poster.webp ${fmtBytes(statSync(POSTER_OUT).size)}`);
}

/** Extract + grade drive frames at the given webp quality. Returns { count, bytes }. */
function buildDrive(video, quality, driveChain) {
  const t0 = now();
  cleanWebp(DRIVE_OUT_DIR);
  const duration = TRIM_END - TRIM_START;
  const expected = Math.round(duration * DRIVE_FPS);
  // NOTE: `-f image2` is required — with a bare .webp extension ffmpeg would pick its animated-webp
  // muxer and write ONE file literally named "%03d.webp" instead of a numbered sequence.
  const pattern = join(DRIVE_OUT_DIR, '%03d.webp');
  ffmpeg(
    [
      '-threads',
      '0',
      '-ss',
      String(TRIM_START),
      '-i',
      video,
      '-t',
      String(duration),
      '-vf',
      driveChain,
      '-frames:v',
      String(expected),
      '-f',
      'image2',
      '-start_number',
      '0',
      '-c:v',
      'libwebp',
      '-quality',
      String(quality),
      '-compression_level',
      '6',
      pattern,
    ],
    `drive q${quality}`,
  );
  const files = listWebp(DRIVE_OUT_DIR);
  const count = files.length;
  if (count !== expected) {
    throw new Error(
      `drive: expected ${expected} frames (${duration}s x ${DRIVE_FPS}fps) but got ${count}`,
    );
  }
  for (let i = 0; i < count; i++) {
    if (files[i] !== `${pad3(i)}.webp`)
      throw new Error(
        `drive: frame naming gap at index ${i} (found ${files[i]})`,
      );
  }
  const bytes = dirBytes(DRIVE_OUT_DIR);
  console.log(
    `drive: q${quality} -> ${count} frames, ${fmtBytes(bytes)} total (avg ${fmtBytes(bytes / count)}/frame), ${((now() - t0) / 1000).toFixed(1)}s`,
  );
  return { count, bytes };
}

/**
 * Trial mode: render the listed drive frame indices through the final chain into work/polish/
 * (trial-NNN.webp, shipping quality) so a grade change can be measured on two frames in a few
 * seconds instead of a six-minute full run. Frame f is taken at t = TRIM_START + f / DRIVE_FPS.
 */
function buildTrial(video, driveChain, frames) {
  const t0 = now();
  mkdirSync(TRIAL_OUT_DIR, { recursive: true });
  for (const f of frames) {
    const t = TRIM_START + f / DRIVE_FPS;
    const out = join(TRIAL_OUT_DIR, `trial-${pad3(f)}.webp`);
    ffmpeg(
      [
        '-ss',
        t.toFixed(3),
        '-i',
        video,
        '-t',
        '0.25',
        '-vf',
        driveChain,
        '-frames:v',
        '1',
        '-f',
        'image2',
        '-update',
        '1',
        '-c:v',
        'libwebp',
        '-quality',
        String(DRIVE_QUALITY),
        '-compression_level',
        '6',
        out,
      ],
      `trial ${pad3(f)}`,
    );
    console.log(
      `  trial-${pad3(f)}.webp  (t=${t.toFixed(2)}s)  ${fmtBytes(statSync(out).size)}`,
    );
  }
  console.log(
    `trial: ${frames.length} frame(s) -> ${TRIAL_OUT_DIR}, ${((now() - t0) / 1000).toFixed(1)}s`,
  );
}

/**
 * Builds the drive filter chain: grade (+ tone + feathered bands, seam LUT calibrated on frame 0,
 * highlight knee when SEAM_MATCH). Preflights the pre-LUT and final chains on one frame each.
 */
function resolveDriveChain(video) {
  const preChain = `fps=${DRIVE_FPS},scale=${DRIVE_W}:${DRIVE_H}:flags=lanczos,${GRADE}${SEAM_MATCH ? `,${DRIVE_TONE},${TOP_BAND},${CAR_BAND},${ROAD_BAND}` : ''}`;
  let driveChain = preChain;
  if (SEAM_MATCH) {
    console.log(
      'seam match: preflighting the drive chain (grade + tone + top band + car band)',
    );
    preflightChain(video, preChain, 'drive preflight (pre-LUT)');
    console.log('seam match: calibrating drive frame 0 against orbit plate 10');
    driveChain = `${preChain},${calibrateSeam(video, preChain)},${HIGHLIGHT_KNEE}`;
    const final = channelStats(
      ['-ss', String(TRIM_START), '-i', video, '-t', '0.25'],
      driveChain,
      DRIVE_W,
      DRIVE_H,
      'seam final',
    );
    console.log(`  drive/000 + knee  ${fmtStats(final)}`);
  } else {
    console.log('seam match: disabled (PLATES_SEAM_MATCH=0)');
  }
  preflightChain(video, driveChain, 'drive preflight (final chain)');
  return driveChain;
}

function buildDriveWithinBudget(video, driveChain) {
  let quality = DRIVE_QUALITY;
  for (;;) {
    const result = buildDrive(video, quality, driveChain);
    if (result.bytes <= DRIVE_BUDGET_BYTES) return { ...result, quality };
    const next = quality - DRIVE_QUALITY_STEP;
    if (next < DRIVE_QUALITY_MIN) {
      console.warn(
        `drive: still ${fmtBytes(result.bytes)} at q${quality}; refusing to go below q${DRIVE_QUALITY_MIN}. Over budget by ${fmtBytes(result.bytes - DRIVE_BUDGET_BYTES)}.`,
      );
      return { ...result, quality };
    }
    console.warn(
      `drive: ${fmtBytes(result.bytes)} exceeds budget ${fmtBytes(DRIVE_BUDGET_BYTES)} — re-encoding at q${next}`,
    );
    quality = next;
  }
}

function writeManifest(driveCount) {
  const manifest = {
    orbit: {
      count: ORBIT_COUNT,
      width: ORBIT_W,
      height: ORBIT_H,
      pattern: '/plates/orbit/{i2}.webp',
    },
    drive: {
      count: driveCount,
      width: DRIVE_W,
      height: DRIVE_H,
      pattern: '/plates/drive/{i3}.webp',
      fps: DRIVE_FPS,
    },
  };
  writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`manifest: ${MANIFEST_OUT}`);
  return manifest;
}

function outputsComplete(driveCount) {
  const orbitOk = listWebp(ORBIT_OUT_DIR).length === ORBIT_COUNT;
  const driveOk =
    listWebp(DRIVE_OUT_DIR).length === driveCount && driveCount > 0;
  return (
    orbitOk && driveOk && existsSync(POSTER_OUT) && existsSync(MANIFEST_OUT)
  );
}

function moveSourceVideos() {
  mkdirSync(SEQUENCE_WORK_DIR, { recursive: true });
  for (const name of VIDEOS_TO_MOVE) {
    const src = join(ROOT, 'public', name);
    const dst = join(SEQUENCE_WORK_DIR, name);
    if (!existsSync(src)) {
      console.log(
        `move: public/${name} not present (already moved?) — skipping`,
      );
      continue;
    }
    if (existsSync(dst)) {
      console.warn(
        `move: sequence-work/${name} already exists — leaving public/${name} in place (not overwriting)`,
      );
      continue;
    }
    renameSync(src, dst);
    console.log(`move: public/${name} -> sequence-work/${name}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const tAll = now();
  const trialFrames = parseTrialArg(process.argv.slice(2));
  console.log(`build-plates: ffmpeg = ${ffmpegPath}`);
  const video = findDriveVideo();
  console.log(`build-plates: drive video = ${video}`);

  if (trialFrames) {
    console.log(
      `\ntrial mode: drive frames ${trialFrames.join(', ')} -> work/polish/ (public/ untouched)`,
    );
    const driveChain = resolveDriveChain(video);
    console.log(`  chain: ${driveChain}`);
    buildTrial(video, driveChain, trialFrames);
    console.log(`\ndone in ${((now() - tAll) / 1000).toFixed(1)}s`);
    return;
  }

  mkdirSync(PLATES_DIR, { recursive: true });

  console.log('\n[1/4] orbit plates');
  buildOrbit();

  console.log('\n[2/4] poster');
  buildPoster();

  console.log('\n[3/4] drive frames');
  const driveChain = resolveDriveChain(video);
  const drive = buildDriveWithinBudget(video, driveChain);

  console.log('\n[4/4] manifest');
  const manifest = writeManifest(drive.count);

  const orbitBytes = dirBytes(ORBIT_OUT_DIR);
  const posterBytes = statSync(POSTER_OUT).size;
  console.log('\nsummary');
  console.log(
    `  orbit  ${manifest.orbit.count} x ${ORBIT_W}x${ORBIT_H} q${ORBIT_QUALITY}  ${fmtBytes(orbitBytes)}`,
  );
  console.log(
    `  drive  ${manifest.drive.count} x ${DRIVE_W}x${DRIVE_H} q${drive.quality} @ ${DRIVE_FPS}fps  ${fmtBytes(drive.bytes)}  (budget ${fmtBytes(DRIVE_BUDGET_BYTES)}${drive.bytes <= DRIVE_BUDGET_BYTES ? ', OK' : ', OVER'})`,
  );
  console.log(
    `  poster 1 x ${ORBIT_W}x${ORBIT_H} q${POSTER_QUALITY}  ${fmtBytes(posterBytes)}`,
  );
  console.log(`  total  ${fmtBytes(orbitBytes + drive.bytes + posterBytes)}`);

  if (outputsComplete(drive.count)) {
    console.log('\nmoving source videos out of public/');
    moveSourceVideos();
  } else {
    console.warn('\noutputs incomplete — source videos left in public/');
  }
  console.log(`\ndone in ${((now() - tAll) / 1000).toFixed(1)}s`);
}

try {
  main();
} catch (err) {
  console.error(
    `\nbuild-plates failed: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}

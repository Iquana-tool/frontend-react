import React, { useEffect, useMemo, useRef } from 'react';
import {
  useImageObject,
  useInferenceRun,
  useObjectsList,
} from '../../../stores/selectors/annotationSelectors';
import useImageDisplayRect from '../../../hooks/useImageDisplayRect';
import useInferenceRunTracker from '../../../hooks/useInferenceRunTracker';
import useInferenceColors from './useInferenceColors';
import {
  EMPTY_END_S,
  FAIL_END_S,
  estimatedProgress,
  frontMax,
  frontRadius,
  nearestDistance,
  pointInPolygon,
  runGeometry,
  waveLength,
  wavePeriodS,
} from './inferenceTiming';

const TAU = Math.PI * 2;
const clamp = (x, lo = 0, hi = 1) => (x < lo ? lo : x > hi ? hi : x);
const smooth = (x) => x * x * (3 - 2 * x);
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

const hexToRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return [20, 184, 166];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Most dots the cloud draws, so a large stage stays cheap per frame. */
const MAX_DOTS = 9000;

/** Resolution of the brightness map; a little blur makes it follow regions, not texture. */
const LUM_W = 48;

/**
 * How bright the image is, overall and region by region (0 = black, 1 = white).
 *
 * A full-strength scrim turns a bright photo a dull grey, so bright areas get a
 * lighter one — still dark enough for the glowing dots to read against.
 * Read once per image from a small downscaled copy; the image is a data URL, so
 * the canvas is never tainted, but a read that throws simply keeps the dark look.
 */
export const measureBrightness = (image) => {
  const iw = image?.naturalWidth || image?.width || 0;
  const ih = image?.naturalHeight || image?.height || 0;
  if (!iw || !ih || typeof document === 'undefined') return null;
  try {
    const w = LUM_W;
    const h = Math.max(1, Math.round((LUM_W * ih) / iw));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    if (!g) return null;
    g.drawImage(image, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data;
    const raw = new Float32Array(w * h);
    let sum = 0;
    for (let i = 0; i < w * h; i++) {
      const l = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
      raw[i] = l;
      sum += l;
    }
    const grid = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        let n = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            s += raw[yy * w + xx];
            n++;
          }
        }
        grid[y * w + x] = s / n;
      }
    }
    return { w, h, grid, mean: sum / (w * h) };
  } catch {
    return null;
  }
};

/** 0 where the image is dark, 1 where it is bright. */
const brightness = (lum) => smooth(clamp((lum - 0.45) / 0.3));

/**
 * The point cloud, in display pixels: a jittered grid over what the model looks
 * at, each dot with its distance to the nearest pulse origin.
 */
const buildCloud = (geometry, k, width, height) => {
  const sp = Math.max(11, Math.sqrt((width * height) / MAX_DOTS));
  const origins = geometry.origins.map((o) => ({ x: o.x * k, y: o.y * k }));
  const negatives = geometry.negatives.map((o) => ({ x: o.x * k, y: o.y * k }));
  const polygon = geometry.polygon ? geometry.polygon.map(([x, y]) => [x * k, y * k]) : null;
  const quiet = 46;
  // Deterministic jitter, so a re-measure does not reshuffle the cloud.
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const X = [];
  const Y = [];
  const D = [];
  const Q = [];
  const R = [];
  for (let gy = 0; gy * sp < height; gy++) {
    for (let gx = 0; gx * sp < width; gx++) {
      const x = (gx + 0.5 + (rnd() - 0.5) * 0.7) * sp;
      const y = (gy + 0.5 + (rnd() - 0.5) * 0.7) * sp;
      if (x < 2 || y < 2 || x > width - 2 || y > height - 2) continue;
      if (polygon && !pointInPolygon(x, y, polygon)) continue;
      let q = 1;
      for (const n of negatives) {
        const d = Math.hypot(x - n.x, y - n.y);
        if (d < quiet) q = Math.min(q, 0.08 + 0.92 * smooth(d / quiet));
      }
      X.push(x); Y.push(y); D.push(nearestDistance(x, y, origins)); Q.push(q); R.push(rnd());
    }
  }
  return {
    n: X.length,
    X: Float32Array.from(X),
    Y: Float32Array.from(Y),
    D: Float32Array.from(D),
    Q: Float32Array.from(Q),
    R: Float32Array.from(R),
    origins,
    polygon,
    maxD: geometry.maxD * k,
  };
};

/**
 * The canvas animation for a model run: a cloud of dots over what the model
 * looks at, with two or three large waves pulsing out from the prompts (or the
 * middle) in the colours of the labels in flight.
 *
 * - The wave speed follows the model's estimated time, and the waves reach
 *   further out as the run nears that estimate. The exact number is on the
 *   action bar.
 * - Prompts are prompts, not limits: the pulses start at the positive points or
 *   the box centre, and negative points keep a quiet patch. Only focus mode
 *   limits the cloud, to the focused object.
 * - Success: the cloud fades out from the middle while the new outlines pop in
 *   (SegmentationOverlay pops them on the same clock, see inferenceTiming).
 * - Nothing found: one calm grey sweep and a "No objects found" pill. No red.
 * - Failure: every dot turns red and the cloud shakes.
 *
 * Purely atmospheric and always `pointer-events-none` — the action bar stays
 * reachable while it runs. It also hosts the run tracker, which decides when
 * the streamed outlines are all in.
 */
const InferenceScanOverlay = ({ containerRef, zoomLevel = 1, panOffset = { x: 0, y: 0 } }) => {
  useInferenceRunTracker();
  const run = useInferenceRun();
  const imageObject = useImageObject();
  const objects = useObjectsList();
  const colors = useInferenceColors(run);
  const rect = useImageDisplayRect(containerRef, imageObject);
  const canvasRef = useRef(null);
  const runRef = useRef(run);
  runRef.current = run;
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  const imgW = imageObject?.width || imageObject?.naturalWidth || 0;
  const imgH = imageObject?.height || imageObject?.naturalHeight || 0;
  const runId = run?.id ?? null;
  const lum = useMemo(() => measureBrightness(imageObject), [imageObject]);

  // Where the run looks is fixed when it starts; outlines arriving later do not move it.
  const geometry = useMemo(
    () => (runId != null && imgW ? runGeometry(run, imgW, imgH, objects) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runId, imgW, imgH]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !geometry || !rect.width || !rect.height) return undefined;
    const W = rect.width;
    const H = rect.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const cloud = buildCloud(geometry, W / imgW, W, H);
    // The scrim follows the image region by region: bright areas get a lighter
    // one, so a bright photo is dimmed rather than greyed out, while the glow
    // still has something to shine against. A small alpha map, scaled up smoothly.
    let scrimMap = null;
    if (lum) {
      scrimMap = document.createElement('canvas');
      scrimMap.width = lum.w;
      scrimMap.height = lum.h;
      const sg = scrimMap.getContext('2d');
      if (sg) {
        const img = sg.createImageData(lum.w, lum.h);
        for (let i = 0; i < lum.w * lum.h; i++) {
          img.data[i * 4] = 6;
          img.data[i * 4 + 1] = 14;
          img.data[i * 4 + 2] = 16;
          img.data[i * 4 + 3] = Math.round(255 * 0.34 * (1 - 0.2 * brightness(lum.grid[i])));
        }
        sg.putImageData(img, 0, 0);
      } else {
        scrimMap = null;
      }
    }
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lam = waveLength(cloud.maxD);
    const fw = 40;
    const fl = 16;
    const fMax = frontMax(cloud.maxD);
    // Soft glow sprites, one per colour: a radial falloff drawn once and stamped
    // under each bright dot, so the halo has no hard edge.
    const spriteCache = new Map();
    const glowSprite = (rgb) => {
      const key = rgb.join(',');
      let sprite = spriteCache.get(key);
      if (!sprite) {
        sprite = document.createElement('canvas');
        sprite.width = 32;
        sprite.height = 32;
        const sg = sprite.getContext('2d');
        if (sg) {
          const gr = sg.createRadialGradient(16, 16, 0, 16, 16, 16);
          gr.addColorStop(0, `rgba(${key},1)`);
          gr.addColorStop(0.35, `rgba(${key},0.45)`);
          gr.addColorStop(1, `rgba(${key},0)`);
          sg.fillStyle = gr;
          sg.fillRect(0, 0, 32, 32);
        }
        spriteCache.set(key, sprite);
      }
      return sprite;
    };
    const RED = [248, 113, 113];
    const GREY = [139, 152, 166];
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const r = runRef.current;
      if (!r) return;
      const now = Date.now();
      const t = (now - r.startedAt) / 1000;
      const ending = r.phase === 'ending';
      const te = ending ? (now - r.endedAt) / 1000 : -1;
      const tA = ending ? (r.endedAt - r.startedAt) / 1000 : t;
      const fail = ending && r.outcome === 'fail';
      const empty = ending && r.outcome === 'empty';
      const success = ending && r.outcome === 'success';
      const cols = colorsRef.current.map(hexToRgb);
      const nc = cols.length;

      // Progress: estimated while open; a result takes it to 1 quickly.
      const pA = estimatedProgress(tA, r.etaS);
      const pg = success || empty ? pA + (1 - pA) * (1 - (1 - clamp(te / 0.35)) ** 3) : pA;

      let env = smooth(clamp(t / 0.3));
      if (fail) env *= 1 - smooth(clamp((te - 0.75) / 0.6));
      if (empty) env *= 1 - smooth(clamp((te - 1.2) / (EMPTY_END_S - 1.2 - 0.3)));
      const envScrim = success ? env * (1 - smooth(clamp(te / 1.1))) : env;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);

      // Scrim: the image is momentarily not yours to edit, and the dots need
      // something to read against. Darker outside a focused object.
      if (envScrim > 0) {
        if (scrimMap) {
          ctx.globalAlpha = envScrim;
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(scrimMap, 0, 0, W, H);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = `rgba(6, 14, 16, ${(0.34 * envScrim).toFixed(3)})`;
          ctx.fillRect(0, 0, W, H);
        }
        if (cloud.polygon) {
          ctx.beginPath();
          ctx.rect(0, 0, W, H);
          cloud.polygon.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          ctx.fillStyle = `rgba(4, 8, 10, ${(0.36 * envScrim).toFixed(3)})`;
          ctx.fill('evenodd');
        }
      }

      let gx = 0;
      let gy = 0;
      let jit = 0;
      if (fail && !reduced) {
        const d = Math.exp(-te * 4.5);
        gx = 10 * d * Math.sin(te * 44);
        gy = 2 * d * Math.sin(te * 61);
        jit = 2.2 * Math.exp(-te * 3.2);
      }
      const fk = fail ? clamp(te / 0.12) : 0;
      const flash = fail ? 0.55 + 0.45 * Math.exp(-te * 2.2) : 0;
      const sweepR = empty && te > 0.3 ? cloud.maxD * 1.05 * easeIO(clamp((te - 0.3) / 0.8)) : -1;
      // Same clock as the outline pop-in, which runs in image pixels; the front
      // scales with the display, so the two meet.
      const fr = success ? frontRadius(te, cloud.maxD) : -1;
      const frontLive = fr >= 0 && fr < fMax - 1;

      if (env > 0.002) {
        ctx.globalCompositeOperation = 'lighter';
        const Pw = wavePeriodS(r.etaS);
        const waveT = reduced ? 0 : t / Pw;
        const amp = reduced ? 0 : 1;
        const r0 = 1.15;
        const rmin = Math.min(70, cloud.maxD * 0.2);
        const soft = Math.max(60, lam * 0.6);
        const reachD = rmin + (cloud.maxD * 1.03 + soft * 0.5 - rmin) * pg;
        for (let i = 0; i < cloud.n; i++) {
          const d = cloud.D[i];
          let gone = 0;
          if (fr >= 0) {
            gone = smooth(clamp((fr - d) / fw));
            if (gone >= 0.999) continue;
          }
          const x = cloud.X[i];
          const y = cloud.Y[i];
          const ph = d / lam - waveT + 0.06 * Math.sin(x * 0.021 + y * 0.017);
          const wv = 0.5 + 0.5 * Math.cos(ph * TAU);
          const w3 = wv * wv * wv;
          // Each ring carries one label colour; colours hand over in the dim gap between rings.
          const fli = Math.floor(ph + 0.5);
          const frc = ph + 0.5 - fli;
          const ci = ((fli % nc) + nc) % nc;
          const m = nc > 1 ? smooth(clamp((frc - 0.85) / 0.15)) : 0;
          const ca = cols[ci];
          const cb = cols[(ci + 1) % nc];
          let R = ca[0] + (cb[0] - ca[0]) * m;
          let G = ca[1] + (cb[1] - ca[1]) * m;
          let B = ca[2] + (cb[2] - ca[2]) * m;
          const att = 1 - smooth(clamp((d - reachD + soft * 0.5) / soft));
          const fall = 0.7 + 0.3 * Math.exp(-d / Math.max(200, cloud.maxD * 0.6));
          let a = (0.07 + 0.06 * att + amp * 0.45 * w3 * fall * att) * cloud.Q[i];
          let rad = r0 * (1 + 0.35 * w3 * amp * att);

          if (frontLive) {
            // The fade front: dots flare on its bright rim, then they are gone.
            const dd = Math.abs(d - fr);
            if (dd < fl) {
              const w = 1 - dd / fl;
              a += 0.5 * w;
              rad *= 1 + 0.45 * w;
              R += (235 - R) * 0.6 * w; G += (240 - G) * 0.6 * w; B += (245 - B) * 0.6 * w;
            }
          }
          if (fr >= 0) a *= 1 - gone;
          if (sweepR >= 0) {
            const k = clamp((sweepR - d) / 60);
            if (k > 0) {
              R += (139 - R) * k; G += (152 - G) * k; B += (166 - B) * k;
              a = a * (1 - k) + 0.1 * k; rad *= 1 - 0.25 * k;
            }
            const dd = Math.abs(d - sweepR);
            if (dd < 12 && sweepR < cloud.maxD) {
              const w = 1 - dd / 12;
              a += 0.35 * w;
              R += (225 - R) * w * 0.6; G += (232 - G) * w * 0.6; B += (240 - B) * w * 0.6;
            }
          }
          if (fk > 0) {
            R += (248 - R) * fk; G += (113 - G) * fk; B += (113 - B) * fk;
            a = a * (1 - fk) + flash * fk; rad = rad * (1 - fk) + r0 * 1.25 * fk;
          }
          a *= env;
          if (a < 0.01) continue;
          let px = x + gx;
          let py = y + gy;
          if (jit > 0) {
            const q = cloud.R[i] * 50;
            px += jit * Math.sin(te * 70 + q);
            py += jit * Math.cos(te * 63 + q * 1.3);
          }
          const fill = `rgb(${R | 0},${G | 0},${B | 0})`;
          ctx.fillStyle = fill;
          // The glow: a soft halo in the ring's colour under the brighter dots
          // (skipped for the dim ones, where it would not show and only costs time).
          if (a > 0.2) {
            const hr = rad * 4.6;
            ctx.globalAlpha = (a > 1 ? 1 : a) * 0.42;
            ctx.drawImage(glowSprite(fk > 0 ? RED : sweepR >= 0 && d < sweepR ? GREY : ca), px - hr, py - hr, hr * 2, hr * 2);
          }
          ctx.globalAlpha = a > 1 ? 1 : a;
          ctx.beginPath();
          ctx.arc(px, py, rad, 0, TAU);
          ctx.fill();
        }

        if (fail) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
          const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2);
          vg.addColorStop(0, 'rgba(239,68,68,0)');
          vg.addColorStop(1, `rgba(239,68,68,${(env * (0.08 + 0.3 * Math.exp(-te * 1.5))).toFixed(3)})`);
          ctx.fillStyle = vg;
          ctx.fillRect(0, 0, W, H);
        }

        // The positive prompts breathe with the wave period while the model works.
        if (!reduced && !ending && r.positives.length) {
          ctx.globalCompositeOperation = 'source-over';
          const k = (t / Pw) % 1;
          ctx.strokeStyle = 'rgb(232,237,243)';
          ctx.lineWidth = 1.25;
          for (const o of cloud.origins) {
            ctx.globalAlpha = (1 - k) * 0.6 * env;
            ctx.beginPath();
            ctx.arc(o.x, o.y, 7 + 22 * k, 0, TAU);
            ctx.stroke();
          }
        }
      }

      // Nothing found: a neutral pill where the model looked, not an error.
      if (empty && te > 0.35) {
        const k = clamp((te - 0.35) / 0.3) * (1 - clamp((te - (EMPTY_END_S - 0.4)) / 0.4));
        if (k > 0) {
          const o = cloud.origins.length === 1 ? cloud.origins[0] : { x: W / 2, y: H / 2 };
          const txt = 'No objects found';
          const fs = 13;
          ctx.globalCompositeOperation = 'source-over';
          ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
          const tw = ctx.measureText(txt).width;
          const ph = fs * 2.3;
          const pw = tw + fs * 3.4;
          const x0 = clamp(o.x - pw / 2, 8, W - pw - 8);
          const y0 = clamp(o.y - ph / 2, 8, H - ph - 8) - (1 - k) * 6;
          ctx.globalAlpha = k;
          ctx.fillStyle = 'rgba(17,22,29,0.9)';
          ctx.strokeStyle = 'rgba(232,237,243,0.22)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x0, y0, pw, ph, ph / 2);
          else ctx.rect(x0, y0, pw, ph);
          ctx.fill();
          ctx.stroke();
          const ix = x0 + fs * 1.25;
          const iy = y0 + ph / 2;
          const ir = fs * 0.42;
          ctx.strokeStyle = '#aab6c3';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ix, iy, ir, 0, TAU);
          ctx.moveTo(ix - ir * 0.7, iy + ir * 0.7);
          ctx.lineTo(ix + ir * 0.7, iy - ir * 0.7);
          ctx.stroke();
          ctx.fillStyle = '#e8edf3';
          ctx.textBaseline = 'middle';
          ctx.fillText(txt, x0 + fs * 2.2, iy + 0.5);
        }
      }

      if (fail && te > FAIL_END_S) cancelAnimationFrame(raf);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geometry, rect.width, rect.height, imgW, lum]);

  if (!run || rect.width === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none animate-dcFadeSlow"
      style={{
        zIndex: 50,
        transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
        transformOrigin: 'center center',
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="absolute"
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      />
    </div>
  );
};

export default InferenceScanOverlay;

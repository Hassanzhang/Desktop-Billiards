import { drawFrameSkin } from './frame-skin.js';
const TAU = Math.PI * 2;
const ballColors = ['#eee9da', '#e7b42a', '#2166ae', '#b52e32', '#6b408b', '#df762b', '#24765a', '#8c3039', '#22282b'];
// Intro fly-in pacing mirrors the legacy Python overlay: staggered per row,
// one easing curve per ball, arcing sideways off the flight path.
const INTRO_SECONDS = .8;
const INTRO_STAGGER = .06;
const SINK_SECONDS = .55;

export function createRenderer(canvas, initial, images, background, frameAsset) {
  const ctx = canvas.getContext('2d');
  const { width, height, radius } = initial;
  const black8 = initial.black8 ?? images.length + 1;
  const geom = { bounds: initial.bounds, pocket_radius: initial.pocket_radius, rail_depth: initial.rail_depth };
  let surface;
  let baked = null;
  let layer = null;
  let layerCtx = null;
  let prev = null;
  let intro = null;
  const effects = [];
  const circleOn = (g, x, y, r, fill) => {
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = fill; g.fill();
  };
  const path = points => {
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
  };
  const line = (a, b, color, lineWidth = 1.5) => {
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b);
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
  };
  const ease = k => k * k * k * (10 + k * (-15 + 6 * k));
  const mix = (a, b, k) => Math.round(a + (b - a) * k);
  // Mint at rest, amber in the middle, ember red at full power.
  const chargeColor = k => {
    const [from, to] = k < .5 ? [0x69, 0xdb, 0xb3, 0xe7, 0xb4, 0x2a] : [0xe7, 0xb4, 0x2a, 0xd1, 0x55, 0x40];
    const t = k < .5 ? k * 2 : k * 2 - 1;
    return `rgb(${mix(from[0], to[0], t)},${mix(from[1], to[1], t)},${mix(from[2], to[2], t)})`;
  };
  function drawWallpaper() {
    const ratio = Math.max(width / background.naturalWidth, height / background.naturalHeight);
    const w = background.naturalWidth * ratio, h = background.naturalHeight * ratio;
    ctx.drawImage(background, (width - w) / 2, (height - h) / 2, w, h);
  }
  function drawSurface() {
    const [l, t, r, b] = geom.bounds;
    ctx.fillStyle = '#202421'; ctx.fillRect(0, 0, width, height);
    if (background) {
      drawWallpaper();
      ctx.fillStyle = '#11191399'; ctx.fillRect(0, 0, width, height);
      ctx.save(); ctx.beginPath(); ctx.rect(l - 5, t - 5, r - l + 10, b - t + 10); ctx.clip();
      // Keep the same full-desktop crop inside and outside the table, without blur or felt.
      drawWallpaper();
      ctx.restore();
    } else {
      const felt = ctx.createRadialGradient((l + r) / 2, (t + b) / 2, 30, (l + r) / 2, (t + b) / 2, (r - l) * .7);
      felt.addColorStop(0, '#237864'); felt.addColorStop(1, '#134d40');
      ctx.fillStyle = felt; ctx.fillRect(l - 5, t - 5, r - l + 10, b - t + 10);
      // A repeatable, low-contrast nap; cached with the table surface.
      const texture = document.createElement('canvas'); texture.width = texture.height = 128;
      const nap = texture.getContext('2d');
      let seed = 47;
      const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 2200; i++) {
        nap.fillStyle = i % 2 ? '#d1e8cd09' : '#001d170c';
        nap.fillRect(random() * 128, random() * 128, 1, 1.5);
      }
      ctx.fillStyle = ctx.createPattern(texture, 'repeat'); ctx.fillRect(l, t, r - l, b - t);
    }
    drawFrameSkin(ctx, frameAsset, geom);
  }
  // Each ball is baked once into a sprite: shadow, icon, shading and gloss are
  // pre-rendered, so a frame only blits `drawImage` per ball.
  function drawBallFace(g, index, image, x, y) {
    g.save();
    g.shadowColor = '#02130fb3'; g.shadowBlur = 5; g.shadowOffsetY = 4; g.shadowOffsetX = 2;
    circleOn(g, x, y, radius, index === 0 ? '#f4f0df' : index === black8 ? '#171a1d' : ballColors[(index - 1) % 8 + 1]);
    g.shadowColor = 'transparent';
    g.beginPath(); g.arc(x, y, radius, 0, TAU); g.clip();
    if (index === black8) {
      circleOn(g, x, y, radius * .46, '#f5eedc');
      g.fillStyle = '#242b29'; g.font = `600 ${Math.max(8, radius * .67)}px system-ui`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8', x, y + .5);
    } else if (index > 0) {
      if (image) {
        const ratio = radius * 2 / Math.max(image.naturalWidth, image.naturalHeight);
        g.drawImage(image, x - image.naturalWidth * ratio / 2, y - image.naturalHeight * ratio / 2, image.naturalWidth * ratio, image.naturalHeight * ratio);
      } else {
        if (index > 8) {
          g.fillStyle = '#eee8d8'; g.fillRect(x - radius, y - radius, radius * 2, radius * .42);
          g.fillRect(x - radius, y + radius * .58, radius * 2, radius * .42);
        }
        circleOn(g, x, y, radius * .46, '#f5eedc');
        g.fillStyle = '#242b29'; g.font = `600 ${Math.max(8, radius * .67)}px system-ui`;
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(index), x, y + .5);
      }
    }
    const shade = g.createRadialGradient(x - radius * .32, y - radius * .4, radius * .1, x + radius * .05, y + radius * .1, radius * 1.1);
    shade.addColorStop(0, '#ffffff36'); shade.addColorStop(.5, '#ffffff00'); shade.addColorStop(.82, '#071c1726'); shade.addColorStop(1, '#020e0bbf');
    circleOn(g, x, y, radius, shade);
    const shine = g.createRadialGradient(x - radius * .33, y - radius * .4, 0, x - radius * .33, y - radius * .4, radius * .4);
    shine.addColorStop(0, '#ffffffb3'); shine.addColorStop(.4, '#ffffff33'); shine.addColorStop(1, '#ffffff00');
    circleOn(g, x - radius * .33, y - radius * .4, radius * .4, shine);
    g.restore();
  }
  function bake(scale) {
    // 12px padding covers the baked drop shadow (blur 5, offsets 2/4).
    const size = Math.ceil((radius + 12) * 2);
    const sprites = [];
    for (let i = 0; i <= images.length + 1; i++) {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = Math.ceil(size * scale);
      const g = sprite.getContext('2d');
      g.scale(scale, scale);
      drawBallFace(g, i, images[i - 1], size / 2, size / 2);
      sprites.push({ sprite, size });
    }
    return sprites;
  }
  const drawSprite = (index, x, y, shrink = 1, alpha = 1) => {
    const { sprite, size } = baked.sprites[index];
    const scaled = size * shrink;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x - scaled / 2, y - scaled / 2, scaled, scaled);
    ctx.globalAlpha = 1;
  };
  // All balls live on one cached layer, redrawn only when a ball actually moved
  // or sank: while aiming, a frame costs two blits plus cue and guide lines.
  function drawBalls(table, scale) {
    const { xs, ys, sunk } = table;
    if (!layer) {
      layer = document.createElement('canvas');
      layer.width = canvas.width; layer.height = canvas.height;
      layerCtx = layer.getContext('2d');
      prev = null;
    }
    if (!prev || prev.xs.length !== xs.length
      || sunk.some((s, i) => s !== prev.sunk[i] || xs[i] !== prev.xs[i] || ys[i] !== prev.ys[i])) {
      layerCtx.setTransform(scale, 0, 0, scale, 0, 0);
      layerCtx.clearRect(0, 0, width, height);
      for (let i = 0; i < xs.length; i++) {
        if (sunk[i]) continue;
        const { sprite, size } = baked.sprites[i];
        layerCtx.drawImage(sprite, xs[i] - size / 2, ys[i] - size / 2, size, size);
      }
      prev = { xs, ys, sunk };
    }
    ctx.drawImage(layer, 0, 0, width, height);
  }
  // Icons launch from scattered desktop spots and glide into the rack.
  function drawIntro(table, now) {
    const elapsed = (now - intro.start) / 1000;
    let done = true;
    for (let i = 0; i < intro.targets.length; i++) {
      const local = (elapsed - (i % 7) * INTRO_STAGGER) / INTRO_SECONDS;
      if (local < 1) done = false;
      const k = Math.max(0, Math.min(1, local));
      const [origin, target] = [intro.origins[i], intro.targets[i]];
      const easeK = ease(k);
      const dx = target[0] - origin[0], dy = target[1] - origin[1];
      const distance = Math.max(1, Math.hypot(dx, dy));
      const arc = Math.sin(Math.PI * k) ** 2 * Math.min(65, distance * .1) * (i % 2 ? 1 : -1);
      const x = origin[0] + dx * easeK - dy / distance * arc;
      const y = origin[1] + dy * easeK + dx / distance * arc;
      drawSprite(i, x, y);
    }
    if (done) intro = null;
  }
  // A shrinking ghost plus the legacy nine-spark halo where the icon sank.
  function drawSinkEffects(now) {
    for (let k = effects.length - 1; k >= 0; k--) {
      const effect = effects[k];
      const fade = Math.min(1, (now - effect.start) / 1000 / SINK_SECONDS);
      if (fade >= 1) { effects.splice(k, 1); continue; }
      drawSprite(effect.index, effect.x, effect.y, 1 - fade * .54, (1 - fade) ** 1.35);
      const alpha = Math.round(230 * Math.sin(Math.PI * fade) ** .65);
      ctx.fillStyle = `rgba(173,255,221,${alpha / 255})`;
      for (let j = 0; j < 9; j++) {
        const angle = j * TAU / 9 + effect.index * .61;
        const distance = fade * radius * (.9 + j % 3 * .36);
        const size = Math.max(1, (1 - fade) * radius * (.11 + j % 3 * .14));
        circleOn(ctx, effect.x + Math.cos(angle) * distance, effect.y + Math.sin(angle) * distance, size, ctx.fillStyle);
      }
    }
  }
  function drawCue(table) {
    if ((!['ready', 'pull', 'stroke'].includes(table.phase) && !table.cue_follow) || table.sunk[0]) return;
    const white = { x: table.xs[0], y: table.ys[0] };
    let gap = 10 + table.charge * initial.max_pull;
    if (table.phase === 'stroke') gap *= 1 - table.stroke_progress ** 1.6;
    if (table.cue_follow > 0) gap = -12 * (1 - table.cue_follow);
    const origin = table.phase === 'stroke' ? table.stroke_origin : [white.x, white.y];
    const tip = -radius - gap;
    const length = Math.min(400, initial.height * .48);
    ctx.save(); ctx.translate(...origin); ctx.rotate(Math.atan2(table.aim[1], table.aim[0]));
    ctx.shadowColor = '#00110c80'; ctx.shadowOffsetY = 3; ctx.shadowBlur = 3;
    const shaft = ctx.createLinearGradient(0, -6, 0, 6);
    shaft.addColorStop(0, '#79532d'); shaft.addColorStop(.35, '#edcf94'); shaft.addColorStop(.7, '#cba565'); shaft.addColorStop(1, '#61432b');
    path([[tip - length, -6], [tip - 18, -2.8], [tip - 18, 2.8], [tip - length, 6]]);
    ctx.fillStyle = shaft; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#443025'; ctx.fillRect(tip - length, -5.5, length * .26, 11);
    for (let i = 0; i < 12; i++) line([tip - length + 8 + i * 6, -5], [tip - length + 6 + i * 6, 5], '#ad93624d', .6);
    ctx.fillStyle = '#1d211e'; ctx.fillRect(tip - length - 6, -6, 7, 12);
    ctx.fillStyle = '#e5dfc7'; ctx.fillRect(tip - 18, -2.8, 14, 5.6);
    ctx.fillStyle = '#5397aa'; ctx.fillRect(tip - 4, -2.8, 4, 5.6);
    ctx.restore();
    // Power arc around the cue ball while pulling: position and color both
    // track the charge so the release moment reads at a glance.
    if (table.phase === 'pull' && table.charge > .01) {
      const track = radius + 7;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f2edce2e';
      ctx.beginPath(); ctx.arc(white.x, white.y, track, 0, TAU); ctx.stroke();
      ctx.strokeStyle = chargeColor(table.charge);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(white.x, white.y, track, -Math.PI / 2, -Math.PI / 2 + TAU * table.charge); ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
  const draw = table => {
    const scale = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * scale) || canvas.height !== Math.round(height * scale)) {
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale); surface = null; layer = null;
    }
    if (!baked || baked.scale !== scale) { baked = { scale, sprites: bake(scale) }; layer = null; }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (!surface) {
      drawSurface();
      surface = document.createElement('canvas'); surface.width = canvas.width; surface.height = canvas.height;
      surface.getContext('2d').drawImage(canvas, 0, 0);
    } else ctx.drawImage(surface, 0, 0, width, height);
    const now = performance.now();
    if (intro) {
      prev = null;
      drawIntro(table, now);
      return;
    }
    if (initial.guide) {
      ctx.setLineDash([5, 7]);
      for (const leg of table.guide) line(leg.start, leg.end, { incoming: '#f2edceaa', white: '#b4d9e5aa', target: '#e2c27dbb' }[leg.role]);
      ctx.setLineDash([]);
      if (table.ghost) {
        circleOn(ctx, ...table.ghost, radius, '#faf5dd14');
        ctx.beginPath(); ctx.arc(...table.ghost, radius, 0, TAU);
        ctx.strokeStyle = '#f5efced9'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    drawCue(table);
    drawBalls(table, scale);
    drawSinkEffects(now);
  };
  const playIntro = table => {
    intro = {
      start: performance.now(),
      targets: table.xs.map((x, i) => [x, table.ys[i]]),
      origins: table.xs.map(() => {
        const angle = Math.random() * TAU;
        const distance = Math.hypot(width, height) * (.18 + Math.random() * .3);
        return [width / 2 + Math.cos(angle) * distance, height / 2 + Math.sin(angle) * distance];
      }),
    };
  };
  const sink = (index, x, y) => effects.push({ index, x, y, start: performance.now() });
  return { draw, playIntro, sink, get busy() { return intro !== null || effects.length > 0; } };
}

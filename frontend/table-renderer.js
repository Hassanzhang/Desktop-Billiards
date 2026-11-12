import { drawFrameSkin } from './frame-skin.js';
const TAU = Math.PI * 2;
// Intro fly-in pacing mirrors the legacy Python overlay: staggered per row,
// one easing curve per ball, arcing sideways off the flight path.
const INTRO_SECONDS = .8;
const INTRO_STAGGER = .06;
const SINK_SECONDS = .55;

export function createRenderer(canvas, initial, images, background, frameAsset, cueAsset, matcapAsset) {
  const ctx = canvas.getContext('2d');
  const { width, height, radius } = initial;
  const black8 = initial.black8 ?? images.length + 1;
  const geom = { bounds: initial.bounds, pocket_radius: initial.pocket_radius };
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
  // Icons retain their original artwork. Only the cue ball, black eight
  // and missing-image fallback use the spherical material below.
  function drawBallFace(g, index, image, x, y) {
    if (image) {
      const fit = radius * 2 / Math.max(image.naturalWidth, image.naturalHeight);
      const w = image.naturalWidth * fit, h = image.naturalHeight * fit;
      g.save();
      g.imageSmoothingQuality = 'high';
      g.drawImage(image, x - w / 2, y - h / 2, w, h);
      g.restore();
      return;
    }
    g.save();
    g.beginPath(); g.arc(x, y, radius, 0, TAU); g.clip();
    circleOn(g, x, y, radius, index === 0 ? '#f7f4ea' : index === black8 ? '#14171a' : '#a89e8d');
    if (index > 0) {
      // The printed number patch, shared by the black eight and any icon
      // whose image failed to load.
      circleOn(g, x, y, radius * .48, '#f5eedc');
      g.fillStyle = '#242b29'; g.font = `600 ${Math.max(8, radius * .6)}px system-ui`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(index === black8 ? '8' : String(index), x, y + .5);
    }
    // Phenolic material: the matcap rides in `overlay` over the ball base —
    // its neutral gray keeps base colors intact while its photographic
    // gradient supplies the continuous top-left light, the soft terminator
    // and the fresnel edge, aligned to the ball's true diameter in the
    // image (504 of 512). A compact specular on top sells the gloss. Every
    // material ball shares this lighting; icons skip it entirely.
    const mat = radius * 2 * 512 / 504;
    g.globalCompositeOperation = 'overlay';
    g.drawImage(matcapAsset, x - mat / 2, y - mat / 2, mat, mat);
    g.globalCompositeOperation = 'source-over';
    const lx = x - radius * .42, ly = y - radius * .48;
    const spec = g.createRadialGradient(lx, ly, 0, lx, ly, radius * .3);
    spec.addColorStop(0, 'rgba(255,255,255,.72)');
    spec.addColorStop(.4, 'rgba(255,255,255,.2)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    circleOn(g, x, y, radius, spec);
    g.restore();
  }
  // The felt shadow lives with the balls layer, not the sprite: an offset
  // elliptical pool drawn beneath every ball.
  function drawBallShadow(g, x, y, index) {
    const icon = index > 0 && index !== black8;
    g.save();
    g.translate(x, y + radius * (icon ? .7 : .36));
    g.scale(1, icon ? .3 : .55);
    const shadow = g.createRadialGradient(0, 0, radius * .12, 0, 0, radius * 1.04);
    shadow.addColorStop(0, `rgba(3,12,9,${icon ? .16 : .32})`);
    shadow.addColorStop(1, 'rgba(3,12,9,0)');
    circleOn(g, 0, 0, radius * 1.04, shadow);
    g.restore();
  }
  function bake(scale) {
    const size = Math.ceil((radius + 8) * 2);
    const sprites = [];
    // Icon images skip the black eight slot: balls after it shift by one.
    const ballImage = i => i === 0 || i === black8 ? null : i < black8 ? images[i - 1] : images[i - 2];
    for (let i = 0; i <= images.length + 1; i++) {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = Math.ceil(size * scale);
      const g = sprite.getContext('2d');
      g.scale(scale, scale);
      drawBallFace(g, i, ballImage(i), size / 2, size / 2);
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
  // -- cue -----------------------------------------------------------------
  // Clean once at load time; alpha=1 speckles otherwise enlarge the visible
  // bounds and survive source-atop lighting. Keep the original asset intact.
  const cueTexture = document.createElement('canvas');
  let cueBounds;
  if (cueAsset) {
    cueTexture.width = cueAsset.naturalWidth;
    cueTexture.height = cueAsset.naturalHeight;
    const textureCtx = cueTexture.getContext('2d');
    textureCtx.drawImage(cueAsset, 0, 0);
    const cuePixels = textureCtx.getImageData(0, 0, cueTexture.width, cueTexture.height);
    let left = cueTexture.width, top = cueTexture.height, right = 0, bottom = 0;
    for (let y = 0; y < cueTexture.height; y++) {
      for (let x = 0; x < cueTexture.width; x++) {
        const a = (y * cueTexture.width + x) * 4 + 3;
        if (cuePixels.data[a] <= 8) { cuePixels.data[a] = 0; continue; }
        left = Math.min(left, x); right = Math.max(right, x + 1);
        top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
      }
    }
    textureCtx.putImageData(cuePixels, 0, 0);
    cueBounds = [left, top, right - left, bottom - top];
  }
  let cueLayer = null;
  let cueCtx = null;
  const flashes = [];
  const flash = (x, y, aim) => flashes.push({ x, y, aim: [aim[0], aim[1]], start: performance.now() });
  const cueLength = () => Math.min(400, initial.height * .48);
  const cueVisible = table =>
    (['ready', 'pull', 'stroke'].includes(table.phase) || table.cue_follow > 0) && !table.sunk[0];
  const cueGeom = table => {
    let gap = 10 + table.charge * initial.max_pull;
    if (table.phase === 'stroke') gap *= 1 - table.stroke_progress ** 1.6;
    // Short follow-through: the tip presses a few px past contact, it never
    // rides through the ball.
    if (table.cue_follow > 0) gap = -4 * table.cue_follow;
    const origin = table.phase === 'stroke' ? table.stroke_origin : [table.xs[0], table.ys[0]];
    const angle = Math.atan2(table.aim[1], table.aim[0]);
    return { white: { x: table.xs[0], y: table.ys[0] }, origin, angle, tipX: -radius - gap };
  };
  // A faint contact shadow on the cloth, offset screen-down; drawn beneath
  // the balls so they occlude it like real felt shading. Built from the cue
  // layer's own pixels, so it follows the cue shape instead of a rectangle.
  function drawContactShadow() {
    if (!cueLayer) return;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2.5;
    ctx.drawImage(cueLayer, 0, 0, width, height);
    ctx.restore();
  }
  // Renders the rotated cue texture plus its screen-space light into a
  // private layer; the tip is mirrored so the texture's left-hand cue head
  // points at the white ball.
  function updateCueLayer(table, scale) {
    if (!cueAsset || !cueVisible(table)) { cueLayer = null; return; }
    if (!cueLayer) {
      cueLayer = document.createElement('canvas');
      cueLayer.width = canvas.width; cueLayer.height = canvas.height;
      cueCtx = cueLayer.getContext('2d');
    }
    const { white, origin, angle, tipX } = cueGeom(table);
    const length = cueLength();
    // Independent shaft diameter: short windows keep a legible tip and rings.
    // Bounds describe the actual cue, excluding the large transparent margins.
    const pad = 18;
    cueCtx.setTransform(scale, 0, 0, scale, 0, 0);
    cueCtx.clearRect(0, 0, width, height);
    cueCtx.save();
    cueCtx.translate(...origin);
    cueCtx.rotate(angle);
    // Mirror along the shaft: the texture's left-hand cue head must land on
    // the ball side, the butt end trailing behind.
    cueCtx.translate(tipX, 0);
    cueCtx.scale(-1, 1);
    cueCtx.imageSmoothingQuality = 'high';
    cueCtx.drawImage(cueTexture, ...cueBounds, 0, -pad / 2, length, pad);
    cueCtx.restore();
    // Screen-space cylinder light: the pole of light stays on the upper edge
    // no matter how the cue rotates, so it never sticks to the texture.
    const axis = [Math.cos(angle), Math.sin(angle)];
    let up = [-axis[1], axis[0]];
    if (up[1] > 0) up = [-up[0], -up[1]];
    const center = [
      origin[0] + axis[0] * (tipX - length / 2),
      origin[1] + axis[1] * (tipX - length / 2),
    ];
    const half = pad / 2;
    const g = cueCtx.createLinearGradient(
      center[0] - up[0] * half, center[1] - up[1] * half,
      center[0] + up[0] * half, center[1] + up[1] * half,
    );
    // A narrow upper-edge sheen preserves the baked wood/metal/linen detail.
    g.addColorStop(0, '#00000020');
    g.addColorStop(.38, '#ffffff00');
    g.addColorStop(.58, '#ffffff08');
    g.addColorStop(.68, '#fff4df66');
    g.addColorStop(.76, '#ffffff12');
    g.addColorStop(1, '#ffffff00');
    cueCtx.globalCompositeOperation = 'source-atop';
    cueCtx.fillStyle = g;
    const corners = [];
    for (const ax of [tipX, tipX - length]) {
      for (const side of [1, -1]) {
        corners.push([
          origin[0] + axis[0] * ax + up[0] * side * pad / 2,
          origin[1] + axis[1] * ax + up[1] * side * pad / 2,
        ]);
      }
    }
    const xsCorner = corners.map(c => c[0]);
    const ysCorner = corners.map(c => c[1]);
    cueCtx.fillRect(
      Math.min(...xsCorner) - 2, Math.min(...ysCorner) - 2,
      Math.max(...xsCorner) - Math.min(...xsCorner) + 4,
      Math.max(...ysCorner) - Math.min(...ysCorner) + 4,
    );
    // The tip only yields where it actually overlaps the white ball.
    cueCtx.globalCompositeOperation = 'destination-out';
    cueCtx.beginPath(); cueCtx.arc(white.x, white.y, radius, 0, TAU); cueCtx.fill();
    cueCtx.globalCompositeOperation = 'source-over';
  }
  // A tiny bright dot where the tip meets the white at the instant of contact.
  function drawFlashes(now) {
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      const t = (now - f.start) / 130;
      if (t >= 1) { flashes.splice(i, 1); continue; }
      const px = f.x + f.aim[0] * radius * .92;
      const py = f.y + f.aim[1] * radius * .92;
      const r = radius * .3;
      const a = .6 * (1 - t);
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(255,244,214,${a})`);
      g.addColorStop(1, 'rgba(255,244,214,0)');
      circleOn(ctx, px, py, r, g);
    }
  }
  // Power arc around the cue ball while pulling: position and color both
  // track the charge so the release moment reads at a glance.
  function drawChargeArc(table) {
    if (table.phase !== 'pull' || table.charge <= .01 || table.sunk[0]) return;
    const track = radius + 7;
    const white = { x: table.xs[0], y: table.ys[0] };
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f2edce2e';
    ctx.beginPath(); ctx.arc(white.x, white.y, track, 0, TAU); ctx.stroke();
    ctx.strokeStyle = chargeColor(table.charge);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(white.x, white.y, track, -Math.PI / 2, -Math.PI / 2 + TAU * table.charge); ctx.stroke();
    ctx.lineCap = 'butt';
  }
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
        drawBallShadow(layerCtx, xs[i], ys[i], i);
        const { sprite, size } = baked.sprites[i];
        layerCtx.drawImage(sprite, xs[i] - size / 2, ys[i] - size / 2, size, size);
      }
      prev = { xs, ys, sunk };
    }
    ctx.drawImage(layer, 0, 0, width, height);
  }
  // Icons launch from scattered desktop spots and glide into the rack.
  function drawIntro(now) {
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
      drawBallShadow(ctx, x, y, i);
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
  const draw = table => {
    const scale = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * scale) || canvas.height !== Math.round(height * scale)) {
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale); surface = null; layer = null; cueLayer = null;
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
      drawIntro(now);
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
    // Balls first, cue above them: the tip is clipped only where it overlaps
    // the white, so contact reads as the tip pressing into the ball edge.
    updateCueLayer(table, scale);
    drawContactShadow();
    drawBalls(table, scale);
    if (cueLayer) ctx.drawImage(cueLayer, 0, 0, width, height);
    drawChargeArc(table);
    drawSinkEffects(now);
    drawFlashes(now);
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
  return { draw, playIntro, sink, flash, get busy() { return intro !== null || effects.length > 0 || flashes.length > 0; } };
}

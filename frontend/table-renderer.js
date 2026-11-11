const TAU = Math.PI * 2;
const ballColors = ['#eee9da', '#e7b42a', '#2166ae', '#b52e32', '#6b408b', '#df762b', '#24765a', '#8c3039', '#22282b'];

export function createRenderer(canvas, initial, images, background) {
  const ctx = canvas.getContext('2d');
  let surface;
  const circle = (x, y, radius, fill) => {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fillStyle = fill; ctx.fill();
  };
  const path = points => {
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
  };
  const line = (a, b, color, width = 1.5) => {
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  };
  function drawWallpaper() {
    const { width, height } = initial;
    const ratio = Math.max(width / background.naturalWidth, height / background.naturalHeight);
    const w = background.naturalWidth * ratio, h = background.naturalHeight * ratio;
    ctx.drawImage(background, (width - w) / 2, (height - h) / 2, w, h);
  }
  function drawSurface(table) {
    const { width, height } = initial;
    ctx.fillStyle = '#202421'; ctx.fillRect(0, 0, width, height);
    if (background) {
      drawWallpaper();
      ctx.fillStyle = '#11191399'; ctx.fillRect(0, 0, width, height);
    }
    const [l, t, r, b] = table.bounds;
    const edge = table.rail_depth + 21;
    ctx.save();
    ctx.shadowColor = '#0009'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
    ctx.beginPath(); ctx.roundRect(l - edge, t - edge, r - l + edge * 2, b - t + edge * 2, 26);
    const wood = ctx.createLinearGradient(l, t - edge, r, b + edge);
    wood.addColorStop(0, '#533423'); wood.addColorStop(.32, '#895c38'); wood.addColorStop(.7, '#65432b'); wood.addColorStop(1, '#38271f');
    ctx.fillStyle = wood; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.clip();
    // Grain belongs to the wood, never to the playing cloth or UI.
    for (let i = 0; i < 100; i++) {
      const y = t - edge + i * (b - t + edge * 2) / 100;
      ctx.beginPath(); ctx.moveTo(l - edge, y);
      ctx.bezierCurveTo(l + (r - l) * .3, y + 9, l + (r - l) * .6, y - 9, r + edge, y + 2);
      ctx.strokeStyle = i % 3 === 0 ? '#1d100d24' : '#f2cf8e12'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
    if (background) {
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
    // Leather collars sit within the wood; the cushion jaws overlap their edges.
    for (const [x, y] of table.pockets) {
      circle(x, y, table.pocket_radius + 8, '#302921');
      circle(x, y + 1, table.pocket_radius + 3, '#101612');
      const well = ctx.createRadialGradient(x, y + 8, 1, x, y, table.pocket_radius);
      well.addColorStop(0, '#010403'); well.addColorStop(.8, '#050b08'); well.addColorStop(1, '#18231b');
      circle(x, y, table.pocket_radius, well);
      ctx.beginPath(); ctx.arc(x, y, table.pocket_radius + 5, Math.PI, TAU);
      ctx.strokeStyle = '#a58b5c66'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const points of table.cushions) {
      const center = points.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
      const bevel = ctx.createLinearGradient(...points[0], ...center);
      bevel.addColorStop(0, '#328b6e'); bevel.addColorStop(.25, '#226d55'); bevel.addColorStop(1, '#12402f');
      path(points); ctx.fillStyle = bevel; ctx.fill();
      line(points[0], points[1], '#7bb19666', 1.5);
      line(points[2], points[3], '#17291d', 2);
    }
    const diamond = (x, y) => {
      path([[x, y - 4], [x + 2.5, y], [x, y + 4], [x - 2.5, y]]);
      ctx.fillStyle = '#d8bd86'; ctx.fill();
    };
    for (const f of [.125, .25, .375, .625, .75, .875]) {
      diamond(l + (r - l) * f, t - table.rail_depth - 10);
      diamond(l + (r - l) * f, b + table.rail_depth + 10);
    }
    for (const f of [.25, .5, .75]) {
      diamond(l - table.rail_depth - 10, t + (b - t) * f);
      diamond(r + table.rail_depth + 10, t + (b - t) * f);
    }
    circle(l + (r - l) * .2, (t + b) / 2, 2, '#d0e0be88');
    circle(l + (r - l) * .52, (t + b) / 2, 2, '#d0e0be88');
  }
  function drawBall(ball, index) {
    const { x, y, radius: radius } = ball;
    ctx.save(); ctx.shadowColor = '#02130fb3'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 4; ctx.shadowOffsetX = 2;
    circle(x, y, radius, index === 0 ? '#f4f0df' : ballColors[(index - 1) % 8 + 1]);
    ctx.shadowColor = 'transparent';
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.clip();
    if (index > 0) {
      const image = images[index - 1];
      if (image) {
        const ratio = radius * 2 / Math.max(image.naturalWidth, image.naturalHeight);
        ctx.drawImage(image, x - image.naturalWidth * ratio / 2, y - image.naturalHeight * ratio / 2, image.naturalWidth * ratio, image.naturalHeight * ratio);
      } else {
        if (index > 8) {
          ctx.fillStyle = '#eee8d8'; ctx.fillRect(x - radius, y - radius, radius * 2, radius * .42);
          ctx.fillRect(x - radius, y + radius * .58, radius * 2, radius * .42);
        }
        circle(x, y, radius * .46, '#f5eedc');
        ctx.fillStyle = '#242b29'; ctx.font = `600 ${Math.max(8, radius * .67)}px system-ui`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(index), x, y + .5);
      }
    }
    const shade = ctx.createRadialGradient(x - radius * .32, y - radius * .4, radius * .1, x + radius * .05, y + radius * .1, radius * 1.1);
    shade.addColorStop(0, '#ffffff36'); shade.addColorStop(.5, '#ffffff00'); shade.addColorStop(.82, '#071c1726'); shade.addColorStop(1, '#020e0bbf');
    circle(x, y, radius, shade);
    const shine = ctx.createRadialGradient(x - radius * .33, y - radius * .4, 0, x - radius * .33, y - radius * .4, radius * .4);
    shine.addColorStop(0, '#ffffffb3'); shine.addColorStop(.4, '#ffffff33'); shine.addColorStop(1, '#ffffff00');
    circle(x - radius * .33, y - radius * .4, radius * .4, shine);
    ctx.restore();
  }
  function drawCue(table) {
    if ((!['ready', 'stroke'].includes(table.phase) && !table.cue_follow) || table.balls[0].sunk) return;
    const white = table.balls[0];
    let gap = 10 + table.charge * table.max_pull;
    if (table.phase === 'stroke') gap *= 1 - table.stroke_progress ** 1.6;
    if (table.cue_follow > 0) gap = -12 * (1 - table.cue_follow);
    const origin = table.phase === 'ready' ? [white.x, white.y] : table.stroke_origin;
    const tip = -white.radius - gap;
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
  }
  return table => {
    const scale = window.devicePixelRatio || 1;
    const { width, height } = initial;
    if (canvas.width !== Math.round(width * scale) || canvas.height !== Math.round(height * scale)) {
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale); surface = null;
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (!surface) {
      drawSurface(table);
      surface = document.createElement('canvas'); surface.width = canvas.width; surface.height = canvas.height;
      surface.getContext('2d').drawImage(canvas, 0, 0);
    } else ctx.drawImage(surface, 0, 0, width, height);
    if (initial.guide) {
      ctx.setLineDash([5, 7]);
      for (const leg of table.guide) line(leg.start, leg.end, { incoming: '#f2edceaa', white: '#b4d9e5aa', target: '#e2c27dbb' }[leg.role]);
      ctx.setLineDash([]);
      if (table.ghost) {
        circle(...table.ghost, table.balls[0].radius, '#faf5dd14');
        ctx.beginPath(); ctx.arc(...table.ghost, table.balls[0].radius, 0, TAU);
        ctx.strokeStyle = '#f5efced9'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    drawCue(table);
    table.balls.forEach((ball, i) => { if (!ball.sunk) drawBall(ball, i); });
  };
}

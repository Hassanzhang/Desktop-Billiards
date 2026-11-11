import assert from 'node:assert/strict';
import { drawFrameSkin } from '../frontend/frame-skin.js';
const source = [[123, 116], [768, 102], [1413, 116], [123, 908], [768, 922], [1413, 908]];
for (const [width, height] of [[1280, 800], [1920, 1080]]) {
  const bounds = [width * .09, height * .11, width * .94, height * .89];
  const [l, t, r, b] = bounds;
  const radius = 38, scale = radius / 55;
  const table = { bounds, pocket_radius: radius };
  const expected = [[l, t], [(l+r)/2, t-14*scale], [r, t], [l, b], [(l+r)/2, b+14*scale], [r, b]];
  const patches = [];
  drawFrameSkin({ drawImage: (_, ...args) => patches.push(args) }, { naturalWidth: 1536, naturalHeight: 1024 }, table);
  assert.equal(patches.length, 12);
  source.forEach(([x, y], i) => {
    const patch = patches.find(([sx, sy, sw, sh]) => x >= sx && x < sx+sw && y >= sy && y < sy+sh);
    const [sx, sy, sw, sh, dx, dy, dw, dh] = patch;
    assert.ok(Math.abs(dw/sw-dh/sh) < 1e-9, 'Pocket assemblies must preserve their aspect ratio');
    assert.ok(Math.abs(dx+(x-sx)*dw/sw-expected[i][0]) < 1e-8);
    assert.ok(Math.abs(dy+(y-sy)*dh/sh-expected[i][1]) < 1e-8);
  });
}
console.log('PASS: six pocket anchors align and remain circular at two desktop aspect ratios');

// Fixed-size pocket assemblies; only straight rail sections stretch with the screen.
export function drawFrameSkin(ctx, image, table) {
  const [l, t, r, b] = table.bounds;
  const mid = (l + r) / 2;
  const scale = table.pocket_radius / 55;
  const sx = [0, 232, 652, 884, 1304, 1536];
  const sy = [0, 224, 800, 1024];
  const dx = [l - 123 * scale, l + 109 * scale, mid - 116 * scale, mid + 116 * scale, r - 109 * scale, r + 123 * scale];
  const dy = [t - 116 * scale, t + 108 * scale, b - 108 * scale, b + 116 * scale];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      if (row === 1 && col > 0 && col < 4) continue;
      ctx.drawImage(image,
        sx[col] * image.naturalWidth / 1536, sy[row] * image.naturalHeight / 1024,
        (sx[col + 1] - sx[col]) * image.naturalWidth / 1536, (sy[row + 1] - sy[row]) * image.naturalHeight / 1024,
        dx[col], dy[row], dx[col + 1] - dx[col], dy[row + 1] - dy[row]);
    }
  }
}

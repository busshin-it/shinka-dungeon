import sharp from 'sharp';

function dist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function greenLike(r, g, b) {
  const dominance = g - Math.max(r, b);
  const pureGreenDistance = dist([r,g,b], [0,255,0]);
  return pureGreenDistance < 150 || (g >= 90 && dominance >= 28);
}

export async function removeChromaKey(buffer) {
  const img = sharp(buffer).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let qh = 0, qt = 0;

  const bgLike = (x, y) => {
    const i = (y * width + x) * channels;
    return greenLike(data[i], data[i+1], data[i+2]);
  };

  const seed = (x, y) => {
    const idx = y * width + x;
    if (!visited[idx] && bgLike(x, y)) {
      visited[idx] = 1;
      queue[qt++] = idx;
    }
  };

  // Only chroma-green pixels connected to the outer border are treated as background.
  // Do NOT infer arbitrary border colors: dark hair / clothing can otherwise be erased.
  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }

  while (qh < qt) {
    const idx = queue[qh++];
    const x = idx % width;
    const y = Math.floor(idx / width);
    const i = idx * channels;
    data[i + 3] = 0;

    const neighbors = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (!visited[ni] && bgLike(nx, ny)) {
        visited[ni] = 1;
        queue[qt++] = ni;
      }
    }
  }

  // De-spill only green-dominant pixels. Never alter neutral/dark subject colors.
  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3] === 0) continue;
    const r = data[i], g = data[i+1], b = data[i+2];
    const dominance = g - Math.max(r, b);
    if (g >= 90 && dominance >= 24) {
      const strength = Math.max(0, Math.min(0.85, (dominance - 24) / 120));
      data[i + 3] = Math.round(data[i + 3] * (1 - strength));
      if (data[i + 3] < 20) data[i + 3] = 0;
      if (data[i + 3] > 0) data[i + 1] = Math.max(r, b);
    }
  }

  return sharp(data, { raw: info }).png().toBuffer();
}

export async function alphaStats(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let translucent = 0;
  let opaque = 0;
  const pixels = info.width * info.height;
  for (let i = 3; i < data.length; i += info.channels) {
    const a = data[i];
    if (a <= 8) transparent++;
    else if (a < 247) translucent++;
    else opaque++;
  }
  return {
    pixels,
    transparent,
    translucent,
    opaque,
    transparent_ratio: pixels ? transparent / pixels : 0,
    nonopaque_ratio: pixels ? (transparent + translucent) / pixels : 0,
  };
}

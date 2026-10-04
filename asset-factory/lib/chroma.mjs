import sharp from 'sharp';

function dist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function quantize([r,g,b], step = 24) {
  return [
    Math.round(r / step) * step,
    Math.round(g / step) * step,
    Math.round(b / step) * step,
  ];
}

function keyOf(c) { return c.join(','); }

function borderPalette(data, width, height, channels) {
  const counts = new Map();
  const push = (x,y) => {
    const i = (y * width + x) * channels;
    const c = quantize([data[i], data[i+1], data[i+2]]);
    const k = keyOf(c);
    counts.set(k, (counts.get(k) || 0) + 1);
  };
  for (let x=0;x<width;x+=Math.max(1,Math.floor(width/160))) {
    push(x,0); push(x,height-1);
  }
  for (let y=0;y<height;y+=Math.max(1,Math.floor(height/220))) {
    push(0,y); push(width-1,y);
  }
  return [...counts.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,6)
    .map(([k])=>k.split(',').map(Number));
}

export async function removeChromaKey(buffer) {
  const img = sharp(buffer).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const palette = borderPalette(data, width, height, channels);

  // Always include pure chroma green and common checkerboard grays as possible background colors.
  palette.push([0,255,0], [192,192,192], [224,224,224], [128,128,128], [245,245,245]);

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let qh = 0, qt = 0;

  const bgLike = (x,y) => {
    const i = (y * width + x) * channels;
    const c = [data[i], data[i+1], data[i+2]];
    const minD = Math.min(...palette.map(p => dist(c,p)));
    const chromaDominance = c[1] - Math.max(c[0], c[2]);
    return minD < 54 || (c[1] > 100 && chromaDominance > 26);
  };

  const seed = (x,y) => {
    const idx = y * width + x;
    if (!visited[idx] && bgLike(x,y)) {
      visited[idx] = 1;
      queue[qt++] = idx;
    }
  };

  for (let x=0;x<width;x++) { seed(x,0); seed(x,height-1); }
  for (let y=0;y<height;y++) { seed(0,y); seed(width-1,y); }

  while (qh < qt) {
    const idx = queue[qh++];
    const x = idx % width;
    const y = Math.floor(idx / width);
    const i = idx * channels;
    data[i+3] = 0;

    const neighbors = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
    for (const [nx,ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (!visited[ni] && bgLike(nx,ny)) {
        visited[ni] = 1;
        queue[qt++] = ni;
      }
    }
  }

  // Aggressive global removal for chroma green. The subject prompt forbids green,
  // so green-dominant pixels are safe to treat as background/spill.
  for (let i=0;i<data.length;i+=channels) {
    if (data[i+3] === 0) continue;
    const r=data[i], g=data[i+1], b=data[i+2];
    const dominance = g - Math.max(r,b);
    if (g >= 85 && dominance >= 18) {
      const strength = Math.max(0, Math.min(1, (dominance - 18) / 95));
      data[i+3] = Math.round(data[i+3] * (1 - strength));
      if (data[i+3] < 28) data[i+3] = 0;
    }
    if (data[i+3] > 0 && g > r + 12 && g > b + 12) {
      data[i+1] = Math.max(r,b);
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

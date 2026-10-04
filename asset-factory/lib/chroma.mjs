import sharp from 'sharp';

export async function removeChromaKey(buffer) {
  const image = sharp(buffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    const dominance = g - Math.max(r, b);

    if (g >= 110 && dominance >= 35) {
      const strength = Math.max(0, Math.min(1, (dominance - 35) / 110));
      data[i + 3] = Math.round(a * (1 - strength));
    }

    // Green spill cleanup around antialiased edges.
    if (data[i + 3] > 0 && g > r && g > b) {
      data[i + 1] = Math.max(Math.max(r, b), Math.round(g * 0.65));
    }
  }

  return sharp(data, { raw: info }).png().toBuffer();
}

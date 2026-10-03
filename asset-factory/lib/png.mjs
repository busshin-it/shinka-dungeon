export function inspectPng(buffer) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  if (!Buffer.isBuffer(buffer) || buffer.length < 33 || !buffer.subarray(0,8).equals(sig)) {
    return { valid: false, width: 0, height: 0, colorType: null, hasAlpha: false };
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer[25];
  let hasTrns = false;
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'tRNS') hasTrns = true;
    offset += 12 + len;
    if (type === 'IEND') break;
  }
  return { valid: true, width, height, colorType, hasAlpha: colorType === 4 || colorType === 6 || hasTrns };
}

export function structuralQa(job, buffer) {
  const info = inspectPng(buffer);
  const issues = [];
  if (!info.valid) issues.push('PNGとして読み取れない');
  if (info.valid && job.transparent && !info.hasAlpha) issues.push('透過必須だがアルファチャンネルがない');
  if (info.valid && job.aspect_ratio) {
    const [aw, ah] = String(job.aspect_ratio).split(':').map(Number);
    if (aw > 0 && ah > 0) {
      const expected = aw / ah;
      const actual = info.width / info.height;
      if (Math.abs(actual - expected) / expected > 0.12) issues.push(`縦横比が指定(${job.aspect_ratio})から外れている`);
    }
  }
  return { pass: issues.length === 0, issues, image: info };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const engine = await readFile(path.join(root, 'v4-1/underground-b1-engine.mjs'), 'utf8');
const html = await readFile(path.join(root, 'v4-1/underground-b1-playtest.html'), 'utf8');
const cards = [
  [
    "charge",
    "魔力点火",
    "third-mana-ignite",
    "b1-mana-ignite.webp",
    "a1631645330fed3af67b6c387a013e37998df854923372fb2f4eec893069075a"
  ],
  [
    "break",
    "破魔雷",
    "third-holy-thunder",
    "b1-holy-thunder.webp",
    "fcb0baa263923832d0962ab71049e12898113f1edd366f26921e898e7b2c65a8"
  ],
  [
    "double",
    "双雷",
    "third-twin-thunder",
    "b1-twin-thunder.webp",
    "385ca16c03be8278fd4f2b8c07c808a7b175c6a49e724a1f40f6ecbcf0c977b3"
  ],
  [
    "focus",
    "魔導の研究",
    "third-arcane-study",
    "b1-arcane-study.webp",
    "f9a3229e12ce06ae0a5f5c2ac34e6b0aae60e0cc6e418e7308d353c672b88ae3"
  ],
  [
    "flare",
    "毒炎",
    "third-poison-flame",
    "b1-poison-flame.webp",
    "062514c85d5a0a6174eba27190630cbc4bde3d95dd1adc3589be4cfd2c20a2f3"
  ]
];

for (const [id, name, key, filename, expectedSha256] of cards) {
  test(`B1 original artwork: ${name} (${id})`, async () => {
    const card = engine.match(new RegExp('(?:^|\\n)\\s*' + id + ':\\{[^\\n]*', 'm'))?.[0];
    assert.ok(card, `card ID missing: ${id}`);
    assert.ok(card.includes('magicArt:"' + key + '"'), 'engine artwork key missing');
    assert.ok(html.includes('"' + key + '":"' + filename + '"'), 'HQ art mapping missing');
    const full = path.join(root, 'v4-1/assets', filename);
    const bytes = await readFile(full);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.width, 768);
    assert.equal(meta.height, 1024);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expectedSha256);
    assert.ok((await stat(full)).size > 50000, 'image file unexpectedly small');
  });
}

test('B1 image loading keeps CSS art fallback on error', () => {
  assert.match(html, /img\.addEventListener\("error"/);
  assert.match(html, /else img\.remove\(\)/);
});

import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';

function apiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  return key;
}

async function decodeResponse(response) {
  const raw = await response.text();
  let json;
  try { json = JSON.parse(raw); } catch { json = { raw }; }
  if (!response.ok) {
    const err = new Error(json?.error?.message || `OpenAI API error ${response.status}`);
    err.status = response.status;
    err.code = json?.error?.code;
    err.type = json?.error?.type;
    err.details = json?.error;
    throw err;
  }
  return json;
}

async function post(pathname, body) {
  return decodeResponse(await fetch(`${API_BASE}${pathname}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

async function postForm(pathname, form) {
  return decodeResponse(await fetch(`${API_BASE}${pathname}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey()}` },
    body: form,
  }));
}

function sizeFor(job) {
  const ratio = String(job.aspect_ratio || '2:3');
  if (ratio === '3:2') return '1536x1024';
  if (ratio === '16:9') return '1536x864';
  if (ratio === '9:16') return '864x1536';
  if (ratio === '1:1') return '1024x1024';
  return '1024x1536';
}

async function generateFromReferences(job, prompt, root, model, quality) {
  const refs = (job.reference_paths || []).filter(Boolean);
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  form.append('size', sizeFor(job));
  form.append('quality', quality);
  form.append('output_format', 'png');
  form.append('background', job.chroma_key ? 'opaque' : (job.transparent ? 'transparent' : 'opaque'));
  for (const ref of refs) {
    const full = path.join(root, ref);
    const bytes = await fs.readFile(full);
    form.append('image[]', new Blob([bytes], { type: 'image/png' }), path.basename(ref));
  }
  return postForm('/images/edits', form);
}

export async function generateImage(job, prompt, root = process.cwd()) {
  const model = job.transparent
    ? (process.env.ASSET_FACTORY_TRANSPARENT_IMAGE_MODEL || 'gpt-image-2.5-flare')
    : (process.env.ASSET_FACTORY_IMAGE_MODEL || 'gpt-image-2');
  const quality = process.env.ASSET_FACTORY_IMAGE_QUALITY || 'medium';
  const refs = (job.reference_paths || []).filter(Boolean);
  const result = refs.length
    ? await generateFromReferences(job, `${prompt}\nUse the supplied reference image(s) to preserve character identity or visual lineage. Do not reproduce their background, UI, text, or framing.`, root, model, quality)
    : await post('/images/generations', {
        model,
        prompt,
        n: 1,
        size: sizeFor(job),
        quality,
        output_format: 'png',
        background: job.chroma_key ? 'opaque' : (job.transparent ? 'transparent' : 'opaque'),
      });
  const b64 = result?.data?.[0]?.b64_json;
  if (!b64) throw new Error('Image API returned no b64_json');
  return {
    buffer: Buffer.from(b64, 'base64'),
    model,
    quality,
    usedReferences: refs.length,
    generationId: result?.id || result?.data?.[0]?.id || null,
    created: result?.created || null,
    usage: result?.usage || null,
  };
}

function responseText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const chunks = [];
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (typeof part?.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n');
}

function parseJsonLoose(text) {
  const clean = String(text || '').replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/i, '').trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
  throw new Error('QA response was not valid JSON');
}

export async function visionQa(queue, job, buffer, structural, root = process.cwd()) {
  const model = process.env.ASSET_FACTORY_QA_MODEL || 'gpt-5.6-luna';
  const rules = [
    'exactly one asset; no contact sheet, split panel, or multiple variants',
    'no text, numbers, card title, cost, logo, or UI',
    'matches the requested subject and its gameplay meaning',
    'matches the project gothic silhouette puppet dark-fantasy art direction',
    'reads clearly at small game-screen size',
    ...(job.type === 'card' ? [
      'not a rendered card object; artwork only',
      'portrait-friendly composition with a strong readable spell silhouette',
      'an illustrated gothic/theatrical background is allowed and preferred; do NOT require transparency',
      'do not show checkerboard transparency patterns, blank studio backdrops, or fake alpha backgrounds',
      'the magic should feel like it belongs to the puppet-theatre world, but it does NOT need articulated puppet joints'
    ] : []),
    ...(job.type === 'enemy' ? [
      'one enemy only',
      'full body and full weapon visible',
      'fully transparent alpha background with no scenery, floor, or stage',
      'limbs and weapon are visually separated enough for 2D puppet animation',
      'shoulders, elbows, wrists, hips, and knees remain visually understandable'
    ] : []),
    ...(job.type === 'class' ? [
      'same player identity as the reference if supplied',
      'full body, staff/hair/clothing fully visible',
      'fully transparent alpha background with no scenery or floor',
      'limbs are not excessively overlapped and puppet joints remain visually understandable',
      'long hair, cloth, cape, and ornaments look separable into puppet parts'
    ] : []),
    ...(job.type === 'character' ? [
      'full body visible',
      'fully transparent alpha background with no scenery or floor',
      'limbs are not excessively overlapped and puppet joints remain visually understandable'
    ] : []),
    ...(job.type === 'part' ? [
      'exactly one body/weapon part only',
      'fully transparent alpha background',
      'no other body parts are mixed in',
      'sufficient overlap margin exists for rigging'
    ] : []),
    ...(job.type === 'background' ? [
      'no characters or enemies',
      'clear foreground/midground/background separation suitable for parallax'
    ] : []),
  ];
  const refs = (job.reference_paths || []).filter(Boolean);
  const prompt = `You are the QA gate for an automated game asset factory.
The FIRST image is the generated candidate. Any later images are references only.
Project art direction: ${queue.art_direction}
Asset: ${job.name} (${job.type})
Requested prompt: ${job.prompt}
Negative conditions: ${(job.negative || []).join(', ')}
Structural PNG checks: ${JSON.stringify(structural)}
Evaluate these rules: ${rules.join('; ')}.
Be strict. For transparent jobs, TRUST the Structural PNG checks and alpha_stats as the source of truth for transparency. If alpha_stats.transparent_ratio is at least 0.12, do NOT fail the asset merely because the viewer shows a checkerboard, green preview, or compositing artifact behind transparent pixels. Only fail transparency when structural alpha coverage is insufficient or when obvious non-transparent scenery/background shapes remain. For opaque cards/backgrounds, reject fake transparency checkerboards or empty studio backdrops. For cards, a gothic illustrated background is valid and preferred. If references are supplied, compare identity or visual lineage as appropriate.
Return ONLY JSON in exactly this shape: {"pass":boolean,"score":0-100,"checks":{"single_asset":boolean,"no_text_ui":boolean,"subject_match":boolean,"art_direction":boolean,"puppet_style":boolean,"joint_readability":boolean,"small_screen_silhouette":boolean,"composition":boolean,"transparency_visual":boolean,"reference_consistency":boolean},"issues":["..."],"remediation":"one concise corrected-generation instruction"}`;
  const content = [
    { type: 'input_text', text: prompt },
    { type: 'input_image', image_url: `data:image/png;base64,${buffer.toString('base64')}`, detail: 'high' },
  ];
  for (const ref of refs) {
    const bytes = await fs.readFile(path.join(root, ref));
    content.push({ type: 'input_image', image_url: `data:image/png;base64,${bytes.toString('base64')}`, detail: 'high' });
  }
  const result = await post('/responses', { model, reasoning: { effort: 'none' }, max_output_tokens: 800, input: [{ role: 'user', content }] });
  const qa = parseJsonLoose(responseText(result));
  qa.model = model;
  qa.usage = result?.usage || null;
  return qa;
}

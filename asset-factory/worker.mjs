import fs from 'node:fs/promises';
import path from 'node:path';
import { buildPrompt } from './lib/prompt.mjs';
import { generateImage, visionQa } from './lib/openai.mjs';
import { structuralQa } from './lib/png.mjs';

const ROOT = path.resolve(process.cwd());
const QUEUE_PATH = path.join(ROOT, 'asset-factory', 'queue.json');
const MANIFEST_PATH = path.join(ROOT, 'asset-factory', 'asset-manifest.json');
const ACTIVE = new Set(['waiting','queued','needs_fix','regenerate']);
const MAX_IMAGE_CALLS = Math.max(1, Number(process.env.ASSET_FACTORY_MAX_IMAGE_CALLS || 6));
let imageCalls = 0;

export function parseArgs(argv) {
  const out = { count: 1, asset: '', maxRetries: 2, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--count') out.count = Math.max(1, Number(argv[++i] || 1));
    else if (a === '--asset') out.asset = argv[++i] || '';
    else if (a === '--max-retries') out.maxRetries = Math.max(0, Number(argv[++i] || 0));
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}

export function selectJobs(queue, { count, asset }) {
  let jobs = queue.jobs.filter(j => ACTIVE.has(j.status));
  if (asset) jobs = jobs.filter(j => j.asset_id === asset);
  return jobs.slice(0, count);
}

function manifestFrom(queue) {
  return {
    version: 1,
    project_id: 'shinka',
    project: queue.project,
    naming_rule: 'asset_id + type + name + filename + path + game_key; random generation IDs are metadata only',
    assets: queue.jobs.map(j => ({
      asset_id: j.asset_id,
      game_key: j.game_key || null,
      project_id: j.project_id || 'shinka',
      type: j.type,
      name: j.name,
      display_title: j.display_title || j.name,
      filename: j.filename || path.basename(j.save_path),
      path: j.path || j.save_path,
      current_path: j.current_path || null,
      legacy_path: j.legacy_path || null,
      generation_id: j.generation_id || null,
      transparent: !!j.transparent,
      status: j.status,
      prompt: j.prompt,
      generator: j.generator || null,
      qa: j.qa || null,
    }))
  };
}

async function writeQueue(queue) {
  await fs.writeFile(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifestFrom(queue), null, 2)}\n`, 'utf8');
}

function now() { return new Date().toISOString(); }

async function processJob(queue, job, options) {
  console.log(`\n[asset-factory] ${job.asset_id} / ${job.name}`);
  let remediation = job.qa?.remediation || '';
  for (let retry = 0; retry <= options.maxRetries; retry++) {
    job.status = 'generating';
    job.attempts = (job.attempts || 0) + 1;
    job.updated_at = now();
    await writeQueue(queue);

    const prompt = buildPrompt(queue, job, remediation);
    job.last_prompt = prompt;
    if (options.dryRun) {
      console.log(prompt);
      job.status = 'queued';
      await writeQueue(queue);
      return { dryRun: true };
    }

    try {
      if (imageCalls >= MAX_IMAGE_CALLS) {
        job.status = 'queued';
        job.last_error = { message: `Cost guard stopped run at ${MAX_IMAGE_CALLS} image API calls`, at: now() };
        await writeQueue(queue);
        console.log(`[asset-factory] COST GUARD: stopped before ${job.name}`);
        return { pass: false, costGuard: true };
      }
      imageCalls++;
      const generated = await generateImage(job, prompt, ROOT);
      job.status = 'qa';
      job.generator = {
        model: generated.model,
        quality: generated.quality,
        used_references: generated.usedReferences,
        generation_id: generated.generationId || null,
        created: generated.created || null,
        usage: generated.usage || null
      };
      job.generation_id = generated.generationId || job.generation_id || null;
      await writeQueue(queue);

      const structural = structuralQa(job, generated.buffer);
      let semantic = { pass: false, score: 0, issues: [], remediation: '' };
      if (structural.pass) semantic = await visionQa(queue, job, generated.buffer, structural, ROOT);
      const pass = structural.pass && semantic.pass === true;
      const qa = {
        pass,
        score: Number(semantic.score || 0),
        structural,
        checks: semantic.checks || {},
        issues: [...(structural.issues || []), ...(semantic.issues || [])],
        remediation: semantic.remediation || (structural.issues || []).join('; '),
        checked_at: now(),
        model: semantic.model || null,
        usage: semantic.usage || null,
      };
      job.qa = qa;

      if (pass) {
        const target = path.join(ROOT, job.save_path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, generated.buffer);
        job.current_path = job.save_path;
        job.status = 'github_synced';
        job.github_synced = true;
        job.completed_at = now();
        await writeQueue(queue);
        console.log(`[asset-factory] PASS ${job.name} -> ${job.save_path}`);
        return { pass: true };
      }

      remediation = qa.remediation || `Fix all QA issues: ${qa.issues.join('; ')}`;
      job.status = retry < options.maxRetries ? 'regenerate' : 'needs_fix';
      await writeQueue(queue);
      console.log(`[asset-factory] FAIL ${job.name}: ${qa.issues.join(' / ')}`);
      if (retry >= options.maxRetries) return { pass: false, qa };
    } catch (error) {
      job.last_error = { message: error.message, code: error.code || null, status: error.status || null, at: now() };
      const retryable = error.status === 429 || (error.status >= 500 && error.status < 600);
      job.status = retryable && retry < options.maxRetries ? 'regenerate' : 'needs_fix';
      await writeQueue(queue);
      console.error(`[asset-factory] ERROR ${job.name}: ${error.message}`);
      if (!retryable || retry >= options.maxRetries) return { pass: false, error: error.message };
      await new Promise(r => setTimeout(r, Math.min(30000, 2000 * (retry + 1))));
    }
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const queue = JSON.parse(await fs.readFile(QUEUE_PATH, 'utf8'));
  const jobs = selectJobs(queue, options);
  if (!jobs.length) {
    console.log('[asset-factory] No pending jobs matched.');
    return;
  }
  console.log(`[asset-factory] processing ${jobs.length} job(s), one image per asset`);
  for (const job of jobs) await processJob(queue, job, options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exitCode = 1; });
}

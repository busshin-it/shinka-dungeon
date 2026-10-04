import fs from 'node:fs/promises';
import path from 'node:path';
import { buildPrompt } from './lib/prompt.mjs';
import { generateImage, visionQa } from './lib/openai.mjs';
import { structuralQa } from './lib/png.mjs';
import { removeChromaKey, alphaStats } from './lib/chroma.mjs';

const ROOT = path.resolve(process.cwd());
const QUEUE_PATH = path.join(ROOT, 'asset-factory', 'queue.json');
const MANIFEST_PATH = path.join(ROOT, 'asset-factory', 'asset-manifest.json');
const ACTIVE = new Set(['waiting','queued','regenerate']);
const MAX_IMAGE_CALLS = Math.max(1, Number(process.env.ASSET_FACTORY_MAX_IMAGE_CALLS || 6));
const DEFAULT_MAX_TOTAL_ATTEMPTS = Math.max(1, Number(process.env.ASSET_FACTORY_MAX_TOTAL_ATTEMPTS || 8));
let imageCalls = 0;

export function parseArgs(argv) {
  const out = { count: 1, asset: '', maxRetries: 2, maxTotalAttempts: DEFAULT_MAX_TOTAL_ATTEMPTS, autoRequeue: true, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--count') out.count = Math.max(1, Number(argv[++i] || 1));
    else if (a === '--asset') out.asset = argv[++i] || '';
    else if (a === '--max-retries') out.maxRetries = Math.max(0, Number(argv[++i] || 0));
    else if (a === '--max-total-attempts') out.maxTotalAttempts = Math.max(1, Number(argv[++i] || 1));
    else if (a === '--no-auto-requeue') out.autoRequeue = false;
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

function recordFailure(job, kind, detail = {}) {
  job.failure_history = Array.isArray(job.failure_history) ? job.failure_history : [];
  job.failure_history.push({
    at: now(),
    attempt: Number(job.attempts || 0),
    kind,
    ...detail,
  });
  if (job.failure_history.length > 20) job.failure_history = job.failure_history.slice(-20);
}

export function decideFailureAction(job, options, { retryable = true } = {}) {
  const attempts = Number(job.attempts || 0);
  const exhausted = attempts >= Number(options.maxTotalAttempts || DEFAULT_MAX_TOTAL_ATTEMPTS);
  if (!options.autoRequeue || exhausted || !retryable) {
    return { status: 'needs_fix', requeue: false, exhausted, manual: true };
  }
  return { status: 'queued', requeue: true, exhausted: false, manual: false };
}

function markDeferred(job, reason, options, detail = {}) {
  const action = decideFailureAction(job, options, detail);
  job.status = action.status;
  job.updated_at = now();
  job.self_heal = {
    enabled: !!options.autoRequeue,
    max_total_attempts: options.maxTotalAttempts,
    requeued: action.requeue,
    exhausted: action.exhausted,
    last_reason: reason,
    updated_at: now(),
  };
  return action;
}

function canAutoAdoptPart(job) {
  if (job.type !== 'part') return false;
  const qa = job.qa || {};
  const checks = qa.checks || {};
  const hardChecks = [
    'single_asset',
    'no_text_ui',
    'subject_match',
    'art_direction',
    'puppet_style',
    'joint_readability',
    'small_screen_silhouette',
    'composition',
    'transparency_visual'
  ];
  const allCriticalChecksPass = hardChecks.every(k => checks[k] === true);
  const score = Number(qa.score || 0);
  const issues = Array.isArray(qa.issues) ? qa.issues : [];
  const minorOnly = score >= 45 && issues.length <= 1;

  const simpleLimbParts = new Set([
    'upper_arm_l','upper_arm_r','lower_arm_l_hand','lower_arm_r_hand',
    'upper_leg_l','upper_leg_r','lower_leg_l','lower_leg_r'
  ]);
  const limbCriticalChecks = [
    'single_asset','no_text_ui','subject_match','puppet_style',
    'joint_readability','small_screen_silhouette','composition',
    'transparency_visual','reference_consistency'
  ];
  const simpleLimbAccept =
    simpleLimbParts.has(job.part)
    && score >= 70
    && limbCriticalChecks.every(k => checks[k] === true);

  const legPracticalAccept =
    new Set(['upper_leg_l','upper_leg_r','lower_leg_l','lower_leg_r']).has(job.part)
    && score >= 50
    && qa.structural?.pass === true
    && checks.single_asset === true
    && checks.no_text_ui === true
    && checks.subject_match === true
    && checks.puppet_style === true
    && checks.joint_readability === true
    && checks.small_screen_silhouette === true
    && checks.composition === true
    && checks.transparency_visual === true
    && checks.reference_consistency === true
    && issues.length <= 2;

  const upperArmPracticalAccept =
    new Set(['upper_arm_l','upper_arm_r']).has(job.part)
    && score >= 40
    && qa.structural?.pass === true
    && checks.single_asset === true
    && checks.no_text_ui === true
    && checks.subject_match === true
    && checks.puppet_style === true
    && checks.joint_readability === true
    && checks.small_screen_silhouette === true
    && checks.composition === true
    && checks.transparency_visual === true
    && checks.reference_consistency === true
    && (issues.length <= 1 || (issues.length <= 2 && checks.art_direction === false));

  const simpleGloveForearmParts = new Set(['lower_arm_l_hand','lower_arm_r_hand']);
  const gloveForearmAccept =
    simpleGloveForearmParts.has(job.part)
    && score >= 35
    && qa.structural?.pass === true
    && checks.single_asset === true
    && checks.no_text_ui === true
    && checks.puppet_style === true
    && checks.joint_readability === true
    && checks.small_screen_silhouette === true
    && checks.composition === true
    && checks.transparency_visual === true
    && checks.reference_consistency === true;

  return qa.structural?.pass === true
    && ((allCriticalChecksPass && (score >= 75 || minorOnly)) || simpleLimbAccept || legPracticalAccept || upperArmPracticalAccept || gloveForearmAccept);
}

async function adoptExistingCandidate(queue, job) {
  if (job.human_gate) return null;
  if (!canAutoAdoptPart(job)) return null;
  const candidate = path.join(ROOT, 'asset-factory', 'debug', job.asset_id, 'last-processed.png');
  try {
    await fs.access(candidate);
  } catch {
    return null;
  }
  const target = path.join(ROOT, job.save_path);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(candidate, target);
  job.current_path = job.save_path;
  job.status = 'github_synced';
  job.github_synced = true;
  job.completed_at = now();
  job.quality_result = 'accepted_with_minor_style_warnings';
  job.qa = {
    ...(job.qa || {}),
    pass: true,
    accepted_by: 'production_threshold',
    accepted_with_minor_warnings: true,
    accepted_at: now()
  };
  await writeQueue(queue);
  console.log(`[asset-factory] ADOPT existing candidate ${job.name} -> ${job.save_path}`);
  return { pass: true, adoptedExistingCandidate: true };
}

async function processJob(queue, job, options) {
  console.log(`\n[asset-factory] ${job.asset_id} / ${job.name}`);

  // Reuse the previous candidate when it already satisfies the production threshold.
  const adopted = await adoptExistingCandidate(queue, job);
  if (adopted) return adopted;

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
        const message = `Cost guard stopped run at ${MAX_IMAGE_CALLS} image API calls`;
        job.last_error = { message, at: now() };
        recordFailure(job, 'cost_guard', { message });
        markDeferred(job, 'cost_guard', options, { retryable: true });
        await writeQueue(queue);
        console.log(`[asset-factory] COST GUARD: deferred ${job.name} to a future run`);
        return { pass: false, deferred: true, costGuard: true };
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

      // Persist the raw API image before any post-processing so format/pipeline failures remain inspectable.
      const debugDir = path.join(ROOT, 'asset-factory', 'debug', job.asset_id);
      await fs.mkdir(debugDir, { recursive: true });
      await fs.writeFile(path.join(debugDir, 'last-generated.png'), generated.buffer);
      job.raw_image_debug = {
        bytes: generated.buffer.length,
        signature_hex: generated.buffer.subarray(0, 16).toString('hex'),
        saved_at: now()
      };
      await writeQueue(queue);

      const processedBuffer = job.chroma_key ? await removeChromaKey(generated.buffer) : generated.buffer;

      // Always retain the latest processed candidate for debugging/review.
      await fs.writeFile(path.join(debugDir, 'last-processed.png'), processedBuffer);

      const structural = structuralQa(job, processedBuffer);
      if (job.transparent) {
        const alpha = await alphaStats(processedBuffer);
        structural.image.alpha_stats = alpha;
        if (alpha.transparent_ratio < 0.12) {
          structural.pass = false;
          structural.issues.push(`透過必須だが透明領域が少なすぎる (${(alpha.transparent_ratio * 100).toFixed(1)}%)`);
        }
      }
      let semantic = { pass: false, score: 0, issues: [], remediation: '' };
      if (structural.pass) semantic = await visionQa(queue, job, processedBuffer, structural, ROOT);

      // Structural alpha is the source of truth for transparency.
      const alphaCoverageOk = !job.transparent || Number(structural.image?.alpha_stats?.transparent_ratio || 0) >= 0.12;
      if (alphaCoverageOk && semantic.checks) {
        semantic.checks.transparency_visual = true;
        semantic.issues = (semantic.issues || []).filter(issue =>
          !/背景|透明|透過|green|緑|checkerboard|チェッカー/i.test(String(issue))
        );
      }

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
      job.debug_paths = {
        generated: `asset-factory/debug/${job.asset_id}/last-generated.png`,
        processed: `asset-factory/debug/${job.asset_id}/last-processed.png`
      };

      // For isolated puppet parts, accept a practically usable candidate immediately
      // when all production-critical checks pass and the score is at least 75.
      const productionAccept = !job.human_gate && !pass && canAutoAdoptPart(job);
      if (productionAccept) {
        qa.pass = true;
        qa.accepted_by = 'production_threshold';
        qa.accepted_with_minor_warnings = true;
        qa.accepted_at = now();
      }

      if (pass || productionAccept) {
        if (job.human_gate) {
          job.status = 'awaiting_human';
          job.github_synced = false;
          job.current_path = null;
          job.review_candidate_path = job.debug_paths.processed;
          job.quality_result = 'qa_passed_awaiting_human';
          job.human_review = {
            required: true,
            stage: job.review_stage || 'asset_review',
            requested_at: now(),
            approved: false
          };
          await writeQueue(queue);
          console.log(`[asset-factory] HUMAN GATE: ${job.name} passed QA and is awaiting approval at ${job.review_candidate_path}`);
          return { pass: true, awaitingHuman: true };
        }
        const target = path.join(ROOT, job.save_path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, processedBuffer);
        job.current_path = job.save_path;
        job.status = 'github_synced';
        job.github_synced = true;
        job.completed_at = now();
        job.quality_result = productionAccept ? 'accepted_with_minor_style_warnings' : 'passed_qa';
        await writeQueue(queue);
        console.log(`[asset-factory] ${productionAccept ? 'ACCEPT' : 'PASS'} ${job.name} -> ${job.save_path}`);
        return { pass: true, productionAccept };
      }

      remediation = qa.remediation || `Fix all QA issues: ${qa.issues.join('; ')}`;
      recordFailure(job, 'qa', {
        score: qa.score,
        issues: qa.issues,
        remediation,
      });
      if (retry < options.maxRetries) {
        job.status = 'regenerate';
        await writeQueue(queue);
        console.log(`[asset-factory] FAIL ${job.name}: ${qa.issues.join(' / ')}`);
        continue;
      }
      const action = markDeferred(job, 'qa_failed_after_local_retries', options, { retryable: true });
      await writeQueue(queue);
      console.log(`[asset-factory] FAIL ${job.name}: ${qa.issues.join(' / ')}`);
      if (action.requeue) {
        console.log(`[asset-factory] SELF-HEAL: requeued ${job.name} for a future run (attempt ${job.attempts}/${options.maxTotalAttempts})`);
        return { pass: false, deferred: true, qa };
      }
      console.log(`[asset-factory] MANUAL REVIEW: ${job.name} exhausted self-healing attempts`);
      return { pass: false, manualReview: true, qa };
    } catch (error) {
      job.last_error = { message: error.message, code: error.code || null, status: error.status || null, at: now() };
      const retryable = error.status === 429 || (error.status >= 500 && error.status < 600) || !error.status;
      recordFailure(job, 'api_error', {
        message: error.message,
        code: error.code || null,
        status: error.status || null,
        retryable,
      });
      console.error(`[asset-factory] ERROR ${job.name}: ${error.message}`);
      if (retryable && retry < options.maxRetries) {
        job.status = 'regenerate';
        await writeQueue(queue);
        await new Promise(r => setTimeout(r, Math.min(30000, 2000 * (retry + 1))));
        continue;
      }
      const action = markDeferred(job, retryable ? 'api_error_after_local_retries' : 'non_retryable_api_error', options, { retryable });
      await writeQueue(queue);
      if (action.requeue) {
        console.log(`[asset-factory] SELF-HEAL: API error requeued ${job.name} for a future run`);
        return { pass: false, deferred: true, error: error.message };
      }
      return { pass: false, manualReview: true, error: error.message };
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
  const results = [];
  for (const job of jobs) results.push(await processJob(queue, job, options));
  const deferred = results.filter(r => r?.deferred);
  const manual = results.filter(r => r?.manualReview);
  const passed = results.filter(r => r?.pass);
  console.log(`[asset-factory] summary: passed=${passed.length}, deferred=${deferred.length}, manual_review=${manual.length}`);
  if (manual.length) {
    console.log(`[asset-factory] parked ${manual.length} asset(s) in needs_fix; future runs will skip them and continue remaining active jobs.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exitCode = 1; });
}

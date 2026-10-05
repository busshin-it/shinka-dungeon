import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const QUEUE_PATH = path.join(ROOT, 'asset-factory', 'queue.json');
const CONTEXT_PATH = path.join(ROOT, 'PROJECT_CONTEXT.md');

const START = '<!-- ASSET_FACTORY_PROGRESS_START -->';
const END = '<!-- ASSET_FACTORY_PROGRESS_END -->';
const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
let context = fs.readFileSync(CONTEXT_PATH, 'utf8');

const statusOrder = [
  'github_synced','adopted','awaiting_human','queued','waiting','regenerate',
  'generating','qa','needs_fix','superseded'
];
const counts = {};
for (const job of queue.jobs || []) counts[job.status] = (counts[job.status] || 0) + 1;

const currentJobs = (queue.jobs || []).filter(j => j.status !== 'superseded');
const usableStatuses = new Set(['github_synced','adopted','complete']);
const usableCount = currentJobs.filter(j => usableStatuses.has(j.status)).length;
const progressPct = currentJobs.length ? Math.round((usableCount / currentJobs.length) * 100) : 0;

const activeStatuses = new Set(['queued','waiting','regenerate','generating','qa','needs_fix','awaiting_human']);
const typeOrder = ['part','enemy','class','card','background','effect'];
const byType = {};
for (const job of queue.jobs || []) {
  if (!activeStatuses.has(job.status)) continue;
  byType[job.type] = byType[job.type] || {};
  byType[job.type][job.status] = (byType[job.type][job.status] || 0) + 1;
}

const needsFix = (queue.jobs || []).filter(j => j.status === 'needs_fix').map(j => j.name);
const awaitingHuman = (queue.jobs || []).filter(j => j.status === 'awaiting_human').map(j => j.name);

const gateAssetId = 'shinka_part_base_mage_m02_head_face_puppet_v2';
const gateJob = (queue.jobs || []).find(j => j.asset_id === gateAssetId);
const gateActive = queue.puppet_v2?.status === 'm02_gate';
const next = gateActive
  ? (gateJob && ['queued','waiting','regenerate','generating','qa'].includes(gateJob.status) ? [gateJob.name] : [])
  : (queue.jobs || [])
      .filter(j => ['queued','waiting','regenerate'].includes(j.status))
      .slice(0, 8)
      .map(j => j.name);

let humanAction = 'なし。自動運転に任せる。';
if (gateJob?.status === 'awaiting_human') {
  humanAction = 'M02の候補画像を確認し、「採用」または「修正」を判断する。';
} else if (gateJob?.status === 'needs_fix' && gateActive) {
  humanAction = 'M02が総試行上限または例外で保留。失敗理由を確認して方針判断する。';
} else if (awaitingHuman.length) {
  humanAction = 'Human Gate待ち素材を確認する。';
}

const now = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}).format(new Date());

const auto = queue.automation || {};
const lines = [
  START,
  '',
  '# 20. Asset Factory｜自動進捗スナップショット',
  '',
  'この節は Asset Factory Auto の各Run終了時に queue.json から自動更新する。',
  '手で進捗数を書き換えず、リアルタイム状態は queue.json を正本とする。',
  '',
  '最終自動更新: ' + now + ' JST',
  '',
  '## ひと目でわかる現在地',
  '',
  '- 現行JOB総数（superseded除外）: ' + currentJobs.length,
  '- 利用可能 / 完了相当: ' + usableCount + '（' + progressPct + '%）',
  '- 自動運転: ' + (queue.auto_paused === true ? '停止中' : '稼働'),
  '- puppet-v2 gate: ' + (queue.puppet_v2?.current_gate || queue.puppet_v2?.status || 'なし'),
  '- 今あなたがやること: ' + humanAction,
  '',
  '## 自動運転設定',
  '',
  '- モード: ' + (auto.mode || 'default'),
  '- 1Run最大JOB数: ' + (auto.max_jobs_per_run ?? '未設定'),
  '- 1JOB内QA再試行: ' + (auto.max_retries_per_job ?? '未設定'),
  '- 総試行上限: ' + (auto.max_total_attempts ?? '未設定'),
  '- Gate考慮: ' + (auto.puppet_v2_gate_aware ? 'あり' : 'なし'),
  '',
  '## 状態',
  ''
];

for (const status of statusOrder) {
  if (counts[status]) lines.push('- ' + status + ': ' + counts[status]);
}

lines.push('', '## 未完了の内訳', '');
for (const type of typeOrder) {
  if (!byType[type]) continue;
  const parts = Object.entries(byType[type]).map(([status,count]) => status + ' ' + count);
  lines.push('- ' + type + ': ' + parts.join(' / '));
}

lines.push('', '## awaiting_human（人間確認待ち）', '');
if (awaitingHuman.length) {
  for (const name of awaitingHuman) lines.push('- ' + name);
} else {
  lines.push('- なし');
}

lines.push('', '## needs_fix（保留棚）', '');
if (needsFix.length) {
  for (const name of needsFix) lines.push('- ' + name);
} else {
  lines.push('- なし');
}

lines.push('', '## 次の自動処理候補', '');
if (next.length) {
  for (const name of next) lines.push('- ' + name);
} else if (gateJob?.status === 'awaiting_human') {
  lines.push('- Human Gate待ちのため自動生成は停止');
} else if (gateActive) {
  lines.push('- M02 gate中。M02が自動対象になるまで待機');
} else {
  lines.push('- なし');
}
lines.push('', END);

const block = lines.join('\n');
const startAt = context.indexOf(START);
const endAt = context.indexOf(END);

if (startAt !== -1 && endAt !== -1 && endAt > startAt) {
  context = context.slice(0, startAt) + block + context.slice(endAt + END.length);
} else {
  context = context.trimEnd() + '\n\n---\n\n' + block + '\n';
}

fs.writeFileSync(CONTEXT_PATH, context.endsWith('\n') ? context : context + '\n', 'utf8');
console.log('[asset-factory] refreshed PROJECT_CONTEXT.md progress snapshot');

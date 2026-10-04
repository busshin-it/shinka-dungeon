import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const QUEUE_PATH = path.join(ROOT, 'asset-factory', 'queue.json');
const CONTEXT_PATH = path.join(ROOT, 'PROJECT_CONTEXT.md');

const START = '<!-- ASSET_FACTORY_PROGRESS_START -->';
const END = '<!-- ASSET_FACTORY_PROGRESS_END -->';
const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
let context = fs.readFileSync(CONTEXT_PATH, 'utf8');

const statusOrder = ['github_synced','adopted','queued','waiting','regenerate','generating','qa','needs_fix','superseded'];
const counts = {};
for (const job of queue.jobs || []) counts[job.status] = (counts[job.status] || 0) + 1;

const activeStatuses = new Set(['queued','waiting','regenerate','generating','qa','needs_fix']);
const typeOrder = ['part','enemy','class','card','background','effect'];
const byType = {};
for (const job of queue.jobs || []) {
  if (!activeStatuses.has(job.status)) continue;
  byType[job.type] = byType[job.type] || {};
  byType[job.type][job.status] = (byType[job.type][job.status] || 0) + 1;
}

const needsFix = (queue.jobs || []).filter(j => j.status === 'needs_fix').map(j => j.name);
const next = (queue.jobs || [])
  .filter(j => ['queued','waiting','regenerate'].includes(j.status))
  .slice(0, 8)
  .map(j => j.name);

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

lines.push('', '## needs_fix（保留棚）', '');
if (needsFix.length) {
  for (const name of needsFix) lines.push('- ' + name);
} else {
  lines.push('- なし');
}

lines.push('', '## 次の自動処理候補', '');
if (next.length) {
  for (const name of next) lines.push('- ' + name);
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

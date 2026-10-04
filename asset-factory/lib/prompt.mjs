const TYPE_RULES = {
  card: [
    'Create exactly ONE card illustration asset, not a card mockup.',
    'Portrait composition. No card frame, no title, no letters, no numbers, no UI.',
    'The magical effect or phenomenon must be the unmistakable visual subject.',
  ],
  enemy: [
    'Create exactly ONE enemy character only.',
    'Show the full body including feet and the full weapon, with generous transparent padding.',
    'No scenery, floor, platform, UI, letters, or extra characters.',
  ],
  class: [
    'Create exactly ONE full-body evolved player character only.',
    'Preserve the same young female mage identity: silver to pale-lavender long hair, blue eyes, same age and body type.',
    'No scenery, floor, UI, letters, or extra characters. Keep staff, hair, and clothing fully in frame.',
  ],
  character: [
    'Create exactly ONE full-body player character only.',
    'No scenery, floor, UI, letters, or extra characters.',
  ],
  part: [
    'Create exactly ONE puppet part only, never a sheet of parts.',
    'Keep joint overlap margin for rigging. No other body parts, scenery, UI, or letters.',
  ],
  background: [
    'Create a background environment only. Do not include characters, enemies, text, or UI.',
  ],
};

export function buildPrompt(queue, job, remediation = '') {
  const transparency = job.transparent
    ? 'OUTPUT REQUIREMENT: fully transparent alpha background (RGBA PNG). Do not draw a checkerboard, white, black, gradient, or scenic backdrop.'
    : 'OUTPUT REQUIREMENT: opaque illustrated background is allowed and should support the subject.';
  const negative = (job.negative || []).length ? `Do NOT include: ${(job.negative || []).join(', ')}.` : '';
  const retry = remediation ? `Previous QA correction to apply strictly: ${remediation}` : '';
  return [
    `Project: ${queue.project}. Official art direction: ${queue.art_direction}`,
    ...(TYPE_RULES[job.type] || []),
    `Asset: ${job.name}.`,
    job.prompt,
    transparency,
    negative,
    'Critical production rule: 1 asset = 1 image. Never make a contact sheet, comparison sheet, asset sheet, split panel, or multiple design variants.',
    '2D dark fantasy, hand-painted/painterly, weighty gothic fantasy, dark ancient castle world, deep blue/purple/black/gold palette, beautiful strong magical lighting, high detail, clear game readability, no chibi or cute deformation.',
    retry,
  ].filter(Boolean).join('\n');
}

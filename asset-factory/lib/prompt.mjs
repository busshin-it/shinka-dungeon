const CORE_STYLE = [
  'Official style: Gothic silhouette puppet dark fantasy.',
  '2D dark fantasy with gothic castles, underground ruins, magical architecture, and theatrical puppet-stage atmosphere.',
  'Hand-painted and painterly, slightly eerie but beautiful.',
  'Strong readable silhouettes inspired by shadow theatre and articulated stage puppets.',
  'Avoid photorealism, realistic human rendering, glossy 3D CGI, toy-render aesthetics, bright pop colors, anime moe, chibi, or cute deformation.',
  'Primary palette: black, deep navy, purple, blue, and antique gold. Attribute-specific magical glow colors are allowed.',
  'Prioritize visual consistency with the existing game world over standalone prettiness.',
  'Design for readability on a small landscape game screen.',
];

const PUPPET_RULES = [
  'Design from the beginning as a 2D articulated puppet that can be animated with a small number of bones/parts.',
  'Keep the silhouette slender, theatrical, and easy to read.',
  'Keep head, torso, arms, and legs visually separable.',
  'Do not overlap limbs excessively.',
  'Keep shoulders, elbows, wrists, hips, and knees visually understandable.',
  'Separate weapons from the body silhouette whenever possible.',
  'Long hair, cloth, capes, and dangling ornaments should look separable into independent puppet parts later.',
  'Do not hide every joint under bulky clothing or effects.',
];

const TYPE_RULES = {
  card: [
    'Create exactly ONE card illustration asset, not a card mockup.',
    'Portrait composition for a vertical card crop.',
    'No card frame, no title, no letters, no numbers, no cost, no logo, and no UI.',
    'Create only the pure illustration that appears inside the card.',
    'Background is allowed and should feel like the same gothic puppet-theatre world.',
    'The spell or phenomenon must be the unmistakable visual subject and remain readable at small size.',
  ],
  enemy: [
    'Create exactly ONE enemy character only.',
    'Show the complete full body including feet and the complete weapon, with generous clear margin around the silhouette.',
    'No scenery, floor, platform, shadow stage, UI, text, or extra characters.',
    ...PUPPET_RULES,
    'The enemy type must be recognizable from silhouette alone.',
  ],
  class: [
    'Create exactly ONE full-body evolved player class character only.',
    'Preserve the same player identity: silver to pale-lavender hair, blue eyes, same face, age impression, body type, and quiet personality.',
    'The base look is a gothic mage in black/deep navy with antique gold details and a calm, slightly androgynous impression.',
    'Express class evolution mainly through costume, ornaments, staff/weapon, magical effects, and controlled color accents.',
    'No scenery, floor, UI, text, or extra characters.',
    ...PUPPET_RULES,
    'Keep staff, hair, clothing, hands, and feet fully in frame.',
  ],
  character: [
    'Create exactly ONE full-body player character only.',
    'Base identity: silver to pale-lavender hair, blue eyes, black/deep-navy gothic mage clothing, antique gold details, calm and slightly androgynous impression.',
    'No scenery, floor, UI, text, or extra characters.',
    ...PUPPET_RULES,
  ],
  part: [
    'Create exactly ONE puppet part only, never a sheet of parts.',
    'Do not include any other body parts, scenery, UI, text, or labels.',
    'Keep enough overlap margin at the joint connection for rigging.',
    'The isolated part must match the source character when reassembled.',
  ],
  background: [
    'Create a background environment only. Do not include characters, enemies, text, logos, or UI.',
    'Use gothic architecture, ancient castles, underground labyrinths, ruins, and magical spaces.',
    'Treat the environment like theatrical puppet-stage scenery with strong depth.',
    'Prefer compositions that can later be separated into foreground, midground, and background layers for parallax.',
  ],
};

export function buildPrompt(queue, job, remediation = '') {
  const transparency = job.transparent
    ? (job.chroma_key
        ? 'OUTPUT PIPELINE REQUIREMENT: draw the subject on a single flat pure chroma green background (#00FF00), edge-to-edge, with NO gradient, NO vignette, NO floor, NO cast shadow, NO aura, NO glow behind the subject, and NO other background objects. Do not use green anywhere on the subject. The production pipeline will remove this green background and convert it to alpha transparency.'
        : 'OUTPUT REQUIREMENT: fully transparent alpha background (RGBA PNG). Do not draw a checkerboard, white, black, gradient, floor, stage, or scenic backdrop.')
    : 'OUTPUT REQUIREMENT: opaque illustrated background is allowed when appropriate for this asset type.';
  const negativeItems = (job.negative || []).filter(x => !(job.chroma_key && String(x).trim() === '背景'));
  if (job.chroma_key) negativeItems.push('checkerboard transparency pattern', 'gray checkerboard', 'fake transparency grid');
  const negative = negativeItems.length
    ? `Do NOT include: ${negativeItems.join(', ')}.`
    : '';
  const retry = remediation
    ? `Previous QA correction to apply strictly: ${remediation}`
    : '';
  return [
    `Project: ${queue.project}. Style version: ${job.style_version || queue.style_version || 'gothic-silhouette-puppet-v0.1'}.`,
    `Official art direction: ${queue.art_direction}`,
    ...CORE_STYLE,
    ...(TYPE_RULES[job.type] || []),
    `Asset: ${job.name}.`,
    job.prompt,
    transparency,
    negative,
    'Critical production rule: 1 asset = 1 image. Never make a contact sheet, comparison sheet, character lineup, asset sheet, split panel, or multiple design variants.',
    'Do not add explanatory text, labels, captions, logos, or decorative typography.',
    retry,
  ].filter(Boolean).join('\n');
}

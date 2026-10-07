# GAME LAB Research Log

## 2026-10-06 Noa postscript local candidate / design-MD audit

- Status: local unpublished candidate only. GitHub main checked at 22:22 UTC remains `477a03a`, public game 4.11 / 38 cards. Candidate game is 4.12 / 42 cards.
- Scope: four cards for the existing Astral mage mode, using current effect handlers and five existing Noa assets. No new NPC, fight, route, class rule, image generation, or Asset Factory queue changes.
- Changes: marginLight / quietScript / mirrorNote / returnPage; all unlock in general reward slots after battle 2. Existing 38 definitions, starters, save version/shape, legacy engines, and layout CSS remain unchanged.
- Design basis: GAME_DESIGN §§2, 6, 7, 11–14. Per-card design tags, strength/weakness conditions, existing-card relationships, and unassigned/deferred rarity are documented in the production spec. This does not complete or replace the warrior W009–W036 roadmap in §16.
- Checks: 76 Node game/production tests, 4 Python release/package tests, 14 Asset Factory tests; new production spec 10 scenarios; independent review found no code blocker. Fixed v4.11 first-battle offers/RNG match for 192 seed/origin pairs; both fixed reward slots match in 1,536 after-battle-2 pairs.
- Unverified: new text/layout in a real browser, short-landscape interaction and old/new shared-art distinguishability, real-device touch, real user saves, long-term balance and player enjoyment. Source-image inspection is not browser QA.
- Next: review the [MD alignment audit](design/production/noa-postscript-md-audit.md), then run supported browser checks using `ui-qa/postscript.html` and the [candidate report](design/production/noa-postscript-report.md). Keep local until the remaining checks and publication decision are coordinated. Do not start another batch automatically.
- Historical scope: the 2026-10-03 three-battle/three-reward notes below remain history; current Astral distribution uses six battles/four reward options as documented in ASTRAL_DEVELOPMENT.md.

## 2026-10-03 combat consistency pass

- Fixed Frost Ring so it deals 4 damage and reduces the next enemy attack by 4 without freezing.
- Fixed the blue spring event so Focus carries into the next battle once.
- Connected the Guardian charge intent to real behavior: the next attack gains +3 damage, and the preview uses the same damage formula as resolution.
- Removed an unintended interaction where Wraith Knight curse could increase later enemy damage.
- Added run-local card usage counters for ice, lightning, dark, guard, and focus families. These are groundwork for class evolution; class names and thresholds remain undecided.
- Balance smoke test: 20,000 simplified first-battle simulations produced 100% wins, about 3.46 turns per win, and about 59.6 HP remaining on average. Keep battle 1 tutorial-easy for now and add decisions later in the run.

## Evolution design guardrails

- Card evolution is immediate/local growth that the player can test in the next fight.
- Class evolution should reflect run-wide card usage tendencies.
- Do not lock class names, thresholds, or hybrid-class conditions until they are deliberately chosen.
- Keep one asset per image, landscape-first layout, and improve the small three-battle run before expanding scope.

## Open questions

- Define the player-facing meaning of Wraith Knight curse before implementing a debuff.
- Decide class names, evolution thresholds, and whether hybrid classes should be possible.

# GAME LAB Research Log

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


## 2026-10-03 run integrity pass

- Fixed next-battle deck rebuilding so cards left in hand at victory are preserved together with draw and discard piles. The invariant is now: every owned card survives a battle transition unless a future mechanic explicitly removes it.
- Routed hand artwork through `CARD_ART` instead of hardcoding the ice image path. New one-image-per-card assets can now be mapped without changing the renderer.
- Restored evolved class names in the battle HUD and made victory copy use the current enemy name.
- Added a tie-state guardrail: the victory overlay only appears when enemy HP is 0 and player HP is still above 0.
- Smoke checks: patched `game.js` parses successfully; source checks confirm deck preservation, art mapping, evolved-class HUD, and alive-only victory conditions.
- Balance note: no card numbers were changed in this pass. This intentionally isolates progression-integrity fixes before re-evaluating battle 2 and boss difficulty.

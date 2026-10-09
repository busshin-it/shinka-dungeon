import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TALISMANS } from "../v4-1/six-paths-pilot.mjs";
import { starterChoices, forgeDeck, FORGE_PICK_COUNT } from "../v4-1/six-paths-forge.mjs";

const legacyUi = readFileSync(new URL("../v4-1/planning-game.js", import.meta.url), "utf8");
const forgeUi = readFileSync(new URL("../v4-1/six-paths-pilot.html", import.meta.url), "utf8");

test("legacy intro presents all eight forge talismans and a direct launch path", () => {
  const segment = legacyUi.match(/const FORGE_ENTRY_TALISMANS = Object.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(segment, "entry talisman catalog must exist");
  const ids = [...segment[1].matchAll(/\['([a-z]+)',/g)].map(match => match[1]);
  assert.deepEqual(ids.sort(), Object.keys(TALISMANS).sort());
  assert.match(legacyUi, /data-forge-talisman=/);
  assert.match(legacyUi, /data-action="rerollForge"/);
  assert.match(legacyUi, /window\.location\.assign\(destination\)/);
  assert.match(legacyUi, /&fresh=1&talisman=/);
  assert.match(legacyUi, /legacyIntro = true/);
});

test("forge can open directly at round one without reusing old run save", () => {
  assert.match(forgeUi, /forgeEntryTalisman = forgeFresh && Object\.hasOwn\(TALISMANS,forgeQuery\.get\("talisman"\)\)/);
  assert.match(forgeUi, /let forgeTalisman = forgeEntryTalisman/);
  assert.match(forgeUi, /if \(stored && !forgeFresh\)/);
  assert.match(forgeUi, /forgePicks\.length===FORGE_PICK_COUNT/);
  assert.equal(FORGE_PICK_COUNT, 3);
  const rounds = [0, 1, 2].map(round => starterChoices(round, () => 0.47));
  assert.deepEqual(rounds.map(cards => cards.length), [3, 3, 3]);
  const deck = forgeDeck(rounds.map(cards => cards[0]));
  assert.equal(deck.length, 10);
  assert.deepEqual(deck.slice(3, 5), ["bolt", "strike"]);
});

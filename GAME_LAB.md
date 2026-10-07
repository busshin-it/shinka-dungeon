# GAME LAB Research Log

## 2026-10-07｜V4.14 成長ループ試遊・ローカル候補

- 実プレイの「行動が固定」への対応。基本攻撃/防御の共通10枚、弱い第1〜3戦、初報酬4役、第2戦後の休息/進化/除去を一つの試遊として実装。
- 原仕様の魔力2/+1持越しを保持し、基本札を0コスト低出力にする。進化は3→5、単なる除去専用札にしない。アート生成なし。
- 新規保存v4に試遊ルールを固定。旧v3/v1/v2の途中保存は旧ルールを維持する。
- 手動横画面/実機QAはユーザー担当で開発の停止条件にしない。楽しさや公開成功は未確認。
- 133 Node・4 Python・14 Factory、制作9/10/10、release/差分チェック合格。独立レビューで保存/UIコードのblockerなし。
- 72対で初報酬2.000対2.764ターン、8.000対11.583操作。全体ターンは減ったが操作数は約9.9%増え、基本札連打の負担が残る。自然な初回支度は全件満HPで、休息の価値は合成低HPだけで確認。楽しさの改善とは断定しない。
- 詳細・同一seed比較・独立レビュー・未確認範囲は[試遊報告](design/production/deck-growth-report.md)。公開は統合担当が扱う。

## 2026-10-07｜V4.13 星儀の試練・公開

- [PR #11](https://github.com/busshin-it/shinka-dungeon/pull/11)を正確なheadのCI成功後にmerge。main `1d6515f`、build `4.13-ebd5c053d7f6`。新敵1体＋4枚で先読み46枚。
- 最終再検証: 99 Node、4 Python、14 Factory、制作仕様9/10/10ケース、release verify、空白差分チェック合格。レビュー済み候補・PR・mergeのtree一致。
- 標準Pages成功後、44配布入力＋release.json＋SWの46ファイルをHTTPS再取得し、候補とbyte/SHA-256一致。
- 検証付きPagesは初回OIDC timeout、再実行で同名artifact重複。成功した別経路の実配信を確認し、設定変更せずdocs-only commitで新runへ。後続の確認はPRコメントへ記録。
- 手動横画面/実機QAはユーザー担当。広い見た目確認、実ユーザー保存での試遊、長期バランス・楽しさは未確認。新敵は新しい旅だけに出現し、旧保存の敵は維持。
- 詳細・失敗記録・次の判断: [公開記録](design/production/star-dial-release.md)。以下の候補ログは制作時点の履歴。

## 2026-10-07 Noa postscript 4.12 published

- Published: [PR #10](https://github.com/busshin-it/shinka-dungeon/pull/10), main `6acba70dbd7197994afee6d464655d5041c6e8ce`, build `4.12-059517d696ed`, planning mode 42 cards. Both Pages deployment paths succeeded for this exact commit.
- Release checks rerun: 76 Node game/production, 4 Python release/package, 14 Factory tests; existing/new production validation 9/10 scenarios. All 44 distributed inputs plus release.json/SW (46 files) matched the reviewed local bytes after deployment.
- Cloud-browser live-URL smoke: isolated synthetic reward screen at 844×390 and 640×240, scrolling to all four new cards; images/text visible; evolution selection did not confirm by itself and Back returned to preparation; Return Page displayed the upgraded attack target and cancelled without being played.
- Limits: this is a bounded smoke, not full visual QA. Physical smartphone touch, all viewport/scenario combinations, repeated-click/interrupted flows, old/new shared-art identification, actual player saves, long-term balance and enjoyment remain unverified.
- Next: user checks the published game on their smartphone and sends screenshots of any layout/text issues. Keep changes bounded to that feedback; no automatic next batch or branching-prototype merge. Existing PWA clients may need all game windows closed and reopened to activate a prepared update; never clear saves to update.
- Detail and evidence: [publication record](design/production/noa-postscript-release.md). The local-only notes below describe the earlier candidate stage.

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

## 2026-10-07｜V4.13 星儀の試練・ローカル候補

- 現行main `53b2e76` のASTRAL/設計/制作MDを確認し、6戦・4択・42枚から作業。初期3戦ログや未公開の分岐進化試作は混ぜない。
- 追加: 書庫の新敵「星儀の調律者」HP74＋4枚、計46枚。三連撃は手数、次の強打は一撃を問う。既存カード42枚の数値、初期10枚、旧24枚版を保持。
- 互換: 新規の書庫候補だけ変更。保存中の旧候補/敵/報酬/RNG/履歴と旧v1/v2移行を維持。保存v3の新フィールドなし。
- 検証: 99 Node、4 Python、14 Asset Factory。三連撃の部分軽減/各打撃反射、一撃11/12/13、予約/記憶/消滅/報酬/進化/除去/全6戦、旧19合成保存。多段軽減予告を1×3まで明記。
- 対照: 192章間保存で旧/新の第4戦勝利168/188、平均被害29.661/24.130。全体完走1/0の単純方策なので難易度・楽しさの証明にはしない。報酬固定2枠は1,536件一致、一般枠の希釈を記録。
- 素材: 既存カード絵4枚、ノア、門番系の敵絵を再利用。生成/API/新規依存なし。実画像は一枚ずつ目視し同一ハッシュ確認。新敵専用絵を制作したとは扱わない。
- 未検証: 手動横画面/実機はユーザー担当。開発の停止条件にせず、9合成場面を用意。実ブラウザ、実機タッチ、楽しさ、公開後確認は未実施。
- 次: 独立レビューを受けた候補を統合担当へ返す。公開は統合担当が扱う。新しい外部サービス/課金導入なし。
- 詳細: [星儀の試練の制作・検証報告](design/production/star-dial-report.md)。

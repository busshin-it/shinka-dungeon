# GAME LAB Research Log

## 2026-10-08｜V4.27候補・切断した護符試作を復旧

- 最新main V4.25（fc157e7、61カード）と全heads/PRを確認。専用GitHub成果は未送信、ローカルfeat/charm-seeds-20261008の未コミットコード・テスト・比較を引き継いだ。
- 護符12案・魔法師6系統を仮設計として記録。実装は連奏/返刃/蓄星の3種だけ、新UIは既存3＋試作3から3候補。旧intro固定3種・既存保存/RNGを維持。新カード・敵・戦闘数・画像・公開設定なし。
- Node256・Python4・Factory14・release verify成功。独立main定義と24旧経路を再照合。2seed×6護符×3構成の108戦比較は合成・有限方策であり面白さや最適性の証明ではない。実ブラウザ/実機は未確認。
- 候補seedの偏り、introの不正flag、旧説明assert、未更新配布メタデータを修正して記録。Draft PRまでで停止、mainマージ・公開は禁止。
- [設計12案/6系統](design/production/charm-seeds-design.md)、[検証と限界](design/production/charm-seeds-report.md)、[比較結果](design/production/charm-seeds-results.json)。

## 2026-10-08｜初期護符の再設計・3種試作（4.27候補、未統合）

- 最新main V4.25・61枚を確認し、切断前の未コミット作業を再利用。別Draft #25/#26/#27/#29は含めない。
- 12護符／魔法師6系統を仮設計、連奏・返刃・蓄星だけ試作。新旅は既存＋試作6種から3候補、旧保存は元の護符・抽選／RNGを維持。
- Node255／Python4／Factory14、release44入力成功。2seed×6護符×3合成デッキ、108戦で戦術差を計測。蓄星の被害増加と月鏡の短期優勢を記録し、面白さ・最適性は断定しない。実ブラウザ／実機は未確認。
- [12案・6系統](design/production/charm-seeds-design.md)、[復旧・テスト・限界・試遊](design/production/charm-seeds-report.md)、[結果](design/production/charm-seeds-results.json)。Draft PRで停止、マージ・公開なし。

## 2026-10-08｜V4.25・PR #28の統合承認

- GitHubを再確認。mainはV4.21、戦士は設計のみ、PR #28は未統合だった。ユーザーは今回も「魔法師のPRを完了」を選択し、既存のマージ許可に基づきこの1セットを統合する。
- 最新main `d8e3d6cde273e22d7510d232fe9d7f1f31c54943` とのローカル統合で競合なし。前回候補以降のmain差分はPROJECT_CONTEXTのFactory自動更新時刻のみ。コード・保存・画像の追加変更なし。
- Node242・Python4・Factory14、release verifyを再確認。新しい旅の初回2報酬は3択、旧旅は4択。公開は既存Pagesワークフローのまま。実際の統合・公開状態は[PR #28](https://github.com/busshin-it/shinka-dungeon/pull/28)とActionsを正とする。
- 面白さの課題・試遊ポイントは[報告](design/production/early-choice-report.md)。戦士実装・次のカードセットには進まない。以下の候補ログは制作時点の履歴。

## 2026-10-08｜V4.25候補・序盤3戦の3択報酬

- main V4.21を確認。戦士は設計のみのため、ユーザー選択で既存魔法師の序盤3戦を対象に変更。
- 新しい旅growth-v3／保存v6だけ、第1・第2戦後に攻撃・防御・組合せの各候補を1枚ずつ提示し、取得かスキップ。新カード・敵・画像なし。旧保存の4択／RNGと第3戦後の一般抽選を維持。
- 全Node242・Python4・Factory14成功、release verify成功。2シード16分岐で戦術・被害・時間の差を確認。ただし霜の護符では氷の矢が優勢で、面白さ・スキップの価値・バランスは未確定。実ブラウザ／実機は未確認。
- [調査・設計・保存互換・失敗と限界・試遊ポイント](design/production/early-choice-report.md)、[再現可能な小量比較](design/production/early-choice-results.json)。main未反映・公開なし。この1セットで停止。

## 2026-10-07｜V4.19 綴じ直し・公開

- [PR #21](https://github.com/busshin-it/shinka-dungeon/pull/21)を正確なheadのCI成功後にmerge。main `effb5fade`、build `4.19-3d070049d693`。検証付きPages成功、HTTPS配布46ファイル一致。
- コスト1で最新の捨て札攻撃を回収し、直後に1枚（進化2枚）引いて消滅する1枚。図鑑55種。旧ruleset・初回・開いていた報酬/RNGと保存version5を維持。
- Node206・Python4・Factory14、独立12,048旧保存次操作/2,112報酬RNGと取得/進化/除去を検証。既存画像・処理を再利用し、新依存/設定変更なし。
- 192場面の限定対照は72回使用/120回見送り。全ラン方策は新札を取得せず、強さ・楽しさを断定しない。実ブラウザ/実機/実ユーザー保存は未確認。
- [公開記録](design/production/restitch-release.md)、[対照と限界](design/production/restitch-report.md)、[保存隔離QA](ui-qa/restitch.html)。以下の候補ログは制作時点の履歴。

## 2026-10-07｜V4.18 星秤の衛兵・公開

- [PR #20](https://github.com/busshin-it/shinka-dungeon/pull/20)を正確なheadのCI成功後にmerge。main `f7be2a36`、build `4.18-4e4d2b8d0dd7`。両Pages成功、HTTPS配布46ファイル一致。
- 設計PR #15の先行案1体だけを新規growth-v2の書庫へ。休み→魔力2以上で12→6→合計12ダメージで18→8。旧保存の相手/HP/履歴、54枚、6戦、schema、報酬RNGを維持。
- 191 Node・4 Python・14 Factoryと独立レビュー合格。旧216ラン/22,538操作がbyte一致。新敵1,728被害境界、66固定保存、2,880報酬/RNGも検証。
- 同一章間保存24組の平均第4戦被害14.708→11.458、ターン6.083→6.542、6戦完走18→17。自動方策だけで楽しさや最適バランスを判断しない。
- 4.16の基本1コスト/+3、4.17の霜2枚は別変更として維持。画像生成・新依存・設定変更なし。手動描画/実機/実ユーザー保存は未確認。
- [公開記録](design/production/star-scale-release.md)、[対照方法と限界](design/production/star-scale-report.md)、[保存隔離QA](ui-qa/star-scale.html)。

## 2026-10-07｜V4.15 効果先行4枚・公開

- [PR #13](https://github.com/busshin-it/shinka-dungeon/pull/13)をCI成功後にmerge。main `20af682`、build `4.15-4fde8aa6412c`。両Pages成功、配信46ファイル一致。
- 4枚は既存効果と画像を再利用。初回成長報酬・旧v3ルールを保持し、v4の将来の第2戦後以降報酬だけに追加。既存v4の続きでも取得できる。
- コード/検査/文書準備は約15分。公開時の2送信失敗は重複確認して復旧。画像/API/新規インストール/設定変更なし。148 Node・4 Python・14 Factory合格と独立レビュー。
- 手動見た目/実機・実ユーザー保存・長期バランス・楽しさは未確認。[公開記録](design/production/effect-first-release.md)に工程時間と限界を記載。

## 2026-10-07｜V4.15 効果先行4枚・ローカル候補

- 新しい指示「イラストを後回しにして効果を増やす」に合わせ、氷写しの頁 / 蓄光の残響 / 灰読み / 渡り鏡を既存効果だけで追加。図鑑52種。
- growth-v1の第2戦後から個別抽選。旧v3の抽選/RNG、初回成長報酬、初期10枚、旧48定義、敵/ルート/保存schemaを保持。開いていた報酬は再抽選せず、将来の成長報酬だけ広がる。
- 148 Node・4 Python・14 Factory、制作12ケース、release/差分チェック合格。独立レビューも全Node/Pythonと旧commit比較でblockerなし。
- 画像生成/API/新依存/設定変更なし。既存画像と検証・依存を再利用。実装工程と外部待ちを分けて計測。
- 手動横画面/実機はユーザー担当。実ユーザー保存・長期バランス・楽しさは未確認。公開確認は別記録にする。
- 詳細: [制作・検証報告](design/production/effect-first-report.md)。

## 2026-10-07｜V4.14 成長ループ試遊・公開

- [PR #12](https://github.com/busshin-it/shinka-dungeon/pull/12)を正確なheadのCI成功後にready・squash merge。main `47ff4be`、build `4.14-15de5d91590f`。
- 新しい旅は共通の基本攻撃/防御10枚、弱い第1〜3戦、役割別の初報酬、第2戦後の休息/進化/除去。途中の旧保存は旧ルールを維持する。
- 公開担当が133 Node・4 Python・14 Factory、制作9/10/10、release verifyを再実行。候補・PR・mergeのtree一致。両Pages成功後、HTTPS配信46ファイルを候補とbyte/SHA-256一致確認。
- 初報酬は早まったが全体操作数は約9.9%増。自然な初回支度は全件満HPで休息の価値は未確認。固定行動・楽しさの改善とは断定しない。
- 手動横画面/実機はユーザー担当。実ブラウザの操作・実ユーザー保存・長期バランスは未検証。次は試遊の反応をもとに判断し、この公開だけで次のカード/クラス制作を自動開始しない。
- 詳細: [公開記録](design/production/deck-growth-release.md)。以下のローカル候補ログは制作時点の履歴。

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

## 2026-10-07｜V4.19 綴じ直し・検証済み候補

- PR #14 head 2f741097…の1枚だけ。通常1/進化2ドロー、コスト1、最新の捨て札攻撃回収、消滅。実際に「再攻撃へ使うか、灰の守りへ残すか」が成立。
- 図鑑55種、growth-v2第2戦後以降。保存version5/効果ハンドラ/旧ruleset/初回/開いていた報酬を維持。新画像・新依存・イベントは追加しない。
- Node206/Python4/Factory14、独立12,048旧保存次操作、2,112保護報酬とRNG、95取得後経路が合格。
- 36組全ランの新札取得は0件なので完走差をカード評価に使わない。192場面×補助3種の限定対照では綴じ直しを72使用/120見送り。人間の楽しさ・実機は未確認。
- [詳細と全制約](design/production/restitch-report.md)。公開前checkpointを保全し、draft PRのCI後に統合・実配信照合する。

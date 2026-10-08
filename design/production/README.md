# 次のカードセットを速く、安全に作る

対象は現行の `v4-1/`。NPC 1人＋4〜6枚を1セットとして設計し、既存の効果と画像を先に探す。
この手順はゲームエンジンを置き換えず、画像API、Asset Factory、外部サービスを自動起動しない。
新しい依存パッケージや課金サービスは不要。Node.js 22以上で動く。

## すぐ使う

```sh
# 現行カードの効果と進化差分を抽出する。コードは変更しない。
node tools/astral-card-production.mjs catalog > /tmp/astral-card-catalog.json

# 実装済みNoa4枚が、制作仕様・実コード・画像・説明・保存と一致するか確認
node tools/astral-card-production.mjs validate design/production/noa-example.json release

# 新セットでは見本をコピーしてID・テーマ・仕様・ケースを編集
cp design/production/noa-example.json design/production/my-set.json
node tools/astral-card-production.mjs validate design/production/my-set.json draft

# 仮画像の項目だけ、1素材1ジョブの共通プロンプトにする
node tools/astral-card-production.mjs prompts design/production/my-set.json > /tmp/my-set-prompts.json

# 仮画像でロジック実装後。画像の専用制作は独立して進められる
node tools/astral-card-production.mjs validate design/production/my-set.json integrated

# 実画像への差替え・目視後。placeholder、未確認画像、古いハッシュを拒否
node tools/astral-card-production.mjs validate design/production/my-set.json release
```

見本をコピーした直後はNoaのままなので、新セットができたことにはならない。
`base` は `CARDS[id]` と完全一致、`upgrade` は基本定義から変わる数値を明記する。
`catalog` は値を転記する補助であり、新カードの設計値を自動で承認するものではない。

## 最短工程と分担

1. **セット設計担当**: NPC、世界観、選択の面白さ、各4〜6枚の強い/弱い場面、報酬解禁、既存カードとの差を確定。
2. **再利用・画像担当**: `reusable-art.json` と実画像を見る。用途・画風・色・縮小時の識別・権利情報が合う絵を優先。不足分だけ共通スタイル＋個別主題で生成する。
3. **ゲーム担当**: 仮画像に既存のローカル画像を割り当て、効果・説明・合成保存テストを先に実装。新しい画像を待たない。
4. **独立テスト担当**: 条件成立/不成立、境界、進化、支払失敗、保存復帰、報酬と使用順を検証。
5. **統合担当1人**: 採用画像、HTMLの参照、配布リスト、最終検証、release/SWをまとめる。完成セット単位で公開し、画像1枚ごとには公開しない。

担当ごとに別worktree/branchを使い、書込み対象を明示する。
画像担当は新しい画像と自分の画像manifestだけ、ゲーム担当は承認されたengine/text/test、
統合担当は共有HTML・UI・配布リスト・release/SWを所有する。
複数人で同じHTMLや保存schema、release/SW、Asset Factory queueを書き換えない。
他セットの公開中はmainへ混ぜず、公開完了後に最新mainを取り込み、最終コードで全検証する。

## 仕様・共通効果の再利用

- `cards[].id`: 安定したcamelCase ID。進化は同じIDの `+`。
- `base`: 既存エンジンの `name/cost/family/art` と効果フィールドをそのまま使う。
- `upgrade`: 進化で変わるフィールドのみ。例: damage 10→13。
- `textIncludes`: 数値を `{damage}` 等で結び、基本/進化の `card().text` に実値が入ることを検証。
- `cases`: 基本/進化の両方を必須。合成state、捨て札、期待preview、使用後state、画面のsummary/rulesを宣言する。
- `assets`: カードごとに専用の `art` キーを持ち、同じ既存画像pathを再利用してよい。カード名と画像ファイル名を無理に一致させない。
- `style`: 世界・色・画材・構図・避ける物を1か所で共有。`subject` は各画像の異なる主題だけ。

damage/block/weaken/draw/focus/reflect/heal/energy、既存の支払魔力条件、詠唱崩し、
次ターン予約、反射消費、捨て札回収等を部品として再利用する。新しい状態を追加せず組合せで済むかを先に判断する。
未登録の効果フィールドは検証で拒否する。必要な新効果は `card → preview → play → text` の順に
型・条件の評価時点・消費順・進化・保存互換を設計し、独立した境界テストを足してからホワイトリストを拡張する。
検証を通すために知らないフィールドを無視したり、保存validatorを緩めたりしない。

### 自動で確かめること

- 基本定義・進化値と実コードの一致、既知フィールドの型、セット内ID重複
- previewの非破壊性/RNG不変、使用後の期待値、デッキ多重集合
- 保存→復帰の無損失、同じ次操作の結果一致、使用後保存の復帰
- 魔力不足で完全無変更、0コストは魔力0で使用可
- 通常説明と選択中のsummary/rulesに期待値があるか
- 画像path、ファイル存在、PNG/WebPシグネチャ、配布/cacheリスト、HTMLの対応、alt方針
- 画像変更をSHA-256で検知し、確認済み画像の取り違えを拒否
- 再利用台帳の候補27点＋runtime10点のbyte数/SHA-256、現行カード対応、埋込み画像の同一性

このツールは**静的・合成検証**。PNG/WebPヘッダー検査は完全デコードの代わりではない。
altの静的確認も、スクリーンリーダー・ブラウザDOMの全検証ではない。
JSONの `visualQa: passed` は目視した担当者の記録であり、ツールが絵を見て合格にするわけではない。

宣言型 `cases` のfixtureは現在、第1戦の蒼鎧の門番、HP満タン、10枚デッキに限定する。
turnで攻撃/休みを変え、block/reflect/energy等の境界と捨て札を指定できる。
詠唱崩し成立、回復量、護符/ルート、別の敵、ドロー後の複数操作、次ターン期限は
専用の `tests/astral-*.test.mjs` に実遷移を使うケースを足す。`interrupted:true` だけを
無関係な敵へ挿入すると本物の保存validatorが拒否するため、そのような合成状態で通そうとしない。
必要になった場合は整合するfixtureを別途拡張し、対応していない効果を検証済みと数えない。

### セットごとに追加する必須ケース

- 条件つき効果: 成立/不成立、閾値−1/閾値/閾値＋1、基本/進化、先に/後に使う
- 資源消費: 0/1/上限/超過、全消費か一部消費か、連続使用、支払失敗
- 次ターン効果: 予約重複、付与・期限、戦闘終了の消去、予約中の保存復帰
- 山札/捨て札: 空、複数、同名、進化札、消滅札、RNGと多重集合、直後ドロー
- 報酬: 解禁前/後、固定枠、4候補重複なし、開いていた報酬の保存復帰で再抽選なし
- 成長: 取得→初手→進化→除去→保存復帰、旧v1/v2/v3と旧24枚モード、初期デッキ不変
- UI: 報酬/進化/図鑑/手札で末尾・画像・条件・対象が読める。短い横画面、戻る、連打、リサイズ

上のすべてを見本の9ケースだけで覆ったとは扱わない。Noaの詳細境界は既存の
`tests/astral-noa.test.mjs` と `tests/astral-noa-text.test.mjs` に残す。

## 画像再利用と差替え

`status` は `placeholder` / `reuse` / `final`。仮画像でもローカルの実ファイルを参照する。
`placeholder` には現在表示する `path` と、新規完成画像の `finalPath` を分けて指定する。
例: `path: ./assets/shatter.webp`、`finalPath: ./assets/new-set-crystal.webp`。
生成manifestの出力先は `finalPath` だけ。既存ファイル/表示中画像との一致や出力先重複を拒否するので、
仮画像に使った共用の既存絵を上書きしない。完成後は `path` を採用画像へ、`status` を `final` へ更新する。
`reuse` は `reuseFrom` を記録し、`prompts` の生成対象から外す。完成済み `final` も再生成しない。
既存の埋込み画像を再利用する場合は、元ファイルとの一致を確認してから `v4-1/assets/` へ
必要なものだけコピーし、専用artキーで明示参照する。元の埋込み画像や他カードを書き換えない。

再利用は「repoにあるから権利確認済み」としない。生成記録がある自作素材は出典を記録。
第三者素材はsource URL、ライセンス、適用条件を確認し、`rightsReviewed: true` の根拠を残す。
出所不明は `unknown` として候補にとどめ、releaseでは拒否する。
同じゲーム内の既存使用を確認できるものは `existing-project` として記録するが、新しい権利を主張しない。

最終画像は実際のカードの表示・切抜きで確認してから、`visualQa.note` と `sha256` を更新する。
カード画像は近くの名前/全文と重複するため空alt、NPCには説明altを使う現行方針を守る。
一括変換が必要なら既存の資産最適化手順を使い、変換後にもう一度目視・ハッシュ・全テストを確認する。

## 画像生成そのものの待ちを短くする

最優先は**使える既存画像を使い、生成回数を減らす**こと。
次に、共通の世界/色/構図を固定して依頼の作り直しと再生成を減らす。
互いに独立した画像は1素材1リクエストのまま並行で依頼できる。最初は2件程度から実測し、
混雑・制限・失敗時は逐次へ戻す。NPCの同一人物参照が必要な派生絵だけは基準絵の承認を待つ。
ゲーム実装/テストと画像生成を並行に進め、画像待ちを全体の停止にしない。

内蔵画像生成に公開されていないquality/size/concurrency設定をあるものとして扱わない。
共通プロンプトを短くしただけでサーバー処理が何倍も速くなるとは保証しない。
既存Asset FactoryのAPI worker/queue/課金設定やHuman Gateは変更しない。
画風の方向が未定のときだけラフ一覧で絞る。方向が決まっていれば最初から必要な個別絵を作り、
必須のラフ→清書で生成工程を倍増させない。最終素材は1枚ずつ独立画像とし、コンタクトシートを切って量産しない。

Noaの既存記録では5回の生成待ちは39.461〜62.001秒、合計246.752秒。
依頼受領→ローカル配置/最終目視確認は445秒、バックアップ確認までは492秒
（`design/noa-set-art-report.md`）。これはその時点の観測であり、次回の保証・並行化の実測ではない。
速さの評価は個々の生成時間、再生成回数、画像工程の実時間、セット全体の実時間を分ける。

## 工程時間を記録する

`timing-template.json` をコピーし、実際の開始/終了をタイムゾーン付きISO時刻で記録する。
1区間は `id / owner / phase / start / end`。任意で `asset`、`note` を追記してよい。
phaseは design / reuse-review / image-generation / image-qa / implementation / tests /
integration / browser-qa / tool-wait / publish。

```json
{"id":"comet-attempt-1","owner":"art-a","phase":"image-generation","asset":"comet","start":"2026-10-06T12:00:00Z","end":"2026-10-06T12:00:45Z"}
```

```sh
node tools/astral-card-production.mjs timing design/production/my-set-timing.json
```

`summedSeconds` はAPI等の区間の合計、`activeWallSeconds` は重複を除く実時間、
`elapsedSeconds` は最初から最後まで（隙間の待ちを含む）。並行区間を足して「全体時間」にしない。
失敗した生成も別区間として記録し、外部ツール待ちは画像生成に混ぜない。
計測がない時間は推定値を埋めず、空欄/未記録と説明する。

## 公開直前

```sh
node tools/astral-card-production.mjs validate design/production/my-set.json release
node --test tests/astral-*.test.mjs
python3 -m unittest discover -s tests -p 'test_astral_release.py'
# 全担当の差分と最終画像を統合後だけ実施。公開版番号を指定する。
python3 tools/astral_release.py release --version X.Y
python3 tools/astral_release.py verify
```

release検証はAPI/本番公開を行わない。CIで現在のNoa見本を検査し、次の採用セットを追加したら
`tests/astral-production.test.mjs` にその仕様のrelease検証を追加する。
配布ファイル以外のこのツールだけの更新では、ゲームのバージョンやrelease/SWを変更する必要はない。

## V4.17の先行2枚

`frost-synergy.json` は `scope: "two-card-pilot"` を明示する例外。
カードちょうど2枚、カード画像ちょうど2点、NPCなしを検証する。
通常セットの4〜6枚＋NPC1点という既存制約は維持する。
[実装範囲・検証報告](frost-synergy-report.md)を参照。新効果や生成ジョブは追加しない。

## V4.18 敵1体の試遊

[星秤の衛兵](star-scale-report.md)は新規growth-v2の書庫候補1体だけ。既存アート/効果を再利用し、カード・画像・schema・RNGを増やさない。
[データ仕様](star-scale-guard.json)、[対照計測](star-scale-results.json)、[保存隔離QA](../../ui-qa/star-scale.html)。
カードセット用validatorの入力ではなく、専用 `tests/astral-star-scale.test.mjs` でデータと全互換条件を確認する。

## 1枚だけの既存効果試遊

V4.19の`restitch.json`は明示的な`scope: single-card-pilot`。ちょうど1カード＋その画像1件、新NPCなしに限定する。
既存two-card-pilotと4〜6枚/NPCセットの制約は維持し、未知scopeや新効果は拒否する。
`node tools/astral-card-production.mjs validate design/production/restitch.json release`で通常/進化/対象なしの3宣言場面を確認。
複数操作・山札・魔力・撃破・報酬・旧保存の境界は専用テストと[報告](restitch-report.md)を参照。


## 三鈴の小型1セット（4.24候補）

[hush-bell-cards.json](hush-bell-cards.json)は既存two-card-pilot検証を使用。敵は[hush-bell-enemy.json](hush-bell-enemy.json)を専用テストで検証し、カードscopeを拡張しない。
専用3画像の生成前メタデータと完成prompt/negative/alpha/ハッシュは[hush-bell-art-jobs.json](hush-bell-art-jobs.json)。Factoryの自動キューを起動しない。
進化で基本版にない既知効果が増える場合もcatalogへ抽出する。未知効果を無視/許可せず、完全一致で検証する。
[判断・互換境界・失敗と限定検証](hush-bell-report.md)。候補を記録したところで停止し、次セットを自動開始しない。

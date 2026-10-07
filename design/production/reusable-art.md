# 既存アート再利用ショートリスト

監査日: 2026-10-06 / 対象: `busshin-it/shinka-dungeon` / commit `739cdb63f938048977dcb2f998770d4df4ef5ab3`

公開済みv4.11への整合時に、候補27点＋runtime10点のbyte数/SHA-256、38枚のart対応、
埋込み10点とのbyte同一性を再検証した。最初の静止画レビュー後に画像bytesは変わっていない。
この一致を `tests/astral-production.test.mjs` で継続確認する。実画面QAとは別の検証である。

## 結論

- 先読み38枚は、すでに **21種の絵を共有**している。内訳は v4専用カード絵11点＋埋込旧カード絵10点。新カード1枚につき新規生成1回を前提にする必要はない。
- 最優先は既存の `art` キーを使った試作。絵の意味・世界観・識別性を確認し、専用絵が必要なカードだけ追加制作する。
- 元画像27点を個別に `view_image` で実ピクセル確認。下記JSONには正確なパス、サイズ、SHA-256、既存カードの参照、判断と注意点を記録した。未使用の旧PNG18点は今回の審査外。
- ゲーム、素材、Factoryキュー、現在のart割当は変更していない。ブラウザ上のトリミング確認は未実施。

## 1. v4専用カード絵: まずここから選ぶ

共通: 枠・カード名・コストの焼き込みは見られない。寸法は実ファイルをPillowで確認。

| 現行artキー | ファイル | 寸法 / bytes | 系列・使いどころ | 注意 |
|---|---|---|---|---|
| `shatter` | [v4-1/assets/shatter.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/shatter.webp) | 1254×1254 / 510,404 | astral-watercolor; ice, shatter, crystal burst | High-detail white center; avoid text over the artwork. |
| `charge` | [v4-1/assets/charge.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/charge.webp) | 1254×1254 / 336,456 | astral-watercolor; thunder, energy, stored magic | Gold lightning distinguishes it from icy cards; keep crystal and both ring ends visible. |
| `shieldStrike` | [v4-1/assets/shield-strike.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/shield-strike.webp) | 1254×1254 / 376,586 | astral-watercolor; guard, reflection consumed, defense to attack | Broken mirror at lower left and blade at upper right must both survive crop. |
| `frostPierce` | [v4-1/assets/frost-pierce.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/frost-pierce.webp) | 512×512 / 97,784 | astral-ruins-detailed; ice, piercing, weakness payoff | 512-square source is adequate for existing cards; avoid large upscales. Keep center impact visible. |
| `chantWard` | [v4-1/assets/chant-ward.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/chant-ward.webp) | 512×512 / 96,796 | astral-ruins-detailed; guard, spell interruption, ward | 512-square source; central star is crop-safe but ring edges may trim. |
| `starFerryWard` | [v4-1/assets/star-ferry-ward.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/star-ferry-ward.webp) | 768×768 / 202,948 | star-causeway-detailed; guard, banked energy, Rune/causeway set | This depicts the ferryman and boat specifically; reserve for the Rune setting. Narrow crops lose boat ends. |
| `ebbArrow` | [v4-1/assets/ebb-arrow.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/ebb-arrow.webp) | 768×768 / 208,896 | star-causeway-detailed; dark, ebb/tide, energy-empty payoff, Rune/causeway set | Current mechanical family is dark despite blue artwork. Arrowhead approaches lower-right edge; crop deliberately. |
| `starRelay` | [v4-1/assets/star-relay.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/star-relay.webp) | 768×768 / 244,654 | noa-library-detailed; focus, block carryover, page transition, Noa/library set | Excellent book/page motif; reserve Noa identity. Do not interpret generic book art as automatic mechanic correctness. |
| `quietComet` | [v4-1/assets/quiet-comet.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/quiet-comet.webp) | 768×768 / 210,286 | noa-library-detailed; dark, recovery payoff, comet, Noa/library set | Comet head lies upper right; confirm it survives a narrow crop. |
| `mirrorLance` | [v4-1/assets/mirror-lance.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/mirror-lance.webp) | 768×768 / 162,474 | noa-library-detailed; guard, reflection to attack, spear, Noa/library set | Strongest crop risk: lance runs corner to corner. Prefer square/contain; verify spearhead in hand and gallery crops. |
| `starBookmark` | [v4-1/assets/star-bookmark.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/star-bookmark.webp) | 768×768 / 149,294 | noa-library-detailed; guard, retrieval, recycle, Noa/library set | Bookmark is above center; keep the lifted page visible so the reuse still conveys retrieval. |

星書庫4枚はノア、星舟・潮引きはルーンの固有モチーフを保つ。砕氷・蓄電・鏡撃は水彩寄りで輪郭が大きく、その他の精密な星空遺跡絵とは別の小系列として扱う。既存セットの差を増やすような無秩序な混用は避ける。

## 2. 旧カード原画と埋込データ: 実際の対応を固定する

`v4-1/card-art-data.js` と `src/card-art-data.js` は完全一致。埋込WebP10点は `assets/runtime/cards/` の各ファイルとSHA-256が一致した。以下のPNG原画を直接目視し、runtime寸法・bytesも確認した。runtime版10点も個別に `view_image` で開き、同じ構図と縮小後の可読性を確認した。通常は既存キーを使い、PNGをページへ直接追加して数MB増やさない。

| artキー / 現行利用数 | 目視した原画 | 原画寸法 / bytes | runtime寸法 / bytes | 実際に描かれているもの |
|---|---|---|---|---|
| `ice` / 2枚 | [file_0000000026948209a5bf61548ca87c69.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/file_0000000026948209a5bf61548ca87c69.png) | 1024×1536 / 3,248,652 | 420×630 / 81,696 | Bright single diagonal ice projectile in dark ruined cathedral |
| `guard` / 1枚 | [file_000000000d54820992e6206621eb8767.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/file_000000000d54820992e6206621eb8767.png) | 1086×1448 / 3,141,648 | 420×560 / 72,838 | Large translucent blue/gold dome around a central shaft of light |
| `dark` / 2枚 | [file_000000001be0820991c3c7673ba4e4c0.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/file_000000001be0820991c3c7673ba4e4c0.png) | 1086×1448 / 2,862,937 | 420×560 / 51,704 | Purple-black projectile with a dark core and long wake in ruins |
| `manaBurst` / 3枚 | [file_000000002dcc820997d6257f7bb5c181.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/file_000000002dcc820997d6257f7bb5c181.png) | 1086×1448 / 3,051,334 | 420×560 / 65,034 | Visible luminous CHAINS connecting ruined pillars, with electric arcs |
| `bolt` / 3枚 | [file_0000000045dc8209a4abc4b50484d629.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/file_0000000045dc8209a4abc4b50484d629.png) | 1086×1448 / 2,891,444 | 420×560 / 50,284 | Tall single lightning strike through gothic ruins |
| `frostNova` / 2枚 | [file_000000007bb48209bf90b9e4be3fa4b5.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/file_000000007bb48209bf90b9e4be3fa4b5.png) | 1086×1448 / 3,072,448 | 420×560 / 69,258 | Broad wall/ridge of tall blue ice crystals across ruined stone floor |
| `focus` / 3枚 | [file_00000000afe08209badd4e6ee4c65332.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/file_00000000afe08209badd4e6ee4c65332.png) | 1086×1448 / 2,975,549 | 420×560 / 61,620 | Small cloaked mage with a tall spiral of glowing magic above |
| `chainBolt` / 3枚 | [file_00000000b984820980078cb0cf6e8fe5.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/file_00000000b984820980078cb0cf6e8fe5.png) | 1086×1448 / 3,165,845 | 420×560 / 72,030 | Broad blue-violet magical flood/surge through shattered gothic ruins |
| `abyss` / 1枚 | [file_00000000c7988209a6b66b21978b5891.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/file_00000000c7988209a6b66b21978b5891.png) | 1086×1448 / 3,020,288 | 420×560 / 61,740 | Large centered purple-black vortex with orbiting rubble |
| `manaBarrier` / 7枚 | [file_00000000cae082099bd9fb794f9208d6.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/file_00000000cae082099bd9fb794f9208d6.png) | 1086×1448 / 3,188,611 | 420×560 / 67,842 | Several ornate mirrors orbiting in a blue reflective dome |

重要な選択ミス防止:
- `manaBurst` は鎖状の雷、`frostNova` は氷の壁、`chainBolt` は魔力の奔流。キー名だけで新カードの絵を決めない。今回、現行カードの割当は変えていない。
- `manaBarrier` は現行7枚で共用済み。さらに似た絵を増やす場合、カード名を読まなくても用途を識別できるか確認する。
- Factory manifest の `shinka_card_light_wall` と `shinka_card_ice_spear` は `current_path` が存在しない。`path` は制作予定名の場合もある。manifestを一覧の唯一の正本にしない。

## 3. 生成済みだがv4に未接続の予備2点

- [assets/cards/chain-lightning.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/chain-lightning.png) — 1024×1536 / 2,277,598 bytes。Clean blue-white branching lightning on nearly black background
  - Not currently referenced by v4 planning artwork. Strong silhouette but much plainer background than the celestial set. Create/verify optimized runtime copy before adoption.
- [assets/cards/abyss.png](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/assets/cards/abyss.png) — 1024×1536 / 3,144,729 bytes。Large dark orb in a painted purple gothic interior
  - Not the current v4 abyss image. Beautiful painted texture; darker than the detailed legacy set. Verify small-screen core clarity and optimize before adoption.

両方とも manifest に `gpt-image-2`、参照0点、2026-10-04のQA passが記録されている。今回はその記録に加えて元PNGを目視した。Factory版 `abyss.png` と埋込 `abyss`、Factory版 `chain-lightning.png` と埋込 `chainBolt` は別の絵。採用するなら別途最適化・画面確認を行う。

## 4. 周辺素材は役割を守って再利用

| 素材 | 寸法 / bytes | 再利用範囲 |
|---|---|---|
| [v4-1/assets/librarian-noa.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/librarian-noa.webp) | 1024×1536 / 424,908 | existing Noa dialogue, set identity, library guide |
| [v4-1/assets/ferryman-rune.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/ferryman-rune.webp) | 1024×1536 / 367,662 | existing Rune dialogue, causeway guide |
| [v4-1/assets/star-crossing-causeway.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/star-crossing-causeway.webp) | 1672×941 / 478,382 | route background, set preview, stage |
| [v4-1/assets/moon-mirror.webp](https://github.com/busshin-it/shinka-dungeon/blob/739cdb63f938048977dcb2f998770d4df4ef5ab3/v4-1/assets/moon-mirror.webp) | 1254×1254 / 216,468 | existing relic, mirror item preview |

ノア・ルーン・月鏡はRGBA、四隅のalpha=0を確認。人物には半透明の光も含まれるため、alphaがあることだけで完全に背景と独立したパーツとは判断しない。人物や背景を新カード用の切り抜き素材として無条件に扱わない。

## 5. 来歴と権利の区別

- ノア＋星書庫4枚: [専用制作記録](../noa-set-art-report.md)に生成方式、正確なプロンプト、寸法、SHA-256あり。
- Factory予備2枚: `asset-factory/asset-manifest.json` に生成モデル、参照数、QA記録あり。
- その他: git履歴・リポジトリへの収録・現在の利用を確認。原作者や生成方式は記録がない限り推定しない。
- 追跡済みファイルから LICENSE / COPYING / NOTICE / 個別画像の権利許諾を確認できなかった。「GitHubにある」「生成記録がある」はライセンスの証明ではない。同じゲームでの再利用候補という範囲の台帳であり、他作品への再配布・第三者への権利保証を意味しない。

## 6. 生成を始める前の短い手順

1. 仕組みを1文で決め、上の絵のモチーフと系列を選ぶ。既存artキーが使えるならそれで試作する。
2. 実ファイル存在・SHA-256・対応キーを確認する。旧manifestや名前から推測しない。
3. 既存カードと見間違えないか、スマホの手札・報酬・詳細で確認する。特に鏡頁の槍、潮引きの矢、鏡撃の斜め構図を確認。
4. v4単体配布では既存埋込を使う。`../assets/` への新依存は梱包方針を確認してから導入する。
5. 新しいファイルが必要なら既存原画から決定的なWebP最適化を行い、原画を保持して最終出力を目視する。生成呼出しを使わない。
6. それでも合わない場合だけ「どの既存候補が、なぜ不足したか」を記録して新規絵を依頼する。

## 検証の再現情報

- 全候補の `pixel_check.inspected_source_path` が、実際に `view_image` で開いたファイル。原画を見ずにサムネイルだけで採用判断した候補はない。
- JSON `asset` / `runtime_asset`: Pillowの寸法・モード、実ファイルbyte数、SHA-256。
- JSON `embedded_reference`: base64復号したWebPとruntimeファイルのbyte同一性。
- コード参照: `v4-1/planning-engine.js:4–41`（38カード）、`v4-1/planning.html:36`（専用11点）、`v4-1/planning-game.js:26`（解決順序）。
- JSON `provenance.last_asset_commit` と各ファイルの固定commitリンクから来歴を辿れる。
- この監査はローカル静止画レビュー。画面QA・新規採用・法的な権利調査を済ませたという意味ではない。

## v4.12 ローカル候補の追記（2026-10-06）

ノアの追記4枚では、4つの既存Noa画像を専用artキーで再利用する。
42カード / 25 artキー / 21種類の実画像。新規画像バイトは0。
`reusable-art.json` の `current_cards`・件数と `reuse_aliases` に新しい対応を記録。
画像そのものと既存artキーの対応は変えない。新しい本文のブラウザ確認は別途必要。

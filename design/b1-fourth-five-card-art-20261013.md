# B1 カード原画・第4弾5枚（2026-10-13）

## 目的と変更範囲
新しくチャットで制作した5点（霜砕き、余毒の頁、闇弾、奈落弾、氷槍）を、既存B1カードへ高解像度の独立原画として実装する。
ゲームのカード枚数57、数値、効果、保存、入力操作、竜、旧本編は不変更。

各原画1086×1448 PNGから配信用768×1024 WebPに変換。画面は既存の `magicArt` → `B1_HQ_CARD_ART` に統合し、手札、拡大表示、報酬、商店、図鑑で共通使用する。描画エラー時は既存CSS表現へフォールバック。

| カードID | カード名 | アートキー | 画像ファイル（v4-1/assets/） | SHA256 | Git blob SHA |
| --- | --- | --- | --- | --- | --- |
| `frostBreak` | 霜砕き | `fourth-frost-shatter` | `b1-frost-shatter.webp` | `c8745bda76e8c6a3c7224623e69dcd84f8fd8a00ab56341e233b8fe1e49860e1` | `f485039a777b009c3018c76d9b5095a2639f6184` |
| `lingeringPoison` | 余毒の頁 | `fourth-toxic-page` | `b1-toxic-page.webp` | `e5bdb55880929410a99d38bc8840ded07e0480ce8198ac0c5f1193bb0d2bb732` | `6c7d569e5389d43b494e81500b0b5bc2e7bbfefe` |
| `darkBolt` | 闇弾 | `dark` | `b1-dark-bolt.webp` | `761dee46e70844b902d695229169768f74da7398a01159fb70c35294a2c1aca4` | `9b0e55c1f119298c253fd5a9e637dcaf739e7c24` |
| `abyssBolt` | 奈落弾 | `abyss` | `b1-abyss-bolt.webp` | `9f6fef3f08fd790dd8e59f8f07beedc47dde838e8d90152f2cdc16b8a2d14ac9` | `4d81a5b04dd3017541a44a5dd63adc063cba0607` |
| `iceSpear` | 氷槍 | `ice` | `b1-ice-lance.webp` | `0eda0ddeb014ac7e01c46a67b2f6d1f91d5d1cfbdbd543251372a84b2e6ac2a1` | `86b37d403892c949aa3b39f91f659b9bbf779624` |

## GitHubへ直接登録した経路
ChatGPTで生成したWebPをbase64の作業用テキストとして安全に転送し、接続中のGitHub Git Data API `create_blob` を使用。
画像5点それぞれの実際のGitHub blob SHAと、同じWebPの`git hash-object`相当の計算結果が完全一致した。Git Tree APIで `v4-1/assets/` に配置した。
手動ZIP投稿を必要としない転送経路を試行・実証した。この経路は今回の会話での実施方法であり、リポジトリに常駐する無人画像生成サービスが完成したという意味ではない。

## テストと復旧
`asset-factory/tests/b1-fourth-five-card-art.test.mjs` に画像数、カードID対応、各画像のフォーマット、寸法、SHA256、CSSフォールバックを追加する。
CI合格・main統合・Pages配信・Android/PC実機表示はそれぞれ別々に照合する。
戻す際は対象WebPと2つの新規`magicArt`参照、共通原画マップの5行を合わせて戻す。他のカード原画を上書きしない。

## 画像未完成の次候補
魔力槍、影の反響、吹雪、雷の奔流、導魔突き。既存の火弾・灼流・獄炎砲は軽量アトラスなので、高画質化は別案件。

## CIと統合の照合（2026-10-13）
- Asset Factory CI #38330624497：success。
- Astral game verification #38330624501：success。
- PR #101をmain `0104f34`へsquash統合。
- GitHub PagesのデプロイとAndroid/PC実機確認は別途判定する。

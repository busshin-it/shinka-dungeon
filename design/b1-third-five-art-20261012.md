# B1カード原画・第3弾（2026-10-12）

既存の57種類に含まれるカード5枚に、このチャットで制作した独立原画を対応付けた。元画像は1086×1448の縦長3:4イラスト、配信用は768×1024 WebP。カードの数値・効果・保存・操作・旧本編は不変更。

| カードID | 名称 | magicArt | 登録ファイル | SHA256 |
|---|---|---|---|---|
| `charge` | 魔力点火 | `third-mana-ignite` | `v4-1/assets/b1-mana-ignite.webp` | `a1631645330fed3af67b6c387a013e37998df854923372fb2f4eec893069075a` |
| `break` | 破魔雷 | `third-holy-thunder` | `v4-1/assets/b1-holy-thunder.webp` | `fcb0baa263923832d0962ab71049e12898113f1edd366f26921e898e7b2c65a8` |
| `double` | 双雷 | `third-twin-thunder` | `v4-1/assets/b1-twin-thunder.webp` | `385ca16c03be8278fd4f2b8c07c808a7b175c6a49e724a1f40f6ecbcf0c977b3` |
| `focus` | 魔導の研究 | `third-arcane-study` | `v4-1/assets/b1-arcane-study.webp` | `f9a3229e12ce06ae0a5f5c2ac34e6b0aae60e0cc6e418e7308d353c672b88ae3` |
| `flare` | 毒炎 | `third-poison-flame` | `v4-1/assets/b1-poison-flame.webp` | `062514c85d5a0a6174eba27190630cbc4bde3d95dd1adc3589be4cfd2c20a2f3` |

- 5画像バイナリをGit blobとして登録し、`git hash-object`とGitHub側のblob SHAを照合した。
- `v4-1/underground-b1-engine.mjs`の各カード定義に`magicArt`のみ追加。原画参照は`v4-1/underground-b1-playtest.html`の`B1_HQ_CARD_ART`へ。
- 手札・拡大プレビュー・報酬・商店・図鑑の既存共通描画機構に接続。読込失敗時はCSS仮絵を残す。
- `asset-factory/tests/b1-third-card-art.test.mjs`で画像の形式・寸法・SHA256・カードID対応・フォールバックを検証。
- **GitHubへの登録と自動テスト、main統合、Pages配信、Android端末表示は別々の状態として記録する**。実機の切れ・トリミングは未確認。
- 元に戻す場合は画像と2つの`magicArt`参照・対応マップをまとめて前コミットに戻す。既存原画は変更しない。

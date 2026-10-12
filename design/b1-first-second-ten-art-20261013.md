# B1カード原画・第1弾と第2弾（2026-10-13）

**状態：画像の表示コードと検証テストを実装、画像ファイルのGitHub登録は未完了。PRはDraftを保持する。**

- 既存の57枚のうち、第1弾5枚・第2弾5枚の画像を追加する。ゲームのカード効果・魔力・保存・プレイ操作は変更しない。
- チャット内で制作したPNGを配信用768×1024 WebPへ変換済み。
- インポート用ZIP：`b1-card-art-first-second-10-ready.zip`（会話側で保存、GitHubには未保存）。
- ZIPにはすべて `v4-1/assets/` の相対パスで10枚が収録されている。
- テストはファイル存在・サイズ・WebP形式・幅高さ・SHA256・ID参照・表示失敗時のCSS代替を確認する。
- **画像バイナリ10枚の登録とテスト成功を確認するまでmainにマージしない**。未登録の状態で画像ありと表示させない。
- GitHub登録方法の制約：接続中のGitHub操作にはGit blob作成APIがあるが、ChatGPTの生成ファイルのバイナリをそのAPIへ直接渡す転送経路が現時点では使えない。ZIPのGitHubへの転送が必要。
- 第3弾5枚はPR #98で登録済み。この10枚とは別であり上書きしない。

| カードID | 名称 | アートキー | ファイル | SHA256 |
| --- | --- | --- | --- | --- |
| `scatter` | 散弾 | `first-scatter` | `b1-auto-scatter.webp` | `112e960da8f08eb1d682600fc1bf5acafce43fbb7cf9cfce49ec92ff637a1182` |
| `chain` | 連鎖雷 | `first-chain` | `b1-auto-chain.webp` | `0e84271270db409b837021b807004a4c2da31304a7de1e9577cbf2f02bdd321d` |
| `heal` | 小治癒 | `first-heal` | `b1-auto-heal.webp` | `b9ae6f3a4dd11aa7582138231ddea2de71fcab66ec5803da0f070be03bad447f` |
| `drain` | 吸命 | `first-drain` | `b1-auto-drain.webp` | `12be825802f44122a2c46b6872ffafe1cd1d4b81d6b3432162deaba721653c4d` |
| `poison` | 毒の印 | `first-poison` | `b1-auto-poison.webp` | `fe04212eacb4cd23c7381720dde685cc094dc3d71db4977dcfc6f4ddb39fbec9` |
| `fragile` | 脆弱の印 | `second-fragile` | `b1-fragile.webp` | `8c1442b65274ff1c47df10d05ab4c1dfa7e62e6602478f0248cc4e7bb2394ec3` |
| `strength` | 闘魔の印 | `second-strength` | `b1-power.webp` | `80e7cc876ad728ae57ea48e02f1e8989c5a11a758a2697b171188b233d5013ff` |
| `spark` | 火花 | `second-spark` | `b1-spark.webp` | `d266d74e5f84b96ee590b93850b593b0e5cfa993baa2afed82734d00d68aed9e` |
| `ward` | 氷の結界 | `second-ward` | `b1-ice-barrier.webp` | `38ee874cd36f2b9e92f00d0223f3b8832c197c276ae4df3fcd9ac17d2f71f1ce` |
| `flow` | 術式循環 | `second-flow` | `b1-cycle.webp` | `18a91681328abd4aaf9c1d1bb93e49067ee38b44ff0c62e79de1fedfaf556eae` |

## 公開までの確認
1. ZIPを展開し、10枚のWebPが `v4-1/assets/` に存在すること。
2. `npm run test:asset-factory` を含む既存CIが成功すること。
3. 変更PRをmainに統合し、Pages配信が成功すること。
4. Android/PCで手札、拡大表示、商店、カード図鑑の画像切れがないこと（実機は別確認）。

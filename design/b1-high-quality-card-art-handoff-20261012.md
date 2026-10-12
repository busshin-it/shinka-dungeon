# B1｜物理8＋黒魔法4 高画質カードアート実装（2026-10-12）

## 目的
現在の物理8枚は 180×240px・約2〜3KBのAVIFプレビューなので、大きな手札・拡大プレビューで粗く見える。ゲームの最新レイアウトは維持し、**既存の1086×1448px PNG原画から768×1024px・品質83のWebP**を1カードずつ作り、読み込みを高解像度優先にする。既存画像の単純なアップスケールや再生成は行わない。

## 作業状態
- ✅ ユーザー生成原画12枚を照合（物理8、黒魔法4。黒魔法4はまず候補採用扱い）
- ✅ このチャットの作業領域でWebP12枚を生成・デコード・768×1024を検証
- ✅ 物理8枚のみで約1.4MB、黒魔法4枚で約0.7MB、合計約2.1MBに最適化
- ✅ `scripts/build_b1_card_hq.py` を追加し、元PNGから同じ規格に変換可能
- ✅ `v4-1/underground-b1-playtest.html` に12枚分のWebP優先マッピングを追加
- ✅ WebPファイルが未登録の場合、物理カードは現行AVIF、黒魔法カードは現行CSSにフォールバック
- ✅ **WebP12点をGitHubへバイナリ登録完了**：一時的な転送経路でbase64をGit blob化し、元データの Git SHA と12点すべて一致。`v4-1/assets/` 配下にファイルとしてGit treeを作成し、PR #90ブランチへ更新済み。転送に使った一時ファイルは削除済み。
- ✅ 実ファイル込みのGitHub Actions #38218281957 成功。画像の期待サイズ・SHA256の照合を通過。
- ✅ PR #90はmain（34eada64）へ統合。Pages公開 #38218586993 とゲーム全体の再検証 #38218587662 は成功。
- ⏳ Android実機の画質・表示は別途確認が必要。

## 画像の対応表

| カード | ゲームキー | 新しいWebP名 | 元原画 |
| --- | --- | --- | --- |
| 殴打 | physical-bludgeon | b1-physical-bludgeon.webp | 炎龍を砕く黄金騎士.png |
| 連続殴打 | physical-rapid | b1-physical-rapid.webp | 炎火の連撃_双星槌撃.png |
| 強打 | physical-heavy | b1-physical-heavy.webp | 黄金の大槌_炎の一撃.png |
| 急襲 | physical-sneak | b1-physical-sneak.webp | 炎纏う不屈の聖騎士.png |
| 鉄槌 | physical-hammer | b1-physical-hammer.webp | 金色の戦乙女_炎撃の大槌.png |
| ドーピング | physical-doping | b1-physical-doping.webp | 輝光の戦乙女と炎槌.png |
| 逆境 | physical-adversity | b1-physical-adversity.webp | 炎弧を纏う星騎士の大槌撃墜.png |
| 逆鱗 | physical-rage | b1-physical-rage.webp | 逆鱗の炎撃_竜を纏う騎士.png |
| 精神崩壊 | mental-collapse | b1-dark-mental-collapse.webp | 紫の精神崩壊に苦しむ騎士.png |
| 呪い | curse | b1-dark-curse.webp | 呪われた騎士の緑の絶叫.png |
| 死の歌声 | death-song | b1-dark-death-song.webp | 死の歌を奏でる冥界の女王.png |
| 幻覚 | hallucination | b1-dark-hallucination.webp | 砕けた鏡界の亡霊騎士.png |

**画像出力パス**：`v4-1/assets/` 直下。**手札の原画位置**：既存 `object-fit:cover; object-position:50% 32%` のまま。ゲーム内カードサイズや戦闘ロジックは変更しない。

## WebP登録の履歴と公開後の残作業

1. **GitHubへの登録済み**：PR #90にWebP12点を直接登録。元画像に対応するGit blob SHAと各ファイルの存在を確認済み。
2. ハッシュ付き画像マニフェスト（`design/b1-card-hq-expected-manifest.json`）に一致することをテスト済み。
4. `node --test tests/astral-underground-b1-hq-card-art.test.mjs tests/astral-underground-b1-physical-art.test.mjs` を含むGitHub Actionsの全検証に合格後、承認を得てmainに統合する。
5. Pages公開後にPC・スマホ縦横・商店・報酬・拡大カードの表示を確認する。

### 原画から再作成するとき
```sh
python -m pip install Pillow
python scripts/build_b1_card_hq.py --source-dir "/path/to/original-pngs"
```
既存のスクリプトは**この12枚だけ**を対象とし、カード画像以外のAsset Factoryキューや生成予算・別キャラクターの画像には触れない。

## 品質と安全性
- 元のPNGは上書き・削除していない。画像自体の色補正・AI再生成・自動クロップはしていない。
- 12枚の画像はそれぞれ独立したWebP。合成アトラスではない。
- 既存のAVIF8枚はフォールバック用途として保持し、削除しない。
- 高画質の正式採用前に、特に黒魔法の4絵がカード効果と一致しているか、女戦士・炎モチーフへの偏りがないかを画面で確認する。
- 生成物を作業領域に作ったことと、**GitHubへバイナリを登録してPagesで高画質表示されることは同じではない**。

# B1物理カード8枚｜画像実装記録（2026-10-12）

ステータス：**軽量版の原画8枚を作業ブランチに追加、GitHub ActionsとPagesは別途確認**。カードの効果／旧保存は変更なし。

## 出発点
ユーザーが画像生成で作成した8枚を、既存のB1物理カードIDに割り当てた。追加された仮ルール [カード画像生成ルール](../asset-factory/CARD_ART_RULES_DRAFT.md) に沿う最初の画像登録。**この8枚の多くは同じ金髪の女戦士が登場する旧制作バッチ**であり、次の量産からは「女の子は毎回不要、技・武器・現象などを主題で使い分ける」という新ルールに移行する。承認済みの画風と、各イラストの恒久採用は別。

## カードID → GitHub画像

| カードID | 名称 | 保存画像（`v4-1/assets/`） | 元の生成画像名 |
| --- | --- | --- | --- |
| bludgeon | 殴打 | `b1-physical-bludgeon.avif` | 炎龍を砕く黄金騎士.png |
| rapidPunch | 連続殴打 | `b1-physical-rapid.avif` | 炎火の連撃_双星槌撃.png |
| heavyBlow | 強打 | `b1-physical-heavy.avif` | 黄金の大槌_炎の一撃.png |
| sneakHit | 急襲 | `b1-physical-sneak.avif` | 炎纏う不屈の聖騎士.png |
| ironHammer | 鉄槌 | `b1-physical-hammer.avif` | 金色の戦乙女_炎撃の大槌.png |
| doping | ドーピング | `b1-physical-doping.avif` | 輝光の戦乙女と炎槌.png |
| adversity | 逆境 | `b1-physical-adversity.avif` | 炎弧を纏う星騎士の大槌撃墜.png |
| rage | 逆鱗 | `b1-physical-rage.avif` | 逆鱗の炎撃_竜を纏う騎士.png |

- 画像は各1ファイル、縦長3:4、AVIF 180×240px、約2〜3KB。**最初のゲーム内表示を確認するための軽量版**であり、元PNG（約1086×1448px）を上書きしていない。高精細版の採用は後日差し替え可能。
- 画像本体のSHAは、ローカルでGit blob SHAを算出し、GitHubに送信したblob SHAと一致したことを確認。作業ブランチのGit treeに8個のblobとして登録。
- `v4-1/underground-b1-playtest.html` の `B1_CARD_ART` に元の火・雷6枚と物理8枚を一元化。手札／カード拡大／商店／開始時の追加選択では既存の `attachB1OriginalArt` を再利用。
- 読み込みに失敗したカードは既存CSSの仮イラストへフォールバック。戦闘操作、ドラッグ、攻撃数値、竜の既存画像は変更しない。
- 残課題：実機でのAVIFサポートと縮小／拡大の鮮明さ、画像が同一キャラクター／炎構図に寄り過ぎている点の見直し、高精細版への差し替え。B1の報酬には一部物理8枚が未出現（元の報酬抽選ルールをそのまま維持）。

## 完了条件
- [x] GitHubの作業ブランチに画像ファイル8点を保存
- [x] 画像パスをカードIDに接続
- [x] 画像なし時のCSS仮表示を維持
- [x] 自動回帰テストを追加
- [ ] CIでテスト完了
- [ ] main統合とGitHub Pages配信確認
- [ ] 実機での見え方確認
- [ ] 元原画を使った高精細版へのアップグレード検討

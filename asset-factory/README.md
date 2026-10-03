# Asset Factory MVP

Asset Factory は、進化ダンジョンで発生した「大量の画像素材を1枚ずつ、同じルールで作る」作業をキュー化するための管理画面です。

## このMVPでできること
- 画像制作ジョブをカード / 敵 / クラスに分けて一覧管理
- waiting → generating → qa → needs_fix → regenerate → complete → adopted → github_synced の状態管理
- 1素材=1画像、透過、全身、文字なし等のQAチェック
- プロンプト、ネガティブ条件、保存先、生成回数の確認・編集
- 次ジョブ開始、再生成、採用、GitHub反映済みの手動記録
- LocalStorage によるブラウザ内進捗保存
- 現在のキューを JSON で書き出し

## 開き方
静的サイトで `/asset-factory.html` を開きます。

## 次のフェーズ
1. 画像生成APIをサーバー側から接続
2. 生成画像をVisionで自動QA
3. NG時に修正プロンプトを生成して再試行
4. Storageへ保存
5. GitHub APIで target path へアップロード
6. ゲームの asset manifest を自動更新

APIキーをブラウザへ置かないため、画像生成とGitHub書き込みはバックエンド / Work / Dots 側のワーカーに分離します。

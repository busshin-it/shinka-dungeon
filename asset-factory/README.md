# Asset Factory MVP

Asset Factory は、進化ダンジョンで発生した「大量の画像素材を1枚ずつ、同じルールで作る」作業をキュー化・連続実行するための制作基盤です。

## 実装済み

- Asset Factory 管理画面
- カード / 敵 / クラス別の制作キュー
- waiting → generating → qa → needs_fix → regenerate → complete → adopted → github_synced の状態管理
- 1素材=1画像を強制するプロンプトビルダー
- カード / 敵 / クラスごとの生成ルール
- PNG構造チェック
  - PNG判定
  - 透過必須素材のアルファチャンネル確認
  - 縦横比確認
- Vision QA
  - 1素材だけか
  - 文字 / 数字 / UIがないか
  - 背景透過が必要な素材に背景がないか
  - 全身 / 武器が切れていないか
  - 指定内容と世界観に合っているか
  - 進化クラスが基本魔法師と同一人物に見えるか
- QA NG時の修正プロンプト生成と自動再生成
- ローカル再試行を使い切っても、総試行上限までは次回実行へ自動再キュー
- 失敗履歴・修正理由を `failure_history` / `self_heal` として保持
- API一時障害・コストガード停止後も、次回のGitHub Actionsで自動継続
- 成功画像を指定の `assets/**` へ保存
- queue.json の自動更新
- GitHub Actions から複数ジョブを1枚ずつ順番に連続生成
- 6時間ごとの自動運転で未完了キューを継続処理（`ASSET_FACTORY_AUTO_PAUSED=true` で一時停止可能）
- 429 / 5xx の一時エラー再試行
- ローカルテスト

## 重要な制作ルール

Asset Factory は常に **1素材 = 1画像** です。

複数カード、複数案、コンタクトシート、素材シートを1画像にまとめません。
キューのジョブを上から1件ずつ処理し、QAが完了してから次へ進みます。

## 使い方

### 1. GitHub Secret

Repository Settings → Secrets and variables → Actions に以下を登録します。

- `OPENAI_API_KEY`

APIキーはブラウザやリポジトリへ保存しません。

### 2. 任意のRepository Variables

- `ASSET_FACTORY_IMAGE_MODEL`
  - デフォルト: `gpt-image-2.5-sunburst`
- `ASSET_FACTORY_QA_MODEL`
  - デフォルト: `gpt-5.6`

### 3. GitHub Actionsから起動

Actions → **Asset Factory** → Run workflow

入力:

- `count`: 今回連続生成する素材数
- `asset_id`: 特定素材だけ作る場合に指定
- `max_retries`: 1回のActions実行内でのQA NG自動再生成回数
- `max_total_attempts`: 複数回のActions実行をまたいだ総生成回数の上限。上限までは人手を挟まず自動再キュー
- `quality`: low / medium / high

例:

`count = 5`

なら、未完成キューから5素材を選び、

生成 → QA → 必要なら再生成 → 保存 → 次素材

を順番に実行します。

## ローカル

```bash
npm run test:asset-factory
npm run asset:dry
OPENAI_API_KEY=... npm run asset:run
```

## 参照画像

進化クラスには基本魔法師画像を `reference_paths` として登録しています。

これにより、雷術師・黒魔導士・結界術師・星詠み・元素術師を生成するとき、基本魔法師の顔・髪・体型を参照して同一人物性を維持する設計です。

## 現在の保存先

- カード: `assets/cards/`
- 敵: `assets/enemies/`
- クラス: `assets/classes/`
- 将来のパーツ: `assets/characters/puppet/`
- 背景: `assets/backgrounds/`

## 管理画面

静的サイトで `/asset-factory.html` を開きます。

管理画面は queue.json の確認・ローカル進捗編集用です。実際の自動生成は GitHub Actions / worker が担当します。

## 次フェーズ

1. 生成済み標準ファイル名をゲームの CARD_ART / 敵 / クラス表示へ自動接続
2. Asset Factory管理画面からGitHub Actionsを起動する安全なサーバーAPI
3. コスト / 生成回数 / QA失敗理由の集計
4. キャラクターパーツ・背景・広告素材などへ共通化


## 自己修復運転

通常のQA失敗は、まず同じActions実行内で `max_retries` 回まで修正プロンプト付きで再生成します。

それでも通らない場合、`max_total_attempts` に達していなければ `queued` へ戻し、次回の自動運転で再挑戦します。したがって、単発の画風崩れ、構図不良、透過不良などのたびに人がキューを直す必要はありません。

以下の場合のみ `needs_fix` として人へ上げます。

- 総生成回数が `max_total_attempts` に到達した
- 401 / 403 / 明確な400系など、自動再試行しても改善しないAPIエラー
- 自動再キューを明示的に無効化した

各失敗は `failure_history` に残し、直近QAの `remediation` を次の生成プロンプトへ自動的に引き継ぎます。

## 自動運転

`.github/workflows/asset-factory-auto.yml` が6時間ごとに未完了キューを処理します。

1回あたりの画像API呼び出しはコストガードで制限し、上限へ達した素材は失敗扱いにせず次回へ繰り越します。

一時停止したい場合だけ、Repository Variable:

`ASSET_FACTORY_AUTO_PAUSED=true`

を設定してください。

# V4.17 霜の相乗2枚：公開記録

2026-10-07 UTC。[ゲームを開く](https://busshin-it.github.io/shinka-dungeon/v4-1/planning.html)。

## 公開対象

- [PR #19](https://github.com/busshin-it/shinka-dungeon/pull/19)。draftで作成し、正確なheadのCI成功後にready/squash merge。
- PR head: `35754d5bb0943e04c1dbd2a24573badb77524920`
- merge: `2e1d7ed8c5cc591ef57b9f109f83d4e97a6a5c9b`
- build: `4.17-39cab01f42f5`
- ローカル候補・PR・mergeのtreeは同一：`bec650e276443b6f0d9876af35f9bc6b51185ed5`。
- 図鑑54種。霜鏡と霜刻の予告だけをgrowth-v2の第2戦後以降へ追加。新効果ハンドラ・画像・保存schema変更なし。
- 旧classic/growth-v1・初回報酬・開いていた報酬を維持。途中growth-v2の今後の一般報酬だけは拡張する。
- 設計PR #14は未マージのまま。後続4案、PR #15〜17、Asset Factory設定/ジョブは変更していない。

## 検証

- Node175、Python4、Asset Factory14、制作仕様9/10/10/12/5ケース、release verify、差分空白確認が合格。
- 専用17テスト、旧52定義/進化値、4.16合成v5保存22件、2,112件の旧報酬/RNG比較。既存classic/旧growth/保存移行の回帰検証も保持。
- 独立レビューで指摘された旧growthの期待プール、図鑑ボタンを修正し、未ブロック三連撃の4ケースを追加。最終全テストを再実行した。
- [PR headのCI](https://github.com/busshin-it/shinka-dungeon/actions/runs/37680069901)成功を確認してからマージ。

- mergeの[標準Pages](https://github.com/busshin-it/shinka-dungeon/actions/runs/37680252814)は20:14:36 UTC、[検証付きPages](https://github.com/busshin-it/shinka-dungeon/actions/runs/37680252305)は20:14:26 UTCに成功。
- 20:14:39 UTC開始のHTTPS再取得で44配布入力＋release.json＋sw.jsの46/46ファイルが候補とbyte/SHA-256一致。20:15:34 UTCに完了応答を確認。
- この公開記録を加える後続更新はMD3件のみ。runtime buildと配布46ファイルは不変。

## 計測と限界

24組の自然ラン比較は48ラン/6,552保存チェック。完走17/24→18/24、平均ターン35→35.708、平均カード使用77.833→77.375。
既存の報酬方策は新2枚を提示7回中一度も選ばなかったため、新2枚の強さや楽しさへの効果は評価できていない。
順序や相乗数値は合成戦闘で確認。[範囲・方法・全制約](frost-synergy-report.md)、[計測データ](frost-synergy-results.json)。

## 工程・保存

- 19:59 UTCから残っていたローカル候補を回収。未公開branchがないことを確認し、重複PR/公開を避けた。
- 基準mainは `f65d4dc545e590f9c28029b3bb3cd84cd6a2f27a`。専用テスト/基準保存/表示場面/文書を完成させた。
- 自然ラン比較27.993秒。画像生成0、依存追加0、設定変更0。
- 27ファイルの個別blob SHAを確認後、本文を含まないSHA-only treeを1回作成し、計算済みcandidate treeと一致を確認。
- 通常git pushの認証確認は資格情報なしで停止。書込みは接続済みGitHubツールで完了した。公開呼出しの結果とSHAを逐次記録し、完了不明の変更を重複実行していない。
- 再開用のソースcheckpoint ZIPと46ファイルの再現PWA ZIPを保存。

## 未確認範囲

実ブラウザ描画、PWAの実画面更新、実機タッチ、横画面、ユーザーの実保存、人間の楽しさは未確認。
[保存隔離8場面](../../ui-qa/frost-synergy.html)は任意の手動確認用。合成restoreやコード検証を実機QAの合格と取り違えない。
手動確認はユーザー担当で開発を止めない。古い画面のままならゲーム画面をすべて閉じて開き直す。更新のために保存を消さない。

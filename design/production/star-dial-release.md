# 星儀の試練 v4.13 公開記録

確認日: 2026-10-07 UTC。

## 公開したもの

- [先読み46枚を遊ぶ](https://busshin-it.github.io/shinka-dungeon/v4-1/planning.html)
- [PR #11](https://github.com/busshin-it/shinka-dungeon/pull/11): draft作成、正確なheadのCI成功を確認後、ready → squash merge。
- merge: `1d6515fe7396a9b456a86994235313601947bc2c`
- build: `4.13-ebd5c053d7f6`
- レビュー済みローカル `86081b6`、PR head `fac02c6`、mergeのtreeはすべて `10d37b76c3766e04850978e12fce1e23cdb0a1b7` で一致。
- 新しい旅の書庫に「星儀の調律者」。星屑の瞬き／閉じる星環／星軌の追撃／調律の頁を追加。
- 既存42枚、初期10枚、全6戦、旧24枚モード、保存version3/shapeを維持。保存済みの旧書庫候補・敵・報酬・RNGを置換しない。
- 既存アートのみ。画像生成、有料API、新規依存、Asset Factory設定変更、未公開の分岐進化試作は含まない。

## 最終検証

- 99 Node game/production、4 Python release/package、14 Asset Factoryテストを公開担当が再実行して合格。
- 制作仕様: 既存Noa 9ケース、Noa追記10ケース、星儀10ケース合格。
- `python3 tools/astral_release.py verify`: build一致、44キャッシュ入力合格。
- `git diff --check`: 合格。公開直前mainは候補基準の `53b2e76` と一致。
- 独立レビューの旧/新snapshot・次操作1,757組比較は[制作報告](star-dial-report.md)に記録。
- [PR CI成功](https://github.com/busshin-it/shinka-dungeon/actions/runs/37563077933)はhead `fac02c6` が対象。
- [標準Pagesの公開成功](https://github.com/busshin-it/shinka-dungeon/actions/runs/37563161424)はmerge `1d6515f` が対象。
- 2026-10-07 02:43:31 UTC、HTTPSの44配布入力＋release.json＋sw.js、計46ファイルすべてがレビュー済み候補とbyte単位/SHA-256で一致。キャッシュ回避クエリ付きの読み取りで、ゲーム保存には触れない。
- 展開中の最初の読み取りは45/46一致（game.jsのみ旧版）。展開後の全件再取得で46/46へ収束した。

## 検証付きPagesの失敗記録

[別の検証付きPages run](https://github.com/busshin-it/shinka-dungeon/actions/runs/37563162565)は、ゲーム・保存・梱包検証に合格した後、初回のdeploy-pagesがGitHub OIDCのID Tokenリクエストtimeoutで失敗。
失敗jobの再実行ではアップロード済みartifactが2個になり、同名 `github-pages` の重複で公開処理が失敗した。
ゲームコード、権限設定、workflowは変更せず、標準Pages経由の配信と46ファイル一致を確認した。
同じrunの再試行を続けてもartifact重複は解消しないため、公開記録を加えるdocs-only commitで新しいrunを起動する。
後続commitの検証と配信確認結果は[PR #11の公開確認コメント](https://github.com/busshin-it/shinka-dungeon/pull/11)へ記録する。
この二重公開経路自体は既存の構成で、本変更で管理設定を統一したとは扱わない。

## 確認範囲と次の判断

手動の横画面・実機QAはユーザー担当であり、公開を止める条件にしない。
この公開担当は広い見た目確認を行っていない。Nodeで実エンジンの動作・合成保存復帰・次操作を検証し、実配信のbyte一致を確認した。

- 未確認: 実ブラウザの新本文/操作、スマホのタッチ・安全領域、連打・中断・リサイズ、実ユーザー保存での試遊、長期バランスと楽しさ。
- [保存隔離の9合成場面](https://busshin-it.github.io/shinka-dungeon/ui-qa/star-dial.html)を用意。通常保存に触れず、PWA登録もしない。
- 星儀は単純方策で旧星弓より第4戦の被害が小さい。人間の試遊で難易度・楽しさを判断する。レアリティや数値を最終確定したとは扱わない。
- 新敵に会えるのは新しい旅。保存中の旧ルートを維持するため、途中から敵を差し替えない。
- 既存PWAの開きっぱなし画面は古い版を保持する場合がある。更新のために保存を消さず、準備後にすべてのゲーム画面を閉じて開き直す。
- 根本設計、職業ルール、戦士ロードマップ、Asset Factory Human Gateを承認・完了したとは扱わない。

詳細の数値・設計・対照サンプリングは[制作報告](star-dial-report.md)を参照。

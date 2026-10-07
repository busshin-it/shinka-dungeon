# V4.18 星秤の衛兵：公開記録

2026-10-07 UTC。[ゲームを開く](https://busshin-it.github.io/shinka-dungeon/v4-1/planning.html)。

## 公開対象

- [PR #20](https://github.com/busshin-it/shinka-dungeon/pull/20)をdraftで作成、正確なheadのCI成功後にready/squash merge。
- PR head: `a0601cf16ecc6b2b2fe748fc8403b91b962c4cf4`
- merge: `f7be2a36bb2330023443a3d4dea93d5db7affe56`
- build: `4.18-4e4d2b8d0dd7`
- ローカル候補・remote PR・mergeのtree一致: `647af1bf8a74af1421e9ecba0a14ef2b8fc9ee94`
- 星秤の衛兵1体だけを新規growth-v2の第4戦書庫へ。HP70、休み→魔力2以上で12→6→合計12ダメージで18→8。
- 旧classic/growth-v1、保存済みgrowth-v2の相手/HP/候補/履歴、カード54種、6戦、報酬RNG、schemaを維持。保存からの継続中に敵を置換しない。
- 設計PR #15の最初の推奨案だけを個別実装。PR #14〜17は未マージのまま変更なし。

## 公開検証

- Node191、Python4、Asset Factory14、制作仕様5セット（9/10/10/12/5場面）、release verifyと差分チェックが合格。
- [head CI](https://github.com/busshin-it/shinka-dungeon/actions/runs/37682381736)成功を確認後にマージ。
- mergeの[検証付きPages](https://github.com/busshin-it/shinka-dungeon/actions/runs/37682567337)は20:32:12 UTC、[標準Pages](https://github.com/busshin-it/shinka-dungeon/actions/runs/37682565710)は20:32:28 UTCに成功状態を確認。
- 20:31:51 UTCに開始したHTTPS再取得で44入力＋release.json＋sw.jsの46/46が候補とbyte/SHA-256一致。20:32:50 UTCに完了結果を確認。
- 66個の4.17合成保存の次操作・RNGと2,880回の報酬/RNGが一致。
- 独立レビュー: 216旧ラン/22,538操作のbyte一致、1,728被害境界、27旧遭遇組合せ、75後続遷移、70 UI関数実行＋8合成場面。blockerなし。
- 狭い画面用の未来予告にも詠唱条件を表示。既存のtotal詠唱保存validatorの許容範囲は、基準版でも再現されるため今回変更しない。

## 対照と限界

同一章間保存24組、旧敵/新敵とも第4戦24勝。新敵は平均被害14.708→11.458、ターン6.083→6.542、操作18.042→18.875。6戦完走18/24→17/24。
魔力条件は44回中39回、合計詠唱崩しは35回中24回成立。
一律の改善・最適バランス・人の楽しさを主張しない。[範囲・方法・全制約](star-scale-report.md)、[全行データ](star-scale-results.json)。

## 工程と保全

- 20:16 UTC開始。基準main c4c1d531…を別コピーへ取得し、他の開発作業と分離。
- 20:25 UTCに最終全テスト成功、20:26 UTCに独立レビュー完了。計測21.593秒。
- 画像生成0、新効果ハンドラ0、新カード0、新依存0、設定変更0。既存starDialアートを再利用。
- 16ファイルをblob SHAで照合後、SHA-only treeを1回作成し、ローカルcandidate treeと一致確認。重複PR・完了不明の再送はなし。
- 公開前にソース差分・再現PWA・全テスト・独立レビュー入りcheckpoint ZIPをLibraryへ保存。`astral-v418-reviewed-checkpoint.zip`、SHA-256 `03ff81440df8e71d6dd747e5e198ff78d75c9723558b3a75161d58ed36aec989`。
- この記録の後続更新はMD3件だけ。配布46ファイルとbuildを変更しない。

実ブラウザ描画、実機タッチ、短い横画面、PWA更新の実画面、ユーザーの実保存、人間の楽しさは未確認。
[保存隔離8場面](../../ui-qa/star-scale.html)は任意の手動確認用。合成試験と実機QAを取り違えない。
古い画面の場合はゲーム画面をすべて閉じて開き直す。更新のために保存を消さない。

# 成長ループ試遊 v4.14 公開記録

確認日: 2026-10-07 UTC。数値と選択構成は仮仕様。

## 公開したもの

- [成長ループを遊ぶ](https://busshin-it.github.io/shinka-dungeon/v4-1/planning.html)
- [PR #12](https://github.com/busshin-it/shinka-dungeon/pull/12): draft作成、正確なheadのCI成功後にready、squash merge。
- PR head: `03879ae0c7e9884ef6006bb253840366e5cede84`
- merge: `47ff4be6384e0000b59901c931ddc986340ef009`
- build: `4.14-15de5d91590f`
- レビュー済みローカル `e5769645d445a14eea11e35ac67af812a7167f17`、PR head、mergeのtreeはすべて `b9aa8b1f733c5d28feda819b63537afcd70e8ec0` で一致。
- 新規ランは基本攻撃5枚・基本防御5枚。弱い第1〜3戦、役割別の初回報酬、第2戦後の休息/進化/除去を試す。基本2種＋既存46種、報酬は既存46種。
- 新規保存はruleset付きv4。途中の旧v3/v1/v2保存は旧ルールを維持する。既存のカード46種・第4〜6戦・旧24枚版・アートは保持。
- 画像生成、有料API、新しいクラス/ルート、依存変更、Asset Factory設定変更は含まない。

## 確認したこと

- 公開担当が133 Node game/production、4 Python release/package、14 Asset Factoryテストを再実行して合格。
- 既存制作仕様はNoa 9、Noa追記10、星儀10ケース。release verifyは44キャッシュ入力合格。差分空白チェック合格。
- [PR CI](https://github.com/busshin-it/shinka-dungeon/actions/runs/37594431765): head `03879ae` で成功。
- [標準Pages](https://github.com/busshin-it/shinka-dungeon/actions/runs/37595097500)と[検証付きPages](https://github.com/busshin-it/shinka-dungeon/actions/runs/37595098932): merge `47ff4be` で両方成功。
- 2026-10-07T08:43:14.813170+00:00、公開URLから44配布入力＋release.json＋SWの46ファイルをHTTPS再取得し、候補とbyte/SHA-256が全件一致。キャッシュ回避の読み取りだけで、プレイヤーの保存は変更しない。
- 28変更ファイルは個別blobのSHAを確認し、SHAだけのtreeで統合。配布コードは独立レビューから変更していない。
- 独立レビューと30,713回の保存/次操作/RNG比較の内訳は[制作報告](deck-growth-report.md)と[比較結果](deck-growth-results.json)を参照。

## 残る限界と次の判断

- 自動方策では初報酬まで平均2.764→2.000ターン、最初の戦闘操作11.583→8.000。一方で全体の戦闘操作は125.361→137.764、約9.9%増。ターン減少を実時間短縮や楽しさの改善と同一視しない。
- 自然に到達した初回支度24件はすべて満HP。休息が有利という結果は別の低HP合成状態に限られる。序盤難易度や支度の選択価値を最終確定しない。
- 手動の横画面/スマホ実機QAはユーザー担当で、公開を止める条件にしない。今回の公開担当はブラウザ操作や見た目の合格を主張しない。
- 未確認: 実機タッチ・安全領域、連打/中断/リサイズ、実ユーザー保存、長期バランスと楽しさ。
- [保存隔離の13合成場面](https://busshin-it.github.io/shinka-dungeon/ui-qa/growth.html)を用意。通常保存に触れず、PWA登録もしない。
- 新仕様を試すには「新しい旅」。途中の保存は元のルールで続けられる。
- 更新のために保存を消さない。開きっぱなしのPWAが古い版のままなら、準備後にゲーム画面をすべて閉じて開き直す。
- 次は「報酬がうれしいか」「基本札連打が作業にならないか」「残す/育てる/外すを考えたか」を試遊で確かめる。新クラスや次のカード制作をこの公開だけで自動開始しない。

この記録を加える後続変更はMDのみ。ゲームのbuildと46配布ファイルは変更しない。

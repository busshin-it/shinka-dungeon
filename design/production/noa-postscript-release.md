# ノアの追記 v4.12 公開記録

確認日: 2026-10-07 UTC。

## 公開したもの

- [先読み42枚を遊ぶ](https://busshin-it.github.io/shinka-dungeon/v4-1/planning.html)
- [PR #10](https://github.com/busshin-it/shinka-dungeon/pull/10): draftで作成し、CI成功後にready → squash merge。
- merge: `6acba70dbd7197994afee6d464655d5041c6e8ce`
- build: `4.12-059517d696ed`
- レビュー済み候補 `a92e64b` とGitHub PR head `3211992`、mergeのtreeはすべて `f9c06c0fba10501b8f7f64a5bb7af7fd956bfce3` で一致。
- 余白の灯 / 休符の星 / 鏡頁の一閃 / 返しの頁を既存効果と既存アートで追加。全4枚とも第2戦後の一般報酬枠から出現。
- 新画像生成・有料API呼出しなし。既存38カード・初期デッキ・保存仕様・CSS・6戦構成を維持。別の分岐進化試作は含めない。

## 最終テストと公開の根拠

- `node --test tests/astral-*.test.mjs`: 76/76合格。
- `python3 -m unittest discover -s tests -p 'test_astral_release.py'`: 4/4合格。
- `npm run test:asset-factory`: 14/14合格。既存ローカルSharp依存を参照し、新規install/API呼出しなし。
- 既存Noa制作仕様9ケース、新セット制作仕様10ケースのrelease検証合格。
- `python3 tools/astral_release.py verify`: 44配布ファイル、build一致。
- `git diff --check`: 合格。公開直前mainは候補の基準 `477a03a` のままで、他の変更との衝突なし。
- [PR CI成功](https://github.com/busshin-it/shinka-dungeon/actions/runs/37550680774)（head `3211992`）。
- [検証付きPages成功](https://github.com/busshin-it/shinka-dungeon/actions/runs/37550752085)と[別系統Pages成功](https://github.com/busshin-it/shinka-dungeon/actions/runs/37550750929)は、両方ともmerge `6acba70` が対象。
- 公開後、HTTPS配信の44入力ファイル＋release.json＋sw.jsの全46ファイルを取得し、ローカル候補とbyte単位/SHA-256で一致。キャッシュ回避クエリ付きの読取で、ユーザーのゲーム保存には触れない。

## 公開URLのクラウドブラウザ確認

[隔離した合成QA画面](https://busshin-it.github.io/shinka-dungeon/ui-qa/postscript.html)を利用。実配信のHTML/JS/画像を読み込み、保存はフレーム内の一時メモリに置換。PWA登録なし。

確認できた範囲:

1. 844×390の新4枚報酬で、全カードの名前・本文・アート・説明/見送りボタンを表示。
2. 640×240へリサイズし、一覧を下までスクロールして下段2枚も全文と画像を確認。操作ボタンを維持。
3. 640×240の休符の星の進化前後を表示。カード選択だけでは進化せず、確定ボタンが有効になる。支度に戻ると準備画面へ戻る。
4. 844×390の条件あり手札で返しの頁を選択。「防御4・山札の上へ: 雷撃＋」を確認。選択解除で手札へ戻り、魔力3・HP34・手札5枚のまま。

限定スモークであり、全場面/全サイズ/全操作のブラウザQA完了とは扱わない。
通常の公開URLも、既存PWAのゲームタブを閉じて開き直した後にタイトル04.12へ更新されることと「続きから」が残ることを確認（既存保存の中身での試遊はしない）。
旧PWAの開きっぱなし画面は古い版を保持する場合がある。更新のために保存を消さず、準備後にすべてのゲーム画面を閉じて開き直す。

## 未検証と次に行うこと

ユーザーの希望に合わせ、実機での見た目確認を公開後のスマホスクリーンショットへ分けた。

- 実機タッチ、OS/ブラウザのUI・安全領域、全6サイズ×全6場面、連打/中断/戻るの全組合せは未検証。
- 同じアートを使う旧/新カードの実プレイでの見分けやすさ、実ユーザー保存での試遊、長期バランスと楽しさも未確認。
- 次はスマホで04.12表示を確認し、気になる手札/報酬/進化画面のスクリーンショットをもとに狭い範囲で修正する。
- 新しいカードセット、職業ルール、戦士ロードマップ、Asset Factory Human Gateをこの公開で完了/承認したとは扱わない。次のバッチを自動開始しない。

数値・設計思想・報酬希釈の根拠は[候補レポート](noa-postscript-report.md)と[設計MD監査](noa-postscript-md-audit.md)を参照。

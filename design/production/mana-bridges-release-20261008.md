# PR #23の統合・公開確認（4.20）

ユーザーの「マージしてもいいよ」の指示を受け、PR #23をマージした。マージ前に、既存設定ではGitHub Pagesも自動更新されることを伝えた。設定やワークフローは変更していない。

- PR： https://github.com/busshin-it/shinka-dungeon/pull/23
- マージ前の確認済み先端：b1e06004e274e2c311b4b841accb1382139925e1
- mainのマージコミット：9b7e0f49fc650935b23bca7dd1c0a9fef7214a93
- 公開ビルド：4.20-eb0fe84478f5
- ゲーム： https://busshin-it.github.io/shinka-dungeon/v4-1/planning.html

5枚（霜渡り・星霜の便り・静鏡・余熱の結界・蓄星の刃）と、報酬画面の次の敵予告を統合した。カード総数は60。新しい保存項目・保存形式変更・保存削除はない。

マージ前のゲーム試験227件とPython試験4件が成功し、CIも成功。未解決のレビュー指摘はなかった。公開更新は既存の2経路とも成功した。

- PRのCI： https://github.com/busshin-it/shinka-dungeon/actions/runs/37696778812
- 検証を含むPages： https://github.com/busshin-it/shinka-dungeon/actions/runs/37710005732
- 既存のPages経路： https://github.com/busshin-it/shinka-dungeon/actions/runs/37710004976

2026-10-08T00:56:13.264697+00:00に公開URLから取得した44キャッシュ対象ファイル、release.json、sw.jsの計46ファイルが、このマージコミットの内容とすべてSHA-256一致した。詳細はmana-bridges-public-check-20261008.jsonに保存した。これはその時点の配信確認であり、実機の古いキャッシュが切り替わったことや画面の目視確認ではない。

次の霜解きは別の4.21候補PRで扱い、この公開確認とは分ける。

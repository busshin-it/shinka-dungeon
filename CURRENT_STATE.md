# 進化ダンジョン｜現在地

記録照合：2026-10-11のGitHub。共通の7原則は[AGENTS.md](AGENTS.md)から参照。本ファイルは短い現在地であり、履歴は別資料へ。

## ゴール
進化・カードの組み合わせ・敵の行動予告を楽しめるゲームの操作感を高める。旧版のゲームと保存を保護する。

## 第17歩（2026-10-11）：main統合済み
B1限定で竜の段階画像を3:4比率のまま中央トリミングし、ワンタップ選択→敵/戦場タップで発動へ。闇弾・奈落弾・氷槍・魔力槍をB1試作として追加。PR #76のGitHub Actionsが成功しmainへ統合。Pages配信とAndroid実機での表示・操作は未確認。

## 第18歩候補（2026-10-11）
GitHub作業ブランチで、B1戦闘背景をフルサイズに広げ、紺色の手札パネルを削除。カードは背景の上に扇状配置し、カードを上・斜め上へドラッグして離すと敵へ攻撃、防御系は戦闘エリアへドロップで発動する。水平スワイプは手札をスクロール。GitHub Actionsテスト、main統合、PWA/Android実機の確認は未完了。

## 記録で確認できる現在地
- [AI_SECRETARY_STATUS.md](AI_SECRETARY_STATUS.md)の冒頭に**2026-10-11 B1第15〜16歩**の記録がある。
- PR #75のmain統合、B1用高解像度画像、手札プレビュー、ドラッグ追従、対象表示の改善を記録。
- 自動テストは成功と記載。**GitHub Pagesでの配信確認とAndroid/PWA実機の操作感は未確認**。

## 次に確認すること
B1試作の実機表示を確認し、カードの重なり、ドラッグ操作、画像の鮮明さを評価。旧本編には影響させない。

## 詳細
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)（背景）／[GAME_DESIGN.md](GAME_DESIGN.md)（設計）／[GAME_LAB.md](GAME_LAB.md)（実験）／[ASTRAL_DEVELOPMENT.md](ASTRAL_DEVELOPMENT.md)（配布・互換）／[AI_SECRETARY_STATUS.md](AI_SECRETARY_STATUS.md)（短い現在地。旧全文は[保存用ブランチ](https://github.com/busshin-it/shinka-dungeon/blob/archive/secretary-before-compaction-20261011/AI_SECRETARY_STATUS.md)）。

この文書の作成では、ゲームコード・画像・配信設定・保存データを変更しない。

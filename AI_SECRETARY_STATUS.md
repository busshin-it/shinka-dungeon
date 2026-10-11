# 進化ダンジョン｜秘書AI用の現在地

> 2026-10-11時点のGitHub記録に基づく短い要約。最新の状態は[CURRENT_STATE.md](CURRENT_STATE.md)を正本とする。以前の詳細な29KBの全文は[保存用ブランチ](https://github.com/busshin-it/shinka-dungeon/blob/archive/secretary-before-compaction-20261011/AI_SECRETARY_STATUS.md)に保管。

## 現在地
- **B1独立試作：PR #75がmainへ統合済みとの記録。** 竜画像の高解像度化、手札の拡大プレビュー・ドラッグ追従・敵ターゲット強調・取消時の戻り演出を追加。
- **検証**：GitHub Actionsの自動テストは合格との記録。旧12戦本編・カード効果・既存セーブを保護する方針。
- **未確認**：GitHub Pagesへの公開反映と、Android/PWA実機での鮮明さ・カードの操作感。

## 次の一手
B1の実機表示でカードの重なり・ドラッグ操作・竜の鮮明さを確認し、必要な箇所だけ修正する。**CI合格を実機確認済みとは呼ばない。**

## 詳細
[AI_HANDOFF.md](AI_HANDOFF.md)（読む順）／[GAME_DESIGN.md](GAME_DESIGN.md)（設計）／[GAME_LAB.md](GAME_LAB.md)（試作履歴）／[ASTRAL_DEVELOPMENT.md](ASTRAL_DEVELOPMENT.md)（配信・互換）／[旧全文](https://github.com/busshin-it/shinka-dungeon/blob/archive/secretary-before-compaction-20261011/AI_SECRETARY_STATUS.md)。

**更新ルール**：このファイルは短い現況に**置き換えて更新**。日々の実装過程をここへ追加しない。実装・配信・実機検証は区別する。

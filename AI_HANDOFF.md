# 進化ダンジョン｜AI_HANDOFF（引き継ぎの入口）

> **ゲームの実装経緯をこのファイルへ累積しない。** 最初に[AGENTS.md](AGENTS.md)で共通7原則とゲーム独自の保護条件を読み、[CURRENT_STATE.md](CURRENT_STATE.md)で実証済み・未確認を把握する。

## 設計と実装の読み順
1. [AGENTS.md](AGENTS.md)、[CURRENT_STATE.md](CURRENT_STATE.md)
2. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — プロジェクト全体の背景。古い「現在地」は現在の配信と混同しない
3. [GAME_DESIGN.md](GAME_DESIGN.md) — カード・敵・ゲームルールの設計
4. [GAME_LAB.md](GAME_LAB.md) — 新しい試作・仮説の最近の記録
5. [ASTRAL_DEVELOPMENT.md](ASTRAL_DEVELOPMENT.md) — 配布版、保存互換、リリース確認
6. 必要な[design/](design/)配下、関連するゲームコード・テスト
7. [AI_SECRETARY_STATUS.md](AI_SECRETARY_STATUS.md) — 横断報告と過去の試行（必要部分のみ読む）

## 現在地の要点（2026-10-11の記録）
- 独立B1試作では、PR #75で竜の高解像度画像、手札プレビュー、ドラッグ追従などがmainへ統合されたと記録。
- **未確認**：GitHub Pagesでの実配信、Android/PWA実機の見た目・操作感。模擬テスト成功を実機での成功と言い換えない。
- その時点の次の作業は[CURRENT_STATE.md](CURRENT_STATE.md)で確認し、ここに日々の進捗を追加しない。

## 変更してはいけないもの
- 旧本編とB1を混同しない。既存の世界観、カード数値、報酬、ゲーム状態、公開済み保存データ、画像原本を関係ない変更で壊さない。
- 実装候補、mainへのマージ、公開配信、端末での操作実証は別の状態。
- 長い過去の試作記録は`GAME_LAB.md`や[AI_SECRETARY_STATUS.md](AI_SECRETARY_STATUS.md)に残し、無断削除しない。

**このファイルは読む順と安全な引き継ぎだけを扱う。詳細な設計の正本は既存の設計MD。**

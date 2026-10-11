# AGENTS.md — AI START HERE

このリポジトリで作業するAIは、実装・修正・設計の前にこのファイルを入口として確認すること。

## 1. 共通の開発原則（正本は1つ）

- [AI_EXTERNAL_BRAIN.md｜7つの共通原則](https://github.com/busshin-it/ai-development-brain/blob/main/AI_EXTERNAL_BRAIN.md)
- [WORK_RULES.md｜安全な開発・テスト・引き継ぎ](https://github.com/busshin-it/ai-development-brain/blob/main/WORK_RULES.md)
- 必要なときだけ：[自動化・他アプリ連携](https://github.com/busshin-it/ai-development-brain/blob/main/AUTOMATION_ENGINEERING_PLAYBOOK.md)／[ゴールまでの現在地](https://github.com/busshin-it/ai-development-brain/blob/main/GOAL_PROGRESS_REPORTING.md)／[秘書AIの共通ルール](https://github.com/busshin-it/ai-development-brain/blob/main/SECRETARY_AI_RULES.md)

**すべてのアプリは同じ7原則を使い、このアプリの仕様・判断・進捗・履歴はこのリポジトリで独立して管理する。** 共通ルールを全文コピーしない。アプリ間に固定の仕事の優先順位を作らない。外部ルールを取得できなければ、未確認と記録し、安全を要する操作は保留する。

## 2. このプロジェクトで最初に読むもの
最初に[CURRENT_STATE.md](CURRENT_STATE.md)で**短い現在地**を、[AI_HANDOFF.md](AI_HANDOFF.md)で**読み順・引き継ぎ時の注意**を確認する。以下のゲーム独自の設計正本は従来の読み順を維持する。ここでの読む順番はアプリの仕事の順位ではない。

1. `PROJECT_CONTEXT.md`（全体思想と背景。古い試作状態を現在の配信版と混同しない）
2. `GAME_DESIGN.md`
3. `GAME_LAB.md` の最新部分
4. `ASTRAL_DEVELOPMENT.md`
5. 必要に応じて `design/` 配下
- カード効果やコンボを**通常チャットで画像付き相談**する場合は `design/card-design-dialogue-guide.md` を確認する（設計案と実装済み仕様を混同しない）。
6. 秘書AI・進捗確認時は `AI_SECRETARY_STATUS.md`

## 3. 作業原則
- 今回の依頼範囲だけを変更する。
- ゲームルール・カード効果・世界観・既存アセット方針を不用意に変更しない。
- 関係のないファイルや機能を変更しない。
- 大規模なリファクタリングを勝手に行わない。
- 変更前に影響範囲を確認する。
- 実装後は関連機能の動作確認を行う。
- 意味のある開発完了時は `AI_SECRETARY_STATUS.md` の現在地・次・ブロッカーも更新する。
- 重要な変更・判断・残課題は該当するMDへ反映する。

## 4. 記憶・実稼働の照合

- これは**読む順と確認場所の案内**であり、アプリや機能の順位付けではない。個別の現在地は最新の日付・証拠を持つ引き継ぎ／秘書AI／開発記録から確認する。
- GitHubに記録された**設計・実装候補・CI結果**と、稼働コード・配信版・実機の動作は区別し、必要に応じて照合する。
- 新しい判断は案件固有のMD、具体的な修正は既存の変更履歴に記録する。既存のファイルを履歴の無限追記で肥大化させず、過去の記録を無断で消さない。
- 共通ルールを修正するときは共通リポジトリの正本だけを変更し、ここは参照リンクを維持する。

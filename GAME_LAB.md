
## 2026-10-13｜B1第50〜51歩：進化効果の一覧復旧と雷・結界8枚追加

- 実機画像で強化前後の効果が見えず大きなカード絵だけ並ぶ問題を確認。PR #117で**小さなイラスト・名前・現在効果・進化後効果**を同じ行で読み比べる一覧に戻した。PC2列、狭い画面1列。CI成功、main統合済み。
- 雷4＋結界4の新カードをPR #118で追加。雷連鎖（連続で雷を使うほど＋2、最大＋8）、反響結界（防御時の反射）、封毒の盾（毒／呪い連携）、育竜の護り（防御10以上で成長）。従来の雷カードも連鎖に参加。65種類、報酬可能60種類。専用の新規原画は今後制作。
- 全ゲームCI #38392781957 成功後、PR #118をmainへ統合。実機のスクロール・手札表示・ゲームバランスはユーザー確認が残る。
- 詳細： [雷と結界の設計](design/b1-lightning-chain-and-ward-20261013.md)、[カードUIルール](design/CARD_UI_DESIGN_RULES.md)。

# GAME LAB Research Log

## 2026-10-12｜B1第32歩：12戦・カード図鑑・画像で進化

- 5戦から12戦へ。ボス前に7戦追加して既存敵のHP・組み合わせを使い、戦闘の合間に3択報酬×11回（最大11枚）を提供。分岐・休憩・商店・ボス練習は維持。
- 最終戦の護衛＋ボス3体は、各画像の占有幅を広げ、等幅スロットの見た目を調整。選択できる当たり判定・敵のHPと予告は維持。
- カード進化は画像一覧（現在と進化後の効果比較）。「カード図鑑」は全55効果の正本を表示し、原画なし25枚を絞り込み。
- 詳細：[design/b1-twelve-fights-and-catalog-20261012.md](design/b1-twelve-fights-and-catalog-20261012.md)、[design/b1-card-art-inventory-20261012.md](design/b1-card-art-inventory-20261012.md)。自動テストと実機での確認は別。


## 2026-10-12｜B1第31歩：攻撃・防御・魔弾・雷撃・氷の矢・守りをゲーム画像へ

- 会話で制作した6枚の原画1086×1448pxを新規生成なしで768×1024 WebPに変換（品質83、約1MB）。GitHubの作業ブランチ `feat/b1-starter-six-card-art-20261012` にバイナリ登録し、全Git blob SHAをチェック。
- ゲーム本体には「攻撃」「防御」という独立カードがない。戦闘設計を変えないため、攻撃剣士絵→既存「魔装斬」、防御盾絵→既存「返響の盾」。魔弾、雷撃、氷の矢、守りは同名既存カードに紐づける。
- 画像キーを既存のB1カード定義と高画質画像マッピングへ追加して、手札／プレビュー／報酬／商店で共通利用。エフェクト・魔力・ダメージ・保存・ドラッグ・既存竜は変更なし。原画未読込時はCSSへフォールバック。
- 元原画とWebPの対応とハッシュを `design/b1-starter-six-card-art-20261012.md` とmanifestに記録。**画像登録とCI／main公開／スマホ実機動作は別の証拠で評価**。


## 2026-10-12｜B1第30歩：全体火3＋単体雷3の既存原画を高画質化

- 旧試作の残課題だった6枚のWebP実体がGitHubにないことを解消。以前制作した6枚の1086×1448独立原画を `design/b1-elemental-art-handoff-20261011.md` の対応と旧ZIPのmanifestで照合し、768×1024/品質83/WebPで作成。1カード1画像。Git blob SHAは作業領域の算出値と全件一致。
- 旧画像480×640の引伸ばしではなく原画から再変換。手札の上寄りクロップ50% 32%およびショッピング/拡大表示の同一描画処理を流用し、B1エンジン・保存データ・旧ゲーム・竜・Asset Factory自動運転には手を加えない。
- GitHub作業ブランチ `feat/b1-elemental-hq-six-20261012` で6点の実ファイルと画像SHA256検査を追加。**GitHub Actions・main統合・Pages公開・スマホ実機検証は別証拠で報告する**。


## 2026-10-12｜B1高画質原画12枚をWebP化（第29歩・導入準備）

- 物理8枚の現行AVIFは180×240px・約2〜3KB。原画1086×1448から768×1024の高画質WebPへ変換したところ、物理8枚で約1.4MB、黒魔法4枚で約0.7MBとなった。画像は1カード1ファイルのまま、トリミング・再生成なし。
- GitHubコードはWebP最優先で、画像ファイルがなければ物理は旧AVIF、黒魔法はCSSへ安全に戻る。手札・拡大・商店・開始時追加選択で共通の描画関数を利用。
- 重要：このチャットの作業領域にあるWebPと、GitHubへ登録済みのWebPは別。接続中GitHubの操作では作業領域のバイナリ直接登録ができず、12枚は現時点で未登録。変換器と対応表をPRへ保存し、ZIPを後から展開して配置する必要がある。**画像登録前の『高画質公開完了』報告は禁止**。
- 次段階：画像を実際にGitHubへ登録、PRの再テスト、main統合・Pages公開・実機の画質確認。出所・対応表：[design/b1-high-quality-card-art-handoff-20261012.md](design/b1-high-quality-card-art-handoff-20261012.md)。


## 2026-10-12｜B1手札カードを大きく・絵中心へ（第28歩）

- ユーザーの明確な訂正：**今回は画像生成ではなくゲーム画面の手札修正**。現状ではカードの絵が小さく隠れて見えるため、カードと絵を大きくし、切り抜きを少し上に、文章を簡潔にしたい。参考はSlay the Spireの手札可読性とShadowverseの絵を活かす配置。
- 原因：手札CSSに過去の縮小仕様が重なり、横画面用イラストが最終的に43〜65pxという細い帯になっていた。上書きする新しい専用CSSを既存スタイルの最後にロードし、幅を約190〜230px（PC）／約161〜198px（スマホ横）へ、イラストをカード高の約63〜67％へ配分する。
- 絵は`object-position:50% 32%`で少し上へ。手札は最長2行の簡潔な効果表示、カードを持ち上げるプレビュー・アクセシビリティ表示は全文を維持。旧原画とドラッグ判定、保存とカード効果は変更しない。
- 正式基準は[design/b1-hand-card-size-and-crop-20261012.md](design/b1-hand-card-size-and-crop-20261012.md)。自動テスト合格と実機画面での最終確認は別。次の画像制作はこの表示枠に合う主題の配置を前提にする。


## 2026-10-11｜B1物理デッキ開始ボタンの表示修正

- 公開版でユーザーから「物理デッキないね」と報告。エンジンには`selectStarter("physical")`、初期9枚がある。原因はUI上、既存の大型4選択肢の**後ろに物理専用を5枚目として追加**していたため、4列・2列のグリッドで2行目に回り、背の低い横画面ではスクロールしないと見えなかったこと。
- 対処：開始画面の先頭に独立した「⚔ 物理デッキで開始」を配置。火・雷・黒魔法の選択ダイアログからも入れる。小型横画面ではstickyで視認しやすくし、従来の4枚のカードと戦闘ジェスチャーは触れない。URL `?start=physical` から直接9枚物理デッキへ開始可能。既存の魔法師開始は変更なし。
- 対象構造・イベント・CSS・ゲーム内ルールの検証を追加。URLを開ける環境と実機は区別して確認する。

## 2026-10-11｜B1物理8枚（第26歩、試遊用PR #86）

- ユーザー案：殴打＝5/手札に魔法なし7、連続殴打＝6×2/なし8×2、強打＝12/なし16、急襲＝0コスト4/なし1ドロー、鉄槌＝20・デッキに魔法1枚でもあれば使用不可、ドーピング＝物理攻撃＋2・魔法で消失、逆境＝今回受けたHP被害分を次の物理攻撃に加算・魔法で消失、逆鱗＝敵全体10/HP1/3以下20。数値未指定コストは今回の仮値。
- 既存のB1で `weapon:true` があるカードを物理、それ以外を魔法と定義する。手札内魔法は**カードを使用して手札から除外した後**に判定する。鉄槌はデッキ全体を確認（通常魔法師は使用不可）、混成デッキで取得しても魔法が1枚あれば不可。このルールの試遊用に、従来の魔法師を改変せず物理のみの9枚開始選択肢を追加した。
- 初期デッキは殴打4、連続殴打2、急襲1、ドーピング1、鉄槌1。**防御カードは入っていない**。本来の職業設計とバランスはまだ未承認。
- ドーピング＋2は物理攻撃の各ヒットに適用・重ねがけ可。魔法をプレイすると消失。逆境の「今回受けたダメージ」は直前の敵ターンで実際に減ったHP（ブロックで防げなかった量）と仮定し、次の物理攻撃カードに一度だけ適用。連撃はカード1枚で1回、全体攻撃は各対象へ適用。魔法で解除。逆鱗の条件は `hp * 3 <= maxHp`。
- 強化は殴打7/9、連続殴打8×2/10×2、強打15/19、急襲6、鉄槌25、ドーピング＋3、逆境コスト0、逆鱗13/23とした（すべて仮）。初回カード選択・商店・休憩所強化・CSS仮イラストでプレイテスト可能。旧本編/カード/保存/ランダム報酬を保護し、専用テストで条件と境界を確認する。
- **試遊の優先論点**：物理開始が防御なしで戦えるか、急襲0魔力＋条件ドローが過剰か、魔法を引くだけでボーナスが消えることはないが保持していると手札ボーナスが止まること、鉄槌の厳格すぎる使用条件、逆境で敵の多段攻撃を受けたときの一撃火力、逆鱗のHP閾値と防御手段。
- 合意が必要なのは次の数値調整とカードの正式イラスト。Draftからmainへは未統合・公開未反映・Android実機は未確認。既存47枚からB1候補55枚へ。


## 2026-10-11｜B1属性6枚・黒魔法4枚のmain統合

- PR #83：CI成功後、全体火・単体雷6枚をmain 08ace042へsquash統合。原画WebPはまだリポジトリ未登録のためCSS仮絵で動作する。
- PR #85：先行PRとの履歴重複を整理し、黒魔法の効果・UI・確率／重ねがけの回帰テストのみを最新mainへ移植。CI成功後、main 530e4cb9へsquash統合。PR #84の作業内容を統合したもの。B1合計47枚。
- Pages自動配信の実行結果・Android実機・ゲームとしての面白さ／バランス・正式画像の確認は、CIと別の事実として照合する。

## 2026-10-11｜B1黒魔法4枚（第25歩・ユーザー指定ルールへ変更）

- 黒魔法は直前の「状態異常なら追加ダメージ」中心の試作から**行動変化型へ変更**。B1限定、数値・継続回数は未試遊の仮値。PR #83（火・雷6枚）はmainへ統合済み。PR #84は重複履歴を含むためPR #85（最新mainから作成）へ変更内容だけを移植した。旧版、既存保存、現在のB1報酬抽選には影響させない。
- **精神崩壊**（魔力2）: 敵1体を混乱させ、次の攻撃行動2回で対象を「プレイヤー＋本人以外の生存敵」から均等ランダム選択。味方に当たる場合、護衛・防御・脆弱・多段攻撃など元のB1ダメージ処理を適用。非攻撃行動は残り回数を消費しない。単体敵ならプレイヤーだけが対象（強い場面・弱い場面を明確化）。強化版は3回。混乱中も敵がプレイヤーを攻撃しうる。
- **呪い**（魔力1）: 対象の敵ターンに1→2→3ダメージ、3回で自然消滅。同一対象へ重複使用でき、新しい呪いは独立して1から開始。強化は1→2→3→4ダメージ（4ターン）。既存B1の毒と区別し、行動直前の蓄積ダメージ・ボス詠唱阻止への加算は従来のルールに準じる。
- **死の歌声**（魔力3）: 敵全体へ7ダメージ、**その対象が混乱中に限り**さらに6ダメージ。毒・弱体・脆弱・呪いのみでは+6にならない。強化で基本10（混乱追加+6は同じ）。脆弱の被害増加やボス護衛軽減は既存仕様。
- **幻覚**（魔力1）: 次の攻撃行動2回の命中率50％（行動ごとに1回抽選、多段攻撃は一括で命中／失敗）。非攻撃時は回数維持、強化3回。混乱併用時も幻覚判定で攻撃全体が失敗しうる。50％という数値は試遊用。
- スマホのカードのタップ・ドラッグ判定に混乱・呪い・幻覚という3つの単体対象種別を反映。敵HUDへ混乱・幻覚の残攻撃回数と次回の呪いダメージ・重数を表示。新規専用テストでランダムな敵への同士討ち／プレイヤーへの誤射、呪いの3ターン・再適用、死の歌声の混乱限定火力、幻覚の攻撃失敗確率、旧毒／脆弱の回帰を検証。
- 戦闘バランス・確率の体感、UIの見切れ、本PRの公開ページ反映、実機の操作は未確認。正式イラスト4枚も未制作。PR #83のゲーム用WebPバイナリは別途未アップロード。

## 2026-10-11｜B1全体火・単体雷6枚（第24歩・試作PR）

- 既存の単体火3枚と竜・闇魔法の効果を変えず、新しい全体火3枚と単体雷3枚を実装。小は低コスト、中は効率や連撃、大は魔力を使い切る強打とした。数値は試遊用の仮値で、バランス承認済みではない。
- `getB1Card` の強化・初回選択・商店に接続。全体火は現在の全体攻撃、単体雷は単体・連撃の既存処理を活用。追加の6枚は正式イラストではなく識別用のCSS仮絵。以前の単体火画像アトラス・旧保存はそのまま。
- 旧版・既存報酬候補や乱数・ゲームのセーブ形式を変更しない。Nodeの新規テストと既存テストはGitHub Actionsで確認する。PRと公開/端末での成功は別段階。
- 試遊の論点：全体火0魔力の価値、雷2連撃が護衛に弱いトレードオフ、3魔力大技の攻守選択。


## 2026-10-08｜V4.27候補・切断した護符試作を復旧

- 最新main V4.25（fc157e7、61カード）と全heads/PRを確認。専用GitHub成果は未送信、ローカルfeat/charm-seeds-20261008の未コミットコード・テスト・比較を引き継いだ。
- 護符12案・魔法師6系統を仮設計として記録。実装は連奏/返刃/蓄星の3種だけ、新UIは既存3＋試作3から3候補。旧intro固定3種・既存保存/RNGを維持。新カード・敵・戦闘数・画像・公開設定なし。
- Node256・Python4・Factory14・release verify成功。独立main定義と24旧経路を再照合。2seed×6護符×3構成の108戦比較は合成・有限方策であり面白さや最適性の証明ではない。実ブラウザ/実機は未確認。
- 候補seedの偏り、introの不正flag、旧説明assert、未更新配布メタデータを修正して記録。Draft PRまでで停止、mainマージ・公開は禁止。
- [設計12案/6系統](design/production/charm-seeds-design.md)、[検証と限界](design/production/charm-seeds-report.md)、[比較結果](design/production/charm-seeds-results.json)。

## 2026-10-08｜初期護符の再設計・3種試作（4.27候補、未統合）

- 最新main V4.25・61枚を確認し、切断前の未コミット作業を再利用。別Draft #25/#26/#27/#29は含めない。
- 12護符／魔法師6系統を仮設計、連奏・返刃・蓄星だけ試作。新旅は既存＋試作6種から3候補、旧保存は元の護符・抽選／RNGを維持。
- Node255／Python4／Factory14、release44入力成功。2seed×6護符×3合成デッキ、108戦で戦術差を計測。蓄星の被害増加と月鏡の短期優勢を記録し、面白さ・最適性は断定しない。実ブラウザ／実機は未確認。
- [12案・6系統](design/production/charm-seeds-design.md)、[復旧・テスト・限界・試遊](design/production/charm-seeds-report.md)、[結果](design/production/charm-seeds-results.json)。Draft PRで停止、マージ・公開なし。

## 2026-10-08｜V4.25・PR #28の統合承認

- GitHubを再確認。mainはV4.21、戦士は設計のみ、PR #28は未統合だった。ユーザーは今回も「魔法師のPRを完了」を選択し、既存のマージ許可に基づきこの1セットを統合する。
- 最新main `d8e3d6cde273e22d7510d232fe9d7f1f31c54943` とのローカル統合で競合なし。前回候補以降のmain差分はPROJECT_CONTEXTのFactory自動更新時刻のみ。コード・保存・画像の追加変更なし。
- Node242・Python4・Factory14、release verifyを再確認。新しい旅の初回2報酬は3択、旧旅は4択。公開は既存Pagesワークフローのまま。実際の統合・公開状態は[PR #28](https://github.com/busshin-it/shinka-dungeon/pull/28)とActionsを正とする。
- 面白さの課題・試遊ポイントは[報告](design/production/early-choice-report.md)。戦士実装・次のカードセットには進まない。以下の候補ログは制作時点の履歴。

## 2026-10-08｜V4.25候補・序盤3戦の3択報酬

- main V4.21を確認。戦士は設計のみのため、ユーザー選択で既存魔法師の序盤3戦を対象に変更。
- 新しい旅growth-v3／保存v6だけ、第1・第2戦後に攻撃・防御・組合せの各候補を1枚ずつ提示し、取得かスキップ。新カード・敵・画像なし。旧保存の4択／RNGと第3戦後の一般抽選を維持。
- 全Node242・Python4・Factory14成功、release verify成功。2シード16分岐で戦術・被害・時間の差を確認。ただし霜の護符では氷の矢が優勢で、面白さ・スキップの価値・バランスは未確定。実ブラウザ／実機は未確認。
- [調査・設計・保存互換・失敗と限界・試遊ポイント](design/production/early-choice-report.md)、[再現可能な小量比較](design/production/early-choice-results.json)。main未反映・公開なし。この1セットで停止。

## 2026-10-07｜V4.19 綴じ直し・公開

- [PR #21](https://github.com/busshin-it/shinka-dungeon/pull/21)を正確なheadのCI成功後にmerge。main `effb5fade`、build `4.19-3d070049d693`。検証付きPages成功、HTTPS配布46ファイル一致。
- コスト1で最新の捨て札攻撃を回収し、直後に1枚（進化2枚）引いて消滅する1枚。図鑑55種。旧ruleset・初回・開いていた報酬/RNGと保存version5を維持。
- Node206・Python4・Factory14、独立12,048旧保存次操作/2,112報酬RNGと取得/進化/除去を検証。既存画像・処理を再利用し、新依存/設定変更なし。
- 192場面の限定対照は72回使用/120回見送り。全ラン方策は新札を取得せず、強さ・楽しさを断定しない。実ブラウザ/実機/実ユーザー保存は未確認。
- [公開記録](design/production/restitch-release.md)、[対照と限界](design/production/restitch-report.md)、[保存隔離QA](ui-qa/restitch.html)。以下の候補ログは制作時点の履歴。

## 2026-10-07｜V4.18 星秤の衛兵・公開

- [PR #20](https://github.com/busshin-it/shinka-dungeon/pull/20)を正確なheadのCI成功後にmerge。main `f7be2a36`、build `4.18-4e4d2b8d0dd7`。両Pages成功、HTTPS配布46ファイル一致。
- 設計PR #15の先行案1体だけを新規growth-v2の書庫へ。休み→魔力2以上で12→6→合計12ダメージで18→8。旧保存の相手/HP/履歴、54枚、6戦、schema、報酬RNGを維持。
- 191 Node・4 Python・14 Factoryと独立レビュー合格。旧216ラン/22,538操作がbyte一致。新敵1,728被害境界、66固定保存、2,880報酬/RNGも検証。
- 同一章間保存24組の平均第4戦被害14.708→11.458、ターン6.083→6.542、6戦完走18→17。自動方策だけで楽しさや最適バランスを判断しない。
- 4.16の基本1コスト/+3、4.17の霜2枚は別変更として維持。画像生成・新依存・設定変更なし。手動描画/実機/実ユーザー保存は未確認。
- [公開記録](design/production/star-scale-release.md)、[対照方法と限界](design/production/star-scale-report.md)、[保存隔離QA](ui-qa/star-scale.html)。

## 2026-10-07｜V4.15 効果先行4枚・公開

- [PR #13](https://github.com/busshin-it/shinka-dungeon/pull/13)をCI成功後にmerge。main `20af682`、build `4.15-4fde8aa6412c`。両Pages成功、配信46ファイル一致。
- 4枚は既存効果と画像を再利用。初回成長報酬・旧v3ルールを保持し、v4の将来の第2戦後以降報酬だけに追加。既存v4の続きでも取得できる。
- コード/検査/文書準備は約15分。公開時の2送信失敗は重複確認して復旧。画像/API/新規インストール/設定変更なし。148 Node・4 Python・14 Factory合格と独立レビュー。
- 手動見た目/実機・実ユーザー保存・長期バランス・楽しさは未確認。[公開記録](design/production/effect-first-release.md)に工程時間と限界を記載。

## 2026-10-07｜V4.15 効果先行4枚・ローカル候補

- 新しい指示「イラストを後回しにして効果を増やす」に合わせ、氷写しの頁 / 蓄光の残響 / 灰読み / 渡り鏡を既存効果だけで追加。図鑑52種。
- growth-v1の第2戦後から個別抽選。旧v3の抽選/RNG、初回成長報酬、初期10枚、旧48定義、敵/ルート/保存schemaを保持。開いていた報酬は再抽選せず、将来の成長報酬だけ広がる。
- 148 Node・4 Python・14 Factory、制作12ケース、release/差分チェック合格。独立レビューも全Node/Pythonと旧commit比較でblockerなし。
- 画像生成/API/新依存/設定変更なし。既存画像と検証・依存を再利用。実装工程と外部待ちを分けて計測。
- 手動横画面/実機はユーザー担当。実ユーザー保存・長期バランス・楽しさは未確認。公開確認は別記録にする。
- 詳細: [制作・検証報告](design/production/effect-first-report.md)。

## 2026-10-07｜V4.14 成長ループ試遊・公開

- [PR #12](https://github.com/busshin-it/shinka-dungeon/pull/12)を正確なheadのCI成功後にready・squash merge。main `47ff4be`、build `4.14-15de5d91590f`。
- 新しい旅は共通の基本攻撃/防御10枚、弱い第1〜3戦、役割別の初報酬、第2戦後の休息/進化/除去。途中の旧保存は旧ルールを維持する。
- 公開担当が133 Node・4 Python・14 Factory、制作9/10/10、release verifyを再実行。候補・PR・mergeのtree一致。両Pages成功後、HTTPS配信46ファイルを候補とbyte/SHA-256一致確認。
- 初報酬は早まったが全体操作数は約9.9%増。自然な初回支度は全件満HPで休息の価値は未確認。固定行動・楽しさの改善とは断定しない。
- 手動横画面/実機はユーザー担当。実ブラウザの操作・実ユーザー保存・長期バランスは未検証。次は試遊の反応をもとに判断し、この公開だけで次のカード/クラス制作を自動開始しない。
- 詳細: [公開記録](design/production/deck-growth-release.md)。以下のローカル候補ログは制作時点の履歴。

## 2026-10-07｜V4.14 成長ループ試遊・ローカル候補

- 実プレイの「行動が固定」への対応。基本攻撃/防御の共通10枚、弱い第1〜3戦、初報酬4役、第2戦後の休息/進化/除去を一つの試遊として実装。
- 原仕様の魔力2/+1持越しを保持し、基本札を0コスト低出力にする。進化は3→5、単なる除去専用札にしない。アート生成なし。
- 新規保存v4に試遊ルールを固定。旧v3/v1/v2の途中保存は旧ルールを維持する。
- 手動横画面/実機QAはユーザー担当で開発の停止条件にしない。楽しさや公開成功は未確認。
- 133 Node・4 Python・14 Factory、制作9/10/10、release/差分チェック合格。独立レビューで保存/UIコードのblockerなし。
- 72対で初報酬2.000対2.764ターン、8.000対11.583操作。全体ターンは減ったが操作数は約9.9%増え、基本札連打の負担が残る。自然な初回支度は全件満HPで、休息の価値は合成低HPだけで確認。楽しさの改善とは断定しない。
- 詳細・同一seed比較・独立レビュー・未確認範囲は[試遊報告](design/production/deck-growth-report.md)。公開は統合担当が扱う。

## 2026-10-07｜V4.13 星儀の試練・公開

- [PR #11](https://github.com/busshin-it/shinka-dungeon/pull/11)を正確なheadのCI成功後にmerge。main `1d6515f`、build `4.13-ebd5c053d7f6`。新敵1体＋4枚で先読み46枚。
- 最終再検証: 99 Node、4 Python、14 Factory、制作仕様9/10/10ケース、release verify、空白差分チェック合格。レビュー済み候補・PR・mergeのtree一致。
- 標準Pages成功後、44配布入力＋release.json＋SWの46ファイルをHTTPS再取得し、候補とbyte/SHA-256一致。
- 検証付きPagesは初回OIDC timeout、再実行で同名artifact重複。成功した別経路の実配信を確認し、設定変更せずdocs-only commitで新runへ。後続の確認はPRコメントへ記録。
- 手動横画面/実機QAはユーザー担当。広い見た目確認、実ユーザー保存での試遊、長期バランス・楽しさは未確認。新敵は新しい旅だけに出現し、旧保存の敵は維持。
- 詳細・失敗記録・次の判断: [公開記録](design/production/star-dial-release.md)。以下の候補ログは制作時点の履歴。

## 2026-10-07 Noa postscript 4.12 published

- Published: [PR #10](https://github.com/busshin-it/shinka-dungeon/pull/10), main `6acba70dbd7197994afee6d464655d5041c6e8ce`, build `4.12-059517d696ed`, planning mode 42 cards. Both Pages deployment paths succeeded for this exact commit.
- Release checks rerun: 76 Node game/production, 4 Python release/package, 14 Factory tests; existing/new production validation 9/10 scenarios. All 44 distributed inputs plus release.json/SW (46 files) matched the reviewed local bytes after deployment.
- Cloud-browser live-URL smoke: isolated synthetic reward screen at 844×390 and 640×240, scrolling to all four new cards; images/text visible; evolution selection did not confirm by itself and Back returned to preparation; Return Page displayed the upgraded attack target and cancelled without being played.
- Limits: this is a bounded smoke, not full visual QA. Physical smartphone touch, all viewport/scenario combinations, repeated-click/interrupted flows, old/new shared-art identification, actual player saves, long-term balance and enjoyment remain unverified.
- Next: user checks the published game on their smartphone and sends screenshots of any layout/text issues. Keep changes bounded to that feedback; no automatic next batch or branching-prototype merge. Existing PWA clients may need all game windows closed and reopened to activate a prepared update; never clear saves to update.
- Detail and evidence: [publication record](design/production/noa-postscript-release.md). The local-only notes below describe the earlier candidate stage.

## 2026-10-06 Noa postscript local candidate / design-MD audit

- Status: local unpublished candidate only. GitHub main checked at 22:22 UTC remains `477a03a`, public game 4.11 / 38 cards. Candidate game is 4.12 / 42 cards.
- Scope: four cards for the existing Astral mage mode, using current effect handlers and five existing Noa assets. No new NPC, fight, route, class rule, image generation, or Asset Factory queue changes.
- Changes: marginLight / quietScript / mirrorNote / returnPage; all unlock in general reward slots after battle 2. Existing 38 definitions, starters, save version/shape, legacy engines, and layout CSS remain unchanged.
- Design basis: GAME_DESIGN §§2, 6, 7, 11–14. Per-card design tags, strength/weakness conditions, existing-card relationships, and unassigned/deferred rarity are documented in the production spec. This does not complete or replace the warrior W009–W036 roadmap in §16.
- Checks: 76 Node game/production tests, 4 Python release/package tests, 14 Asset Factory tests; new production spec 10 scenarios; independent review found no code blocker. Fixed v4.11 first-battle offers/RNG match for 192 seed/origin pairs; both fixed reward slots match in 1,536 after-battle-2 pairs.
- Unverified: new text/layout in a real browser, short-landscape interaction and old/new shared-art distinguishability, real-device touch, real user saves, long-term balance and player enjoyment. Source-image inspection is not browser QA.
- Next: review the [MD alignment audit](design/production/noa-postscript-md-audit.md), then run supported browser checks using `ui-qa/postscript.html` and the [candidate report](design/production/noa-postscript-report.md). Keep local until the remaining checks and publication decision are coordinated. Do not start another batch automatically.
- Historical scope: the 2026-10-03 three-battle/three-reward notes below remain history; current Astral distribution uses six battles/four reward options as documented in ASTRAL_DEVELOPMENT.md.

## 2026-10-03 combat consistency pass

- Fixed Frost Ring so it deals 4 damage and reduces the next enemy attack by 4 without freezing.
- Fixed the blue spring event so Focus carries into the next battle once.
- Connected the Guardian charge intent to real behavior: the next attack gains +3 damage, and the preview uses the same damage formula as resolution.
- Removed an unintended interaction where Wraith Knight curse could increase later enemy damage.
- Added run-local card usage counters for ice, lightning, dark, guard, and focus families. These are groundwork for class evolution; class names and thresholds remain undecided.
- Balance smoke test: 20,000 simplified first-battle simulations produced 100% wins, about 3.46 turns per win, and about 59.6 HP remaining on average. Keep battle 1 tutorial-easy for now and add decisions later in the run.

## Evolution design guardrails

- Card evolution is immediate/local growth that the player can test in the next fight.
- Class evolution should reflect run-wide card usage tendencies.
- Do not lock class names, thresholds, or hybrid-class conditions until they are deliberately chosen.
- Keep one asset per image, landscape-first layout, and improve the small three-battle run before expanding scope.

## Open questions

- Define the player-facing meaning of Wraith Knight curse before implementing a debuff.
- Decide class names, evolution thresholds, and whether hybrid classes should be possible.

## 2026-10-07｜V4.13 星儀の試練・ローカル候補

- 現行main `53b2e76` のASTRAL/設計/制作MDを確認し、6戦・4択・42枚から作業。初期3戦ログや未公開の分岐進化試作は混ぜない。
- 追加: 書庫の新敵「星儀の調律者」HP74＋4枚、計46枚。三連撃は手数、次の強打は一撃を問う。既存カード42枚の数値、初期10枚、旧24枚版を保持。
- 互換: 新規の書庫候補だけ変更。保存中の旧候補/敵/報酬/RNG/履歴と旧v1/v2移行を維持。保存v3の新フィールドなし。
- 検証: 99 Node、4 Python、14 Asset Factory。三連撃の部分軽減/各打撃反射、一撃11/12/13、予約/記憶/消滅/報酬/進化/除去/全6戦、旧19合成保存。多段軽減予告を1×3まで明記。
- 対照: 192章間保存で旧/新の第4戦勝利168/188、平均被害29.661/24.130。全体完走1/0の単純方策なので難易度・楽しさの証明にはしない。報酬固定2枠は1,536件一致、一般枠の希釈を記録。
- 素材: 既存カード絵4枚、ノア、門番系の敵絵を再利用。生成/API/新規依存なし。実画像は一枚ずつ目視し同一ハッシュ確認。新敵専用絵を制作したとは扱わない。
- 未検証: 手動横画面/実機はユーザー担当。開発の停止条件にせず、9合成場面を用意。実ブラウザ、実機タッチ、楽しさ、公開後確認は未実施。
- 次: 独立レビューを受けた候補を統合担当へ返す。公開は統合担当が扱う。新しい外部サービス/課金導入なし。
- 詳細: [星儀の試練の制作・検証報告](design/production/star-dial-report.md)。

## 2026-10-07｜V4.19 綴じ直し・検証済み候補

- PR #14 head 2f741097…の1枚だけ。通常1/進化2ドロー、コスト1、最新の捨て札攻撃回収、消滅。実際に「再攻撃へ使うか、灰の守りへ残すか」が成立。
- 図鑑55種、growth-v2第2戦後以降。保存version5/効果ハンドラ/旧ruleset/初回/開いていた報酬を維持。新画像・新依存・イベントは追加しない。
- Node206/Python4/Factory14、独立12,048旧保存次操作、2,112保護報酬とRNG、95取得後経路が合格。
- 36組全ランの新札取得は0件なので完走差をカード評価に使わない。192場面×補助3種の限定対照では綴じ直しを72使用/120見送り。人間の楽しさ・実機は未確認。
- [詳細と全制約](design/production/restitch-report.md)。公開前checkpointを保全し、draft PRのCI後に統合・実配信照合する。

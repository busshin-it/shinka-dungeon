# 星綴りの書庫：5点の専用アート制作記録

制作日: 2026-10-06。画像完成・ローカル配置済み。実装への接続・公開は別作業。
方式: built-in image_gen。1素材につき1回の独立生成。CLI/APIフォールバック、コンタクトシート生成、既存絵の切り抜き流用なし。
参考: GAME_DESIGN.md の Asset Factory画像ルール、asset-factory/README.md、既存 ferryman-rune.webp / frost-pierce.webp / star-ferry-ward.webp の実ピクセル。

## 完成物

- 専用NPC 1点、カード内イラスト4点。カード枠・カード名・コスト・UIなし。
- カード4点は768×768 RGB。NPCは1024×1536 RGBAで生成アルファを保持。WebP quality=89 / method=6。
- 元のPNGはリポジトリ外に保持し、5点とも個別のLibraryバックアップ成功を確認済み。公開リポジトリには個人のLibrary識別子を含めない。
- 本制作でエンジン・UI・保存データ・自動生成キューは変更していない。

## 時間記録（すべてUTC）

- 依頼受領: 2026-10-06 11:03:37
- 初回生成開始: 11:04:59.542
- 全5生成終了: 11:09:59.557
- WebP最適化と実ピクセルQA完了: 11:11:02
- Libraryバックアップ結果確認: 11:11:49
- 生成ツール実行・待ち合計: 246.752秒（4分6.752秒）。生成と待ちは同じAPI呼出しの壁時計区間で、分割測定不可。
- 事前確認・画風確認・プロンプト作成: 82.542秒（依頼受領→初回生成開始）。
- 画像間のQA・次画像投入準備: 53.263秒（前画像終了→次画像開始の合計）。
- 全生成終了→最適化・最終QA完了: 62.443秒。元画像保存やLibrary準備を含むため、純粋な目視時間とは区別する。
- 画像生成・ローカルQAまでの総壁時計: 7分25秒。バックアップ確認まで: 8分12秒。
- 5回は直列。再生成0回。カード設計/実装/ブラウザQA時間は含めない。

## 配置上の注意

4枚は既存カード画像と同じ正方形の原稿。鏡頁の槍は対角の両端近くまで槍が伸びるため、全体形状を見せる表示では正方形の画像領域を保つ。極端な縦細トリミングでは先端の一部が切れる。小さな縦クロップの手札では槍の上端が読める位置を実装側で確認する。NPCの顔は中央上寄りで、小型ガイド肖像への利用を想定。

## 星綴りの司書・ノア / librarian-noa

配置: `v4-1/assets/librarian-noa.webp`
WebP: 1024×1536 / RGBA / 424,908 bytes。PNG原稿: 1024×1536。
生成開始: 2026-10-06T11:04:59.542Z。生成終了: 2026-10-06T11:06:01.543Z。所要: 62.001秒。
SHA-256: `f88e237806bba2cead68c5e8a0dbf723b8eca1186eeb7719e8a564397a05ec76`

Pass visual QA: mature fantasy NPC portrait; teal hair and silver spectacles clearly distinguish Noa from Rune; both hands and star folio present; silver/teal/purple robes coherent with set; alpha verified RGBA with transparent corner pixels, preserved unmodified.

### 正確な生成プロンプト

Use case: stylized-concept. Asset type: one finished fantasy RPG NPC portrait cutout, portrait orientation 2:3. Primary request: Noa, the quiet keeper of an ancient celestial library, an adult woman with a calm intelligent expression, dark teal chin-length hair tucked behind one ear and fine silver half-moon spectacles. Distinct silhouette from a grey-haired male ferryman or a pointed-hat battle mage. She wears layered blue-green and deep-purple librarian robes with silver clasps and delicate constellation embroidery, practical high collar and broad flowing sleeves. One hand holds open a hovering star-map folio, the other delicately guides a small silver star-shaped bookmark above its pages. Show her from head through mid-thigh, whole head, both hands and book fully visible with comfortable silhouette margins. Style: premium Japanese fantasy RPG illustration, beautifully drawn mature anime-inspired face, intricate finely painted fabric, silver filigree, believable folds and hands, high-detail clean painterly finish. Lighting: soft cool stellar glow from the floating map, warm subtle face highlights. Palette: rich deep teal, amethyst purple, silver, navy. Scene/backdrop: genuinely transparent background, isolated character and her floating folio and bookmark; no backdrop or floor. Constraints: one character only; no text, letters, numbers, card border, logo, watermark, UI, collage, contact sheet, extra props, spear, oar, oversized hat, or starfield rectangle. Star chart markings are abstract geometric constellations only. Complete polished standalone illustration suitable for a small guide portrait, strong recognizable facial silhouette.

## 星継ぎ / star-relay

配置: `v4-1/assets/star-relay.webp`
WebP: 768×768 / RGB / 244,654 bytes。PNG原稿: 1254×1254。
生成開始: 2026-10-06T11:06:24.599Z。生成終了: 2026-10-06T11:07:16.747Z。所要: 52.148秒。
SHA-256: `ab57e7fed839a208808a30a2b13abcbfce1b4c6bcaa4990c5fdbb3ab5cd5094c`

Pass visual QA: curved luminous shield folds through a silver-blue turning page into the next atlas page; strong central S-shaped flow, full card illustration, detailed celestial-library style, no text/UI or borders.

### 正確な生成プロンプト

Use case: stylized-concept. Asset type: one finished portrait-friendly fantasy RPG spell card illustration, square 1:1 canvas with the important action in its central vertical two-thirds. Primary request: in an ancient celestial library at night, a translucent blue stellar shield is folding like fine glass-light into a silver book page, and that luminous silver page is turning into the next page of an open star atlas. Make the visual story of current protection becoming protection for the next page instantly legible. One prominent curved shield shape in the upper middle, a clear hinge-like stream of folded silver page at center, one receiving page below; a single coherent magical transformation rather than several disconnected objects. Style: premium detailed fantasy game card painting, intricate silver illuminated manuscript materials, believable blue glass translucency and glowing constellation lines, cinematic depth, polished Japanese RPG collectible-card illustration with realistic material detail. Dark, quiet stone library arches softly in the background, faint stars beyond. Blue-white light on deep teal and violet shadows, restrained warm candle edge-light. Constraints: no characters, readable text, letters, numbers, card frames, logos, watermarks, UI, collage, or contact sheet. Abstract geometric constellation marks only. Keep the spell silhouette strong and the main action readable at small card size.

## 凪の彗星 / quiet-comet

配置: `v4-1/assets/quiet-comet.webp`
WebP: 768×768 / RGB / 210,286 bytes。PNG原稿: 1254×1254。
生成開始: 2026-10-06T11:07:25.656Z。生成終了: 2026-10-06T11:08:05.117Z。所要: 39.461秒。
SHA-256: `036721a68c2e830d40ef0d9810a1cdb7a57085879f466302e2124955c0984680`

Pass visual QA: one violet-blue comet and one clear diagonal trail above the calm open atlas; head at upper-right and trail crossing central portrait-safe area; detailed library palette, no characters, text/UI or borders.

### 正確な生成プロンプト

Use case: stylized-concept. Asset type: one finished portrait-friendly fantasy RPG spell card illustration, square 1:1 canvas with main action readable in a vertical crop. Primary request: one powerful violet-blue comet cuts diagonally across a quiet ancient star-map page. A single brilliant pale-blue comet head near the upper central right pulls ONE clear long purple-blue trailing wake toward the lower left over the open atlas; luminous dust belongs to that same single trail. The map is still and softly lit except where the comet burns across it. No additional comets, beams or intersecting trails. Composition: dynamic diagonal, large dominant comet silhouette, detailed curved parchment page occupying lower middle, spacious deep midnight negative space toward upper edges, clear light-dark hierarchy at thumbnail scale. Style: premium detailed fantasy card painting, crisp magical energy with refined painterly detail, celestial map on aged silver-edged parchment, a quiet old stone library suggested in deep soft background, premium Japanese RPG collectible-card art. Palette: electric violet and icy cobalt highlights against rich navy, muted teal, subtle warm parchment. Constraints: no character, text, letters, numbers, card border, logo, watermark, UI, contact sheet or collage. Star-chart marks are delicate abstract constellations and arcs only. One distinct spell, one dominant trail.

## 鏡頁の槍 / mirror-lance

配置: `v4-1/assets/mirror-lance.webp`
WebP: 768×768 / RGB / 162,474 bytes。PNG原稿: 1254×1254。
生成開始: 2026-10-06T11:08:12.904Z。生成終了: 2026-10-06T11:08:58.616Z。所要: 45.712秒。
SHA-256: `93a900269fe66e3fdb0fd068da361fc1a51752ae499821afa93ba7fd9ddb42a4`

Pass visual QA: single long silver shaft with star-blue leaf-shaped spearhead; curled mirror page unmistakably transforms around lower shaft, clear spear versus shield distinction, no text/UI/borders. Full square composition preserves both spear tips; extreme narrow crop would lose peripheral tip edges, so prefer existing square card-art treatment.

### 正確な生成プロンプト

Use case: stylized-concept. Asset type: one finished portrait-friendly fantasy RPG weapon-spell card illustration, square 1:1 canvas with a strong central vertical-compatible silhouette. Primary request: a reflective silver page of an ancient star atlas folds into a long pointed star-blue lance. Show ONE clearly readable complete spear, angled from lower left toward upper right, occupying most of the canvas: a long slender silver shaft formed of rolled mirror parchment, a sharp elegant leaf-shaped lance head of dark-blue mirror crystal, and a visibly folded silver page curling once around its lower shaft as the transformation finishes. The head and shaft must be recognizable as a spear rather than a sword, shield or magic beam. A sparse cobalt glint runs along its razor edge, with reflections of tiny stars in the mirrored surfaces. Scene: quiet celestial library, open atlas below and dim stone arches out of focus behind; no person. Style: premium intricately painted Japanese fantasy RPG card art, finely rendered mirror metal and crystalline blue surfaces, dynamic perspective but unambiguous object silhouette, controlled cinematic lighting. Palette: silver, star-blue, muted deep teal and violet shadows with subdued parchment gold. Constraints: one spear only, no extra weapons, no shield, no character, text, letters, numerals, UI, border, logo, watermark, contact sheet or collage. Central sharp focus with atmosphere around edges, readable at small card size.

## 星の栞 / star-bookmark

配置: `v4-1/assets/star-bookmark.webp`
WebP: 768×768 / RGB / 149,294 bytes。PNG原稿: 1254×1254。
生成開始: 2026-10-06T11:09:12.127Z。生成終了: 2026-10-06T11:09:59.557Z。所要: 47.43秒。
SHA-256: `5eb5e60418525f3b5b54998054bc6a525cfd654f7c84b231a9db5e80fffc028c`

Pass visual QA: one silver eight-point bookmark with blue star center, one visibly lifted atlas page, no characters, readable text/UI/borders; strong intimate close-up distinct from the shield and projectile cards.

### 正確な生成プロンプト

Use case: stylized-concept. Asset type: one finished portrait-friendly fantasy RPG spell card illustration, square 1:1 canvas with the focal object centered for a portrait crop. Primary request: a finely made silver star-shaped bookmark lifts exactly one page of an old celestial atlas. Close view of a small elegant eight-point silver star bookmark with a narrow silver ribbon tail; it hovers just above the curved corner of one lifted star-map page, gently drawing that page upward while the rest of the thick old atlas lies still beneath. Make the star bookmark the singular clear focal object and the lifted page plainly countable as one. Intimate, delicate and quiet composition, no grand explosion. Style: premium highly detailed fantasy RPG card painting, beautiful engraved silver edges, soft glowing blue star center, aged rich parchment fibers, tiny abstract constellations on the lifted page, realistic material highlights and refined painterly finish. Background: dim ancient stone library suggested as soft teal-violet shadows, subtle star dust, shallow depth and strong focal clarity. Palette: silver, pale cyan glow, muted parchment amber, deep teal and amethyst. Constraints: no people or hands, no readable text, letters, numbers, card border, UI, watermark, logo, contact sheet or collage. One bookmark, one lifted page, one self-contained illustration, legible at small size.

## 合計

WebP 5点合計: 1,191,616 bytes。元PNG 5点合計: 14,008,942 bytes。

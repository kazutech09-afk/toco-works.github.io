# tocoworks-site：toco-works.com のサイト（4事業共通）

Toco Works の公開ページの元ファイル。GitHub Pages（Organization「toco-works」のリポジトリ `toco-works.github.io`）に置き、独自ドメイン `toco-works.com` で表示する。作成 2026-09-29（sns-business ボード o33）。2026-09-30 に、文章・並び・リンクをオーナーが自分で直せる形に変更（o34）。

## 自分で直すとき（オーナー向け。ブラウザだけ）

### 直せること
| 直したいこと | どこで直す |
|---|---|
| 文章、見出し、ボタンの文字 | 編集ツール |
| ボタンやメニューのリンク先 | 編集ツール（メニューは、左の「共通」） |
| ブロックの並びかえ・追加・削除（カード、文章、画像、ボタンなど） | 編集ツール |
| カードの数、横に並べる数、画像の左右 | 編集ツール |
| 画像の追加 | 編集ツールの「画像を選ぶ」 |
| ページの追加 | 編集ツールの「＋ ページを追加」 |
| 色・文字の大きさ・新しい種類のブロック | Claude に頼む（チャットで伝える） |

### はじめの1回だけ：保存の準備
1. **https://toco-works.com/edit/** を開く
2. 右上の「保存の準備」を押し、出てきた手順のとおりに、GitHub で鍵（トークン）を作って貼る
3. 「確かめて、このブラウザに覚えさせる」を押す

- 鍵は、チャット・メール・ファイルに書かない。自分のパソコン・スマホだけで使う
- 鍵の期限（1年）が切れたら、同じ手順で作り直す
- パソコンとスマホの両方で使うときは、それぞれで1回ずつ行う

### 直す手順
1. **https://toco-works.com/edit/** を開く
2. 左で、直したいページを選ぶ
3. 真ん中の入力欄で直す。右の下見がすぐ変わる
   - 各ブロックの「下見で見る」で、下見のその部分へ移動する
   - 「↑」「↓」で並びかえ、「複製」でコピー、「削除」で消す
   - いちばん下の「ブロックを追加」で、新しいブロックを入れる
4. 右上の **「保存して公開する」** を押す
5. 1〜2分待って、サイトを開いて確かめる

### 困ったとき
- **直したのにサイトが変わらない**：2分待って、ページを読み込み直す。それでも変わらないときは、アドレスの最後に `?check` を付けて開く（例：`https://toco-works.com/?check`）。書き方の注意が画面の下に出る
- **まちがえて保存した**：前の版が GitHub に残っている。チャットで Claude に「サイトを前の版に戻したい」と伝える
- **編集の途中で閉じた**：途中の内容は、同じブラウザに残っている。編集ツールを開き直すと続きから直せる（別のパソコンやスマホには残らない）
- **「鍵が正しくないか、期限が切れています」と出た**：「保存の準備」をやり直す
- **鍵を使いたくない**：鍵がなくても直せる。「保存して公開する」を押すと、中身をコピーして GitHub に貼る手順が出る（画像とページの追加は、鍵が要る）
- **プライバシーポリシー・特定商取引法の表記を変えるとき**：決まりごとの文なので、先に Claude に相談する。住所・電話・メールを変えたら Claude にも伝える（ほかの書類も直すため）

### 守ること
- 本名、自宅が分かる情報、子どもの情報を書かない
- 人の顔や、自宅・学校が分かる画像は入れない（位置情報は、編集ツールが自動で消す）
- 公開していないアプリの名前は、公開を決めるまで書かない

## しくみ（Claude・開発者向け）
| パス | 役割 |
|---|---|
| `text/common.txt` | 全ページ共通（屋号・メール・上と下のメニュー・ページ一覧） |
| `text/<名前>.txt` | 各ページの中身（`home`＝トップ、`contact`、`privacy`、`tokushoho`） |
| `assets/site.js` | `.txt` を読んで画面を組み立てる。ブロックの種類と項目の表（SCHEMA）もここ |
| `assets/budoux-ja.js` | 文節の切れ目に改行の候補を入れる（BudouX v0.9.3、Apache-2.0） |
| `assets/site.css` | 見た目 |
| `edit/`、`assets/edit.js`、`assets/edit.css` | 編集ツール。保存は GitHub の API（`PUT /repos/toco-works/toco-works.github.io/contents/...`）。鍵はブラウザの localStorage にだけ置く |
| `edit/page-template.txt` | 編集ツールが新しいページを作るときの土台 |
| `index.html`、`<名前>/index.html` | ページの土台。中の文は `.txt` の写し（読み込めないとき・検索用） |
| `assets/img/` | サイトで使う画像 |
| `404.html` | ページがないとき |
| `CNAME` | 独自ドメインの指定（`toco-works.com`）。**消さない** |
| `.nojekyll` | GitHub の自動変換を止める。**消さない** |

- **`text/`・`assets/img/`・追加したページの正は GitHub（公開中）**。オーナーが編集ツールで直すので、Claude は作業の前に必ず公開中の中身を取り込む：
  `node tools\pptx\site-bake.js <このフォルダ> --pull`（sns-business で実行。text の取り込み → 写しの作り直し）
- オーナーにファイルの上げ直しを頼むときは、**`text` フォルダを含めない**（オーナーの直しを上書きしないため）。文を変えたいときは、編集ツールで直してもらうか、変える行を伝える
- `.txt` の書き方：`【ブロック名】`、`項目: 値`、カードなどの1件の区切りは `---`、`#` で始まる行は説明。HTML は書けない（文字として出る）
- 新しいページ（Claude が作るとき）：`node tools\pptx\site-bake.js <このフォルダ> --new <名前> <題名>`
- 動作確認：`node tools\pptx\site-test.js <このフォルダ> <出力フォルダ>`（GitHub への保存は、にせの応答で試す）
- 事業者情報（屋号・住所・電話・メール）の正は `../sns-business/00_strategy/owner_profile.md`
- 文章のルール：です・ます、断定しない、本名を書かない（運営責任者は「請求があれば開示」）
- アプリごとのサポート・プライバシーポリシーのページは、まだない。各アプリの公開準備のときに足す（このファイルは公開リポジトリに入るので、公開前のアプリの名前は書かない）
- 編集ツールの画面の形（左に一覧・真ん中に入力欄・右に下見・上に保存）は、オーナーが使い慣れた別の編集ツールにならった。コード・文言・素材は使っていない

## 公開の設定（済み。2026-09-29〜30）
- GitHub：Organization **toco-works**（tocoworks ではない。https://github.com/toco-works ）、リポジトリ `toco-works.github.io`（Public）、Settings → Pages は「Deploy from a branch」・`main`・`/ (root)`、Custom domain `toco-works.com`、Enforce HTTPS
- Cloudflare の DNS（どれもプロキシはオフ＝灰色の雲）：A `@` → `185.199.108.153`／`185.199.109.153`／`185.199.110.153`／`185.199.111.153`、CNAME `www` → `toco-works.github.io`。メール転送の行はそのまま残す

### ファイルをまとめて上げ直すとき（デザインやしくみを変えたとき。オーナーの作業）
1. https://github.com/toco-works/toco-works.github.io を開く
2. 「Add file」→「Upload files」
3. Claude が伝えたファイル・フォルダを、エクスプローラーからドラッグ＆ドロップ
4. 下の緑の「Commit changes」

## 根拠（確認日 2026-09-30）
- GitHub Docs「GitHub Pages サイトのカスタム ドメインを管理する」 https://docs.github.com/ja/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site （確認日 2026-09-29）
- GitHub Docs「Managing your personal access tokens」（fine-grained token の作り方。組織が承認を必要とする設定のときは、鍵が pending になる） https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub Docs「REST API endpoints for repository contents」（取得は Contents の read、作成・更新は Contents の write） https://docs.github.com/en/rest/repos/contents
- 未確認：Organization「toco-works」の fine-grained token の承認設定（鍵を作ったあと「pending」と出たら、Organization の Settings → Personal access tokens で承認する）

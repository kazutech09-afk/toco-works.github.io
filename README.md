# tocoworks-site：toco-works.com のサイト（4事業共通）

Toco Works の公開ページの元ファイル。GitHub Pages（Organization「toco-works」のリポジトリ `toco-works.github.io`）に置き、独自ドメイン `toco-works.com` で表示する。作成 2026-09-29（sns-business ボード o33）。Organization は 2026-09-29 に **toco-works** という名前で作成済み（tocoworks ではない。https://github.com/toco-works ）。

## 中身
| パス | ページ | 状態 |
|---|---|---|
| `index.html` | トップ（アプリ一覧・問い合わせへの導線） | 公開できる |
| `contact/` | お問い合わせ（info@toco-works.com へのメール） | 公開できる |
| `privacy/` | プライバシーポリシー（サイトとお問い合わせの分） | 公開できる |
| `tokushoho/` | 特定商取引法に基づく表記（有料機能を売るときに必要。検索には出さない設定） | 公開できる。住所・電話は owner_profile の事業者情報のとおり |
| `404.html` | ページがないとき | 公開できる |
| `assets/site.css` | 見た目 | ― |
| `CNAME` | 独自ドメインの指定（`toco-works.com`）。**消さない** | ― |
| `.nojekyll` | GitHub の自動変換を止める | ― |
| `eisei2/`・`licol/` など | アプリごとのサポート・プライバシーポリシー | **まだない**。各アプリの公開準備（shikaku-apps S1-38、wishlist-app W1-35）で足す |

- 事業者情報（屋号・住所・電話・メール）の正は `../sns-business/00_strategy/owner_profile.md`。変わったらここも直す
- 文章のルール：です・ます、断定しない、本名を書かない（運営責任者は「請求があれば開示」）

## 公開のしかた（オーナーの作業。ブラウザだけで約15分）
### A. GitHub に置く
1. github.com にログイン（アカウント kazutech09-afk）
2. 済み（2026-09-29）：Organization「toco-works」は作成済み。作り直さない
3. Organization のページ（https://github.com/toco-works ）→「Repositories」タブ →「New repository」→ Repository name に **`toco-works.github.io`**（組織名と同じつづり。この名前でないと表示されない）→「Public」→「Create repository」
4. 「uploading an existing file」の文字をクリック → このフォルダ（tocoworks-site）の中身を**全部**（`index.html`・`CNAME`・`.nojekyll`・`assets` などのフォルダごと）ドラッグ＆ドロップ → 下の「Commit changes」
   - フォルダごとドラッグできないときは、`assets`・`contact`・`privacy`・`tokushoho` の中のファイルを1つずつ「Add file」→「Create new file」で作る（名前の欄に `contact/index.html` のように `/` を入れるとフォルダになる）
5. リポジトリの「Settings」→ 左の「Pages」→ Build and deployment の Source が「Deploy from a branch」、Branch が `main` と `/ (root)` になっているのを確認 →「Save」
6. 同じ Pages の画面の「Custom domain」に `toco-works.com` と入れて「Save」。「DNS check」が進む（B が終わるまでは失敗のままでよい）

### B. Cloudflare でサイトの向き先を設定（メール転送とは別の行。転送はそのまま残る）
1. dash.cloudflare.com → toco-works.com → 左「DNS」→「レコード」→「レコードを追加」
2. 次の5行を1行ずつ足す。**どれも「プロキシ ステータス」はオフ（灰色の雲＝DNS のみ）**にする（オレンジのままだと GitHub の証明書が作れない）
   | 種類 | 名前 | 内容 |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `toco-works.github.io` |
3. 10分〜1時間待つ → GitHub の Settings → Pages に戻り、「DNS check successful」になったら「Enforce HTTPS」にチェック
4. ブラウザで https://toco-works.com/ を開いて表示されたら完了。チャットに「サイト出た」と送る

### 直したいとき
- Claude に「トップの文言を〜に」などと伝える → Claude がこのフォルダのファイルを直す → オーナーが GitHub のリポジトリで該当ファイルを開き「編集（鉛筆）」→ 中身を貼り替えて「Commit changes」（または、直したファイルをもう一度ドラッグ＆ドロップで上書き）

根拠（確認日 2026-09-29）：GitHub Docs「GitHub Pages サイトのカスタム ドメインを管理する」 https://docs.github.com/ja/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site （A レコード4つ・www は `<organization>.github.io`）

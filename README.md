# SaiKai MVP

外部AIとの会話を「再開しやすい対話ノート」に変換して保存する、Next.js ベースの初期版です。初期表示にサンプルノートは入れず、空の書庫から使い始める前提です。

## セットアップ

1. Node.js 20 以上を用意します。
2. 依存関係を入れます。

```bash
npm install
```

3. 任意で `.env.local` を作成します。

```bash
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-5.4-mini
```

API キー未設定でも、フォールバック生成でアプリ全体は動作します。

LLM 生成を使いたい場合は、プロジェクト直下で次のように `.env.local` を作成してください。

```bash
cp .env.example .env.local
```

その後、`.env.local` を開いて `OPENAI_API_KEY` を設定します。

`.env.local` は API キーのような秘密情報を入れるローカル専用ファイルです。Git にコミットせず、自分の端末だけで持つ前提で使ってください。

## 起動方法

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## OpenAI API 設定

- OpenAI 呼び出しはクライアントから直接行わず、[`app/api/notes/generate/route.ts`](/Users/yuga/github/SaiKai/app/api/notes/generate/route.ts) 経由でサーバー側から実行します。
- 実処理は [`lib/openai/client.ts`](/Users/yuga/github/SaiKai/lib/openai/client.ts) と [`lib/openai/generate-note.ts`](/Users/yuga/github/SaiKai/lib/openai/generate-note.ts) に分離しています。
- モデルは `OPENAI_MODEL` で切り替えでき、未指定時は `gpt-5.4-mini` を使います。
- API キー未設定、API 失敗、Structured Output の検証失敗時は自動でフォールバック生成に切り替わります。

## 保存前の再生成ルール

- 初回生成は `ノート化する`、2回目以降は `再生成する` を明示的に押した時だけ API を呼びます。
- 初回生成後は、タイトル・カテゴリ・タグ・問い・答えの要点・残った疑問・再開用プロンプト下書きをローカル編集して保存できます。
- 保存前の再生成は最大 3 回までです。初回生成はこの回数に含みません。
- 再生成のたびに 10 秒のクールダウンが入り、その間は再生成ボタンが無効になります。
- `OPENAI_API_KEY` が未設定の場合は、初回生成・再生成ともに自動でフォールバック生成になります。

## 主な機能

- 会話テキストの貼り付け取り込み
- LLM またはルールベースによるノート自動生成
- 保存前プレビューと軽微修正
- プリセット候補を使いつつ、カテゴリを自由入力して保存可能
- カード中心のノート一覧
- 検索、並び替え、カテゴリ絞り込み
- 複数選択でゴミ箱へ移動
- ノート詳細と再開用プロンプトのコピー
- ゴミ箱復元と残り日数表示

## 主要ディレクトリ構成

```text
app/
  api/generate-note/route.ts   # ノート生成API
  import/page.tsx              # 取り込み画面
  notes/[id]/page.tsx          # 詳細画面
  trash/page.tsx               # ゴミ箱画面
  page.tsx                     # 書庫画面
components/                    # 再利用UIと画面コンポーネント
lib/                           # 型、定数、生成ロジック、初期データ
providers/                     # クライアント状態管理
repositories/                  # 永続化インターフェースと localStorage 実装
```

## データ保存

- 現在は `localStorage` に保存します。
- 将来の Supabase 等への移行に備え、`repositories/` を分離しています。
- ユーザーノートはブラウザごとに保持され、別ブラウザや別端末には自動同期されません。
- 書庫画面の `JSONを書き出す` から、現在のノート一式をエクスポートできます。

## GitHub 公開前チェックリスト

- `.env.local` をコミットしていないことを確認する
- OpenAI API キーを README やコードに直接書いていないことを確認する
- `git status` に `.env.local` が出てこないことを確認する
- ユーザーデータは現在 `localStorage` 保存であり、ブラウザ依存であることを README に明記する
- OpenAI API 利用時は会話内容が API に送信されることを README に明記する
- デモ用のノートや会話に個人情報が入っていないことを確認する
- 公開前に `JSONを書き出す` でバックアップできることを確認する
- `npm run build` が通ることを確認する

## 公開時の注意

- このアプリは現在、サーバーDBではなくブラウザの `localStorage` にノートを保存します。
- そのため、ブラウザのデータ削除や端末変更でノートが見えなくなることがあります。
- LLM 生成や Session 追加時の整理で OpenAI API を使う場合、会話内容はサーバー側経由で OpenAI API に送信されます。
- 機密性の高い会話を扱う場合は、公開前に利用ポリシーや注意書きを別途整えることをおすすめします。

## トークン節約方針

- 生成 API は保存前のノート化時だけ呼びます。
- 圧縮処理は [`lib/openai/compression.ts`](/Users/yuga/github/SaiKai/lib/openai/compression.ts) に集約しています。
- 圧縮は次の優先順です。
  - `existing-note-diff`: 既存ノート要約 + 今回の差分会話
  - `recent-turns`: 直近 N ターン
  - `hard-trim`: 上限文字数に収まるよう末尾切り詰め
  - `full-chat`: 圧縮不要時
- 現状の上限は文字数ベースですが、将来 token counting へ差し替えやすい構造にしています。

## 今後の拡張方針

- 認証とクラウド保存
- 外部AIサービスへの直接送信
- 類似ノート統合
- 高度な検索とフィルタ
- ボード表示やアーカイブ強化

## 動作確認の観点

- 取り込み画面で会話を貼り付け、ノート化できる
- 生成結果の右上付近に `LLM生成` と表示されることを確認する
- 圧縮方式と送信文字数の目安が表示されることを確認する
- タイトル、カテゴリ、タグを修正して保存できる
- 書庫で検索、並び替え、複数選択のゴミ箱移動ができる
- 詳細画面でプロンプトコピーとタイトル再保存ができる
- ゴミ箱で復元と一括削除ができる

## 補足

- `OPENAI_API_KEY` がある場合は server-side で LLM 生成を試み、失敗時は自動でフォールバックに切り替えます。
- 新規の推奨エンドポイントは `/api/notes/generate` です。既存の `/api/generate-note` も互換用に残しています。

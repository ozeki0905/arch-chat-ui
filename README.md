# 建築検討アシスタント (Arch Chat UI)

タンク基礎設計を中心とした建築プロジェクトの検討を支援するAIチャットアプリケーションです。

## 機能

- 対話型AIアシスタントによる設計支援
- PostgreSQLによるプロジェクトデータの永続化
- エージェントベースの情報抽出・整理
- タンク基礎設計の自動計算
- プロジェクト履歴管理

## 必要な環境

- Node.js 18.x 以上
- PostgreSQL 14.x 以上
- OpenAI API キー (GPT-5モデルへのアクセス権限)

## セットアップ

### 1. 環境変数の設定

`.env.local.example`を`.env.local`にコピーして、必要な情報を入力してください：

```bash
cp .env.local.example .env.local
```

`.env.local`を編集：
```
# OpenAI API Key
OPENAI_API_KEY=your-actual-openai-api-key

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/arch_chat_db
```

### 2. データベースのセットアップ

PostgreSQLにデータベースを作成：

```bash
createdb arch_chat_db
```

スキーマを適用：

```bash
psql arch_chat_db < src/lib/schema.sql
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## トラブルシューティング

### データベース接続エラー

1. PostgreSQLが起動していることを確認
2. `.env.local`の接続情報が正しいことを確認
3. データベースとテーブルが作成されていることを確認

ヘルスチェック：
```
curl http://localhost:3000/api/health
```

### OpenAI APIエラー

1. APIキーが正しく設定されていることを確認
2. APIキーがGPT-5モデルへのアクセス権限を持っていることを確認

## 開発

### ビルド

```bash
npm run build
```

### 型チェック

```bash
npm run typecheck
```

### リント

```bash
npm run lint
```

## ライセンス

[MIT](LICENSE)
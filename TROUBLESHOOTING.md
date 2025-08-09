# トラブルシューティングガイド

## "Failed to create project" エラー

このエラーは、新しいプロジェクトをデータベースに保存しようとした際に発生します。

### 1. データベース接続の確認

まず、データベース接続をテストします：

```bash
# ヘルスチェック
curl http://localhost:3000/api/health

# 詳細なデータベーステスト
curl http://localhost:3000/api/debug/db-test
```

期待される結果：
```json
{
  "healthy": true,
  "connection": true,
  "tables": {
    "projects": true,
    "sites": true,
    // ... 他のテーブル
  }
}
```

### 2. 環境変数の確認

`.env.local`ファイルが正しく設定されているか確認：

```bash
# .env.localが存在することを確認
ls -la .env.local

# 必要な環境変数が設定されているか確認（パスワードは表示されません）
grep -E "DATABASE_URL|PGHOST|PGDATABASE|OPENAI_API_KEY" .env.local
```

### 3. データベースが存在しない場合

```bash
# PostgreSQLにログイン
psql -U postgres

# データベースを作成
CREATE DATABASE arch_chat_db;

# 権限を付与（必要に応じて）
GRANT ALL PRIVILEGES ON DATABASE arch_chat_db TO your_username;

# 終了
\q
```

### 4. テーブルが存在しない場合

```bash
# スキーマを適用
psql -U your_username -d arch_chat_db < src/lib/schema.sql
```

### 5. プロジェクト作成のテスト

最小限のデータでプロジェクト作成をテスト：

```bash
# テスト用エンドポイントを使用
curl -X POST http://localhost:3000/api/debug/test-create-project
```

### 6. ブラウザの開発者ツールでデバッグ

1. Chrome/Firefox の開発者ツールを開く（F12）
2. 「Network」タブを選択
3. チャットでメッセージを送信
4. `/api/projects` へのリクエストを探す
5. レスポンスの詳細を確認

赤いステータスコードが表示される場合：
- **404**: APIエンドポイントが見つからない
- **400**: 必須フィールドが不足
- **500**: サーバー内部エラー（通常はデータベース関連）
- **503**: データベース接続不可

### 7. よくある原因と解決策

#### PostgreSQLが起動していない
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
net start postgresql
```

#### 権限エラー
```sql
-- PostgreSQLで実行
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

#### ポート競合
`.env.local`で異なるポートを指定：
```
PGPORT=5433
```

### 8. ログの確認

サーバーコンソールで詳細なエラーメッセージを確認：

```bash
# 開発サーバーを再起動して、ログを確認
npm run dev
```

#### 重要なログメッセージ

1. **Transaction failed**: データベーストランザクションエラーの詳細
   - `code`: PostgreSQLエラーコード
   - `detail`: 具体的なエラー詳細
   - `hint`: 解決のヒント

2. **DataAgent logs**:
   - `DataAgent.buildDesignInput`: データ構築の詳細
   - `DataAgent.createProject - Request data`: 送信されるデータ
   - `[FETCH] Request/Response`: HTTPリクエストの詳細

3. **API logs**:
   - `Starting project transaction`: トランザクション開始
   - `Failed to create project - Full error`: 完全なエラー詳細

#### PostgreSQLエラーコード

- `23502`: NOT NULL制約違反
- `23503`: 外部キー制約違反
- `23505`: UNIQUE制約違反
- `42P01`: テーブルが存在しない
- `3D000`: データベースが存在しない
- `08001`: 接続エラー

エラーメッセージに以下が含まれる場合：
- `ECONNREFUSED`: PostgreSQLが起動していない
- `ENOTFOUND`: ホスト名が間違っている
- `EACCES`: 権限不足
- `relation "projects" does not exist`: テーブルが作成されていない

### 8.1 詳細なデータベーステスト

```bash
# データベース接続と構造をテスト
curl http://localhost:3000/api/debug/test-db-direct
```

このエンドポイントは以下をテストします：
- データベース接続
- テーブルの存在
- テーブル構造
- INSERT権限
- UUID拡張機能

### 9. 完全リセット（最終手段）

```bash
# データベースを削除して再作成
dropdb arch_chat_db
createdb arch_chat_db
psql arch_chat_db < src/lib/schema.sql

# node_modulesを削除して再インストール
rm -rf node_modules
npm install

# .nextディレクトリを削除
rm -rf .next

# 開発サーバーを再起動
npm run dev
```

## その他のエラー

### OpenAI APIエラー

```bash
# APIキーが設定されているか確認
echo $OPENAI_API_KEY

# .env.localに設定
echo "OPENAI_API_KEY=your-key-here" >> .env.local
```

### TypeScriptエラー

```bash
# 型チェック
npm run typecheck

# 型定義を再生成
npm run build
```

## サポート

問題が解決しない場合は、以下の情報を添えてイシューを作成してください：

1. `curl http://localhost:3000/api/debug/db-test` の結果
2. ブラウザコンソールのエラーメッセージ
3. サーバーコンソールのエラーメッセージ
4. 実行した手順
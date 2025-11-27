# インターフェース仕様書 - VanishToDo

## 5.3 API仕様

### 5.3.1 API概要

#### ベースURL
- **開発環境**: `http://localhost:8787`
- **本番環境**: `https://api.vanishtodo.lulliecat.com` (Cloudflare Workers)

#### バージョニング方針
- URL パスベースのバージョニング: `/api/v1/`
- 初期バージョンは `v1`、破壊的変更がある場合は `v2` に移行

#### 認証方式
- **Cloudflare Access**: Email OTP認証
- Workers内では、ユーザーは一人しかいないので、ユーザーは一意に識別できる
  - 将来はマジックリンク+JWTによるセッション管理を行うが、今回は範囲外
- APIリクエストには追加の認証ヘッダーは不要

#### API設計思想

このAPIは**純粋なCRUD操作**として設計されています：
- **Create**: POST /api/v1/tasks
- **Read**: GET /api/v1/tasks, GET /api/v1/tasks/:id
- **Update**: PUT /api/v1/tasks/:id
- **Delete**: DELETE /api/v1/tasks/:id

タスクの完了・復帰・論理削除などのビジネスロジックは、すべてフロントエンド側で`TaskUpdateInput`を使用して実装します。

#### 共通レスポンス形式
- レスポンスボディの共通型は`ApiResponse`型
- statusフィールドにより成功か失敗かを判断できる

**成功時:** ApiSuccessResponse型
```json
{
  "status": "success",
  "data": { /* 実際のデータ */ }
}
```

**エラー時:** ApiFailResponse型
```json
{
  "status": "fail",
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ（日本語）",
    "details": { /* 追加情報（オプション） */ }
  }
}
```

detailsは`Record<string, string>`で、keyに指定された名前のフィールドに対して、valueに設定されたエラー原因を示す。

#### 日付・日時のフォーマット
- すべての日付・日時フィールドはISO 8601形式の文字列として表現
- タイムゾーンはUTC（末尾に`Z`を付与）
- **例**: `"2025-11-15T10:00:00Z"`

#### エラーコード一覧

| エラーコード | HTTPステータス | 説明 |
|------------|--------------|------|
| VALIDATION_ERROR | 400 | 入力バリデーションエラー |
| NOT_FOUND | 404 | リソースが見つからない |
| CONFLICT | 409 | 楽観的ロック競合 |
| INTERNAL_ERROR | 500 | サーバー内部エラー |
| LLM_UNAVAILABLE | 503 | LLM APIが利用不可 |

#### レート制限
- Cloudflare Workers無料枠: 100,000リクエスト/日
- Workers AI無料枠: 10,000ニューロン/日
- 実装上の制限: 特に設定しない（無料枠の範囲内で運用）

---

### 5.3.2 エンドポイント一覧

| ID | メソッド | パス | 概要 |
|----|---------|------|------|
| API-001 | GET | /api/v1/tasks | タスク一覧取得 |
| API-002 | GET | /api/v1/tasks/:id | タスク単体取得 |
| API-003 | POST | /api/v1/tasks | タスク作成 |
| API-004 | PUT | /api/v1/tasks/:id | タスク更新（完了・復帰・論理削除含む） |
| API-005 | DELETE | /api/v1/tasks/:id | タスク削除（物理削除） |
| API-006 | POST | /api/v1/tasks/analyze | タスク解析（LLM） |
| API-007 | GET | /api/v1/settings | ユーザー設定取得 |
| API-008 | PUT | /api/v1/settings | ユーザー設定更新 |

### 5.3.3 エンドポイント定義

#### API-001: タスク一覧取得

| 項目 | 内容 |
|------|------|
| **エンドポイントID** | API-001 |
| **エンドポイント** | `/api/v1/tasks` |
| **HTTPメソッド** | GET |
| **概要** | ユーザーの全タスクを取得する<br>デフォルトでは削除済みタスク（`isDeleted = true`）は含まない |
| **対応する要件ID** | FR-2.1, FR-2.4, FR-3.4 |
| **認証** | Cloudflare Access認証済みユーザー |

**リクエスト:**

- **パスパラメータ**: なし
- **クエリパラメータ**: なし
- **リクエストヘッダー**: なし
- **リクエストボディ**: なし

**レスポンス:**
- **成功時（200 OK）**: ApiTasks型
  ```json
  {
    "status": "success",
    "data": {
      "type": "tasks",
      "tasks": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "メールを確認する",
          "weight": "light",
          "dueDate": null,
          "completedAt": null,
          "isDeleted": false,
          "version": 1,
          "createdAt": "2025-11-15T10:00:00Z",
          "updatedAt": "2025-11-15T10:00:00Z"
        }
      ]
    }
  }
  ```

  **フィールド説明:**
  | フィールド | 型 | 説明 |
  |----------|-----|------|
  | id | string | タスクID（UUID） |
  | title | string | タスクのタイトル |
  | weight | string \| null | タスクの重さ（"light" \| "medium" \| "heavy" \| null） |
  | dueDate | string \| null | 締切日（ISO 8601形式、またはnull） |
  | completedAt | string \| null | 完了日時（ISO 8601形式、nullの場合は未完了） |
  | isDeleted | boolean | 削除フラグ |
  | version | number | 楽観的ロック用バージョン番号 |
  | createdAt | string | 作成日時（ISO 8601形式） |
  | updatedAt | string | 更新日時（ISO 8601形式） |

- **エラー時**:
  - **500 Internal Server Error**: サーバーエラー

---

#### API-002: タスク単体取得

| 項目 | 内容 |
|------|------|
| **エンドポイントID** | API-002 |
| **エンドポイント** | `/api/v1/tasks/{taskId}` |
| **HTTPメソッド** | GET |
| **概要** | 指定されたIDのタスクを取得する |
| **対応する要件ID** | FR-2.1 |
| **認証** | Cloudflare Access認証済みユーザー |

**リクエスト:**

- **パスパラメータ**:

  | パラメータ名 | 型 | 説明 |
  |------------|-----|------|
  | taskId | string | 取得対象のタスクID（UUID） |

- **クエリパラメータ**: なし
- **リクエストヘッダー**: なし
- **リクエストボディ**: なし

**レスポンス:**
- **成功時（200 OK）**: ApiTask型
  ```json
  {
    "status": "success",
    "data": {
      "type": "task",
      "task": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "メールを確認する",
        "weight": "light",
        "dueDate": null,
        "completedAt": null,
        "isDeleted": false,
        "version": 1,
        "createdAt": "2025-11-15T10:00:00Z",
        "updatedAt": "2025-11-15T10:00:00Z"
      }
    }
  }
  ```

- **エラー時**:
  - **404 Not Found**: タスクが見つからない
  - **500 Internal Server Error**: サーバーエラー

---

#### API-003: タスク作成

| 項目 | 内容 |
|------|------|
| **エンドポイントID** | API-003 |
| **エンドポイント** | `/api/v1/tasks` |
| **HTTPメソッド** | POST |
| **概要** | 新しいタスクを作成する<br>`id`, `version`, `createdAt`, `updatedAt`はサーバー側で自動生成 |
| **対応する要件ID** | FR-1.1 |
| **認証** | Cloudflare Access認証済みユーザー |

**リクエスト:**

- **パスパラメータ**: なし
- **クエリパラメータ**: なし
- **リクエストヘッダー**:
  - `Content-Type: application/json`

- **リクエストボディ**: TaskCreateInput型
  ```json
  {
    "title": "メールを確認する",
    "weight": "light"
  }
  ```

  | フィールド | 型 | 必須 | バリデーション | 説明 |
  |----------|-----|------|---------------|------|
  | title | string | ◯ | 1-500文字 | タスクのタイトル |
  | weight | string \| null | × | "heavy" \| "medium" \| "light" \| null | タスクの重さ（省略時null） |
  | dueDate | string \| null | × | ISO 8601形式の日付、または null | 締切日（省略時null） |

  **バリデーションルール**:
  - `weight` と `dueDate` を同時に設定することはできない（どちらか一方のみ、または両方null/undefined）
  - `dueDate` は本日以降の日付のみ

**レスポンス:**

- **成功時（201 Created）**: ApiTask型
  ```json
  {
    "status": "success",
    "data": {
      "type": "task",
      "task": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "メールを確認する",
        "weight": "light",
        "dueDate": null,
        "completedAt": null,
        "isDeleted": false,
        "version": 1,
        "createdAt": "2025-11-15T10:00:00Z",
        "updatedAt": "2025-11-15T10:00:00Z"
      }
    }
  }
  ```

- **エラー時**:
  - **400 Bad Request**: バリデーションエラー
  - **500 Internal Server Error**: サーバーエラー

---

#### API-004: タスク更新

| 項目 | 内容 |
|------|------|
| **エンドポイントID** | API-004 |
| **エンドポイント** | `/api/v1/tasks/{taskId}` |
| **HTTPメソッド** | PUT |
| **概要** | 既存のタスクを更新する<br>タスクの完了・復帰・論理削除もこのエンドポイントで実施 |
| **対応する要件ID** | FR-2.4, FR-3.1, FR-3.2, FR-3.5 |
| **認証** | Cloudflare Access認証済みユーザー |

**リクエスト:**

- **パスパラメータ**:

  | パラメータ名 | 型 | 説明 |
  |------------|-----|------|
  | taskId | string | 更新対象のタスクID（UUID） |

- **クエリパラメータ**: なし
- **リクエストヘッダー**:
  - `Content-Type: application/json`

- **リクエストボディ**: TaskUpdateInput型
  ```json
  {
    "title": "メールを確認して返信する",
    "weight": "medium",
    "dueDate": null,
    "completedAt": null,
    "isDeleted": false,
    "version": 1
  }
  ```

  | フィールド | 型 | 必須 | バリデーション | 説明 |
  |----------|-----|------|---------------|------|
  | title | string | ◯ | 1-500文字 | タスクのタイトル |
  | weight | string \| null | × | "heavy" \| "medium" \| "light" \| null | タスクの重さ |
  | dueDate | string \| null | × | ISO 8601形式の日付、または null | 締切日 |
  | completedAt | string \| null | × | ISO 8601形式の日時、または null | 完了日時（nullでない場合は完了状態） |
  | isDeleted | boolean | ◯ | true \| false | 削除フラグ |
  | version | number | ◯ | 正の整数 | 楽観的ロック用のバージョン番号 |

  **バリデーションルール**:
  - `weight` と `dueDate` を同時に設定することはできない

**レスポンス:**

- **成功時（200 OK）**: ApiTask型
  ```json
  {
    "status": "success",
    "data": {
      "type": "task",
      "task": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "メールを確認して返信する",
        "weight": "medium",
        "dueDate": null,
        "completedAt": null,
        "isDeleted": false,
        "version": 2,
        "createdAt": "2025-11-15T10:00:00Z",
        "updatedAt": "2025-11-15T10:05:00Z"
      }
    }
  }
  ```

- **エラー時**:
  - **400 Bad Request**: バリデーションエラー
  - **404 Not Found**: タスクが見つからない
  - **409 Conflict**: 楽観的ロック競合
  - **500 Internal Server Error**: サーバーエラー

---

#### API-005: タスク削除

| 項目 | 内容 |
|------|------|
| **エンドポイントID** | API-005 |
| **エンドポイント** | `/api/v1/tasks/{taskId}` |
| **HTTPメソッド** | DELETE |
| **概要** | タスクを物理削除する<br>論理削除は`PUT /api/v1/tasks/:id`で`isDeleted`を`true`に設定 |
| **対応する要件ID** | FR-3.2 |
| **認証** | Cloudflare Access認証済みユーザー |

**リクエスト:**

- **パスパラメータ**:

  | パラメータ名 | 型 | 説明 |
  |------------|-----|------|
  | taskId | string | 削除対象のタスクID（UUID） |

- **クエリパラメータ**: なし
- **リクエストヘッダー**:
  - `Content-Type: application/json`

- **リクエストボディ**: TaskDeleteInput型
  ```json
  {
    "version": 1
  }
  ```

  | フィールド | 型 | 必須 | 説明 |
  |----------|-----|------|------|
  | version | number | ◯ | 楽観的ロック用のバージョン番号 |

**レスポンス:**

- **成功時（204 No Content）**: レスポンスボディなし

- **エラー時**:
  - **404 Not Found**: タスクが見つからない
  - **409 Conflict**: 楽観的ロック競合
  - **500 Internal Server Error**: サーバーエラー

**注意事項:**
- このエンドポイントは物理削除を実行するため、通常は使用しない
- UI上での「削除」操作は、`PUT /api/v1/tasks/:id`で`isDeleted: true`にすることで実装
- 自動クリーンアップで古いタスクを削除する際に使用

---

#### API-006: タスク解析（LLM処理）

| 項目 | 内容 |
|------|------|
| **エンドポイントID** | API-006 |
| **エンドポイント** | `/api/v1/tasks/analyze` |
| **HTTPメソッド** | POST |
| **概要** | 長文メモを複数のタスクに分割・解析する |
| **対応する要件ID** | FR-1.3, FR-1.4 |
| **認証** | Cloudflare Access認証済みユーザー |

**リクエスト:**

- **パスパラメータ**: なし
- **クエリパラメータ**: なし
- **リクエストヘッダー**:
  - `Content-Type: application/json`

- **リクエストボディ**: TaskTitle型
  ```json
  {
    "title": "明日のプレゼン準備\n資料を作成する\nリハーサルをする\n質疑応答の準備"
  }
  ```

  | フィールド | 型 | 必須 | 説明 |
  |----------|-----|------|------|
  | title | string | ◯ | 分割対象のテキスト（1-2000文字） |

**レスポンス:**

- **成功時（200 OK）**: ApiAnalyze型
  ```json
  {
    "status": "success",
    "data": {
      "type": "analyze",
      "tasks": [
        {
          "title": "プレゼン資料を作成する",
          "weight": "heavy"
        },
        {
          "title": "プレゼンのリハーサルをする",
          "weight": "medium"
        },
        {
          "title": "質疑応答の準備をする",
          "weight": "medium"
        }
      ]
    }
  }
  ```

  **注意**: 返却される`tasks`は`TaskInput`型（`TaskCreateInput`と同じ構造）なので、そのまま`POST /api/v1/tasks`で作成可能

- **エラー時**:
  - **400 Bad Request**: バリデーションエラー
  - **503 Service Unavailable**: LLM APIが利用不可
  - **500 Internal Server Error**: サーバーエラー

---

#### API-007: ユーザー設定取得

| 項目 | 内容 |
|------|------|
| **エンドポイントID** | API-007 |
| **エンドポイント** | `/api/v1/settings` |
| **HTTPメソッド** | GET |
| **概要** | ユーザーの設定を取得する |
| **対応する要件ID** | FR-2.3 |
| **認証** | Cloudflare Access認証済みユーザー |

**リクエスト:**

- **パスパラメータ**: なし
- **クエリパラメータ**: なし
- **リクエストヘッダー**: なし
- **リクエストボディ**: なし

**レスポンス:**

- **成功時（200 OK）**: ApiUserSettings型
  ```json
  {
    "status": "success",
    "data": {
      "type": "settings",
      "settings": {
        "id": "user-001",
        "dailyGoals": {
          "heavy": 1,
          "medium": 2,
          "light": 3
        },
        "displayLimits": {
          "heavy": 3,
          "medium": 5,
          "light": 5
        },
        "createdAt": "2025-11-01T00:00:00Z",
        "updatedAt": "2025-11-15T10:00:00Z"
      }
    }
  }
  ```

- **エラー時**:
  - **500 Internal Server Error**: サーバーエラー

---

#### API-008: ユーザー設定更新

| 項目 | 内容 |
|------|------|
| **エンドポイントID** | API-008 |
| **エンドポイント** | `/api/v1/settings` |
| **HTTPメソッド** | PUT |
| **概要** | ユーザーの設定を更新する |
| **対応する要件ID** | FR-2.3 |
| **認証** | Cloudflare Access認証済みユーザー |

**リクエスト:**

- **パスパラメータ**: なし
- **クエリパラメータ**: なし
- **リクエストヘッダー**:
  - `Content-Type: application/json`

- **リクエストボディ**: UserSettingsUpdate型
  ```json
  {
    "dailyGoals": {
      "heavy": 2,
      "medium": 3,
      "light": 5
    },
    "displayLimits": {
      "heavy": 5,
      "medium": 7,
      "light": 10
    }
  }
  ```

  | フィールド | 型 | 必須 | バリデーション | 説明 |
  |----------|-----|------|---------------|------|
  | dailyGoals | object | × | - | 日次目標の設定 |
  | dailyGoals.heavy | number | × | 0-10 | 重タスク目標数 |
  | dailyGoals.medium | number | × | 0-10 | 中タスク目標数 |
  | dailyGoals.light | number | × | 0-10 | 軽タスク目標数 |
  | displayLimits | object | × | - | 表示上限の設定 |
  | displayLimits.heavy | number | × | 1-20 | 重タスク表示上限 |
  | displayLimits.medium | number | × | 1-20 | 中タスク表示上限 |
  | displayLimits.light | number | × | 1-20 | 軽タスク表示上限 |

**レスポンス:**

- **成功時（200 OK）**: ApiUserSettings型
  ```json
  {
    "status": "success",
    "data": {
      "type": "settings",
      "settings": {
        "id": "user-001",
        "dailyGoals": {
          "heavy": 2,
          "medium": 3,
          "light": 5
        },
        "displayLimits": {
          "heavy": 5,
          "medium": 7,
          "light": 10
        },
        "createdAt": "2025-11-01T00:00:00Z",
        "updatedAt": "2025-11-15T10:05:00Z"
      }
    }
  }
  ```

- **エラー時**:
  - **400 Bad Request**: バリデーションエラー
  - **500 Internal Server Error**: サーバーエラー

---


### 5.3.4 エラーレスポンス定義

    ```json
    {
      "status": "fail",
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "入力内容に誤りがあります",
        "details": {
          "title": "タイトルは1-500文字で入力してください"
        }
      }
    }
    ```


|ID| status | cause | code | message | 対応API |
|--|--------|-------|------|---------|---------|
| ERR-001 | 400 Bad Request | 入力バリデーションエラー | VALIDATION_ERROR | 入力内容に誤りがあります | API-003, 004, 006, 008 |
| ERR-002 | 404 Not Found | タスクが見つからない | NOT_FOUND | タスクが見つかりません | API-002, 004, 005 |
| ERR-003 | 409 Conflict | 楽観的ロック競合 | CONFLICT | タスクが他で更新されています。ページをリロードしてください。 | API-004, 005 |
| ERR-004 | 500 Internal Server Erro | サーバー内部エラー | INTERNAL_ERROR | サーバーエラーが発生しました | すべてのAPI |
| ERR-005 | 503 Service Unavailable | LLM API利用不可 | LLM_UNAVAILABLE | AI処理が一時的に利用できません | API-006 |

### 5.3.5 フロントエンド実装パターン

#### Date型とISO 8601 string型の変換
```typescript
// API送信用の変換（Date → ISO 8601 string）
function convertToApiFormat(task: TaskUpdateInput): any {
  return {
    ...task,
    dueDate: task.dueDate?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}

// API受信後の変換（ISO 8601 string → Date）
function convertDates(apiTask: any): Task {
  return {
    ...apiTask,
    dueDate: apiTask.dueDate ? new Date(apiTask.dueDate) : null,
    completedAt: apiTask.completedAt ? new Date(apiTask.completedAt) : null,
    createdAt: new Date(apiTask.createdAt),
    updatedAt: new Date(apiTask.updatedAt),
  };
}
```

---

*本文書は、VanishToDoシステムのAPI仕様を定義し、フロントエンド・バックエンド開発の基盤となるものである。*

*バージョン: 2.0*  
*最終更新: 2025年11月17日*
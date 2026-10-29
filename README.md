# Tickets Platform

團隊內部的 ticket 管理工具：建立工作項目、指派給同事、追蹤進度與死線。
目前是獨立的原型，之後會整合進管理平台。

- **前端**：Vue 3 + Nuxt 4，深色主題
- **後端**：Nuxt 內建的 Nitro server API
- **資料**：暫時存在 JSON 檔（`data/db.json`），之後換成正式資料庫

## 快速開始

需要 Node.js 20 以上。

```bash
npm install      # 安裝套件
npm run seed     # 產生測試資料（第一次一定要執行）
npm run dev      # 開發模式，開啟 http://localhost:3000
```

### 測試資料

`data/db.json` **不在 git 裡**（已加進 `.gitignore`），每個人的資料只存在自己電腦上，clone 下來時沒有這個檔案。

- **第一次 clone 後**：先執行 `npm run seed`，它會建立 `data/` 資料夾並產生測試資料。沒有執行就啟動的話，所有 API 都會回傳 500 錯誤（找不到 `data/db.json`）。
- **想回到初始狀態**：再執行一次 `npm run seed`。這會**覆蓋**整個 `data/db.json`，你自己新增的 ticket、專案、通知都會消失。
- **想保留目前的資料**：重設前先複製一份 `data/db.json`，之後要還原時再複製回去。
- **要新增或修改測試資料**：改 [scripts/seed.mjs](scripts/seed.mjs)，然後執行 `npm run seed`。要讓別人也拿到新的測試資料，commit 的是 `seed.mjs`，不是 `db.json`。
  - 日期請用腳本裡的 `day(offset)`（`YYYY-MM-DD`，例如 `day(2)` 是兩天後）和 `at(offset, 時, 分)`（ISO 時間），不要寫死日期，這樣「快到期」、「已逾期」的情境不管哪天執行都會成立。
  - 使用者 id 是 `u1`（Leo）和 `u2`（Mia）；ticket 的 `id` 不能重複。編號（`code`）不用寫，讀取時會依 `id` 自動算出固定的編號。
  - 資料結構以 [shared/types.ts](shared/types.ts) 為準。

其他指令：

| 指令 | 說明 |
|---|---|
| `npm run build` | 建置正式版到 `.output/` |
| `npm run preview` | 執行建置好的正式版 |
| `npm run seed` | **重設**測試資料（會覆蓋 `data/db.json`，你新增的資料會消失） |

## 功能

操作方式請看網站裡的「使用教學」（左上角 ☰ → 使用教學，`/guide`），原始碼在 [app/pages/guide.vue](app/pages/guide.vue)。**新增或修改功能時，要同步更新那一頁。**

這裡只列開發時需要知道的規則（都會在 server 端檢查）：

- **Ticket**：狀態有待辦 / 進行中 / 已完成；可以歸屬一個專案或「未分類」；可以附 PR 連結（只接受 `http(s)://`）
- **一張 ticket 只有一個負責人**：這是刻意的設計，需要兩個人做就拆成兩張
- **編號**：`TK-` 加 6 碼隨機英數（例如 `TK-7F3K9Q`），給人看和寫在 commit 訊息用。不用 `#數字`，因為 GitHub 會把它當成 issue 連結。內部主鍵 `id` 不顯示給使用者
- **死線**：只有建立者能直接改；被指派者要申請延期，由建立者審核。一次只能有一筆待審核，新日期要晚於目前死線
- **刪除**：刪專案時 ticket 改為未分類，並從通知設定中移除該專案；刪 ticket 時相關通知一起刪掉
- **通知**：指派、延期申請、延期結果是操作當下觸發；快到期 / 逾期是讀取通知時依使用者設定算出來的，條件不成立時未讀的提醒會消失。前端每 30 秒輪詢一次，沒有即時推播或 email

## 測試帳號

目前沒有登入系統，用右上角的「目前身分」切換 **Leo** 和 **Mia**。

執行 `npm run seed` 後的測試情境（日期都以當天為基準）：

| 身分 | 可以測試 |
|---|---|
| Leo | 審核 Mia 對「撰寫 Ticket 系統使用說明」的延期申請；對逾期的「資料庫備份排程檢查」申請延期；因為關注「官網改版」，會收到 Mia 的 ticket 逾期提醒 |
| Mia | 審核 Leo 對「SSL 憑證更新」的延期申請；查看被駁回、被核准的延期紀錄 |

## 專案結構

```
app/                  前端（Nuxt 4 的 srcDir）
  pages/              頁面：首頁、ticket、專案、通知、使用教學（guide.vue）
  components/         卡片、表單視窗、通知鈴鐺等元件
  composables/        資料存取：useTickets、useProjects、useNotifications、useSession
  utils/ticket.ts     狀態文字、排序、死線顯示
  assets/css/main.css 全站樣式與深色主題色票
server/
  api/                REST API（見下表）
  utils/db.ts         JSON 檔的讀寫，換資料庫時主要改這裡
  utils/validate.ts   輸入驗證、目前使用者判斷
  utils/notify.ts     建立通知、計算死線提醒
shared/               前後端共用的型別與日期工具
data/db.json          資料檔（不在 git 裡，由 npm run seed 產生）
scripts/seed.mjs      測試資料產生器
```

## API

所有 API 都用 cookie `uid` 判斷目前使用者，錯誤訊息放在回應的 `message`。

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/users` | 使用者列表 |
| GET / POST | `/api/tickets` | 列出全部 ticket / 新增 |
| GET / PATCH / DELETE | `/api/tickets/:id` | 讀取 / 修改 / 刪除（`:id` 也可以是編號，例如 `/api/tickets/TK-7F3K9Q`） |
| POST | `/api/tickets/:id/extensions` | 申請延期 `{ toDeadline, reason }` |
| PATCH | `/api/tickets/:id/extensions/:extId` | 審核 `{ decision: 'approved' \| 'rejected', note? }` |
| GET / POST | `/api/projects` | 列出 / 新增專案 |
| PATCH / DELETE | `/api/projects/:id` | 修改 / 刪除專案 |
| GET | `/api/notifications` | 我的通知（同時更新死線提醒） |
| POST | `/api/notifications/read` | 標為已讀 `{ ids }` 或 `{ all: true }` |
| GET / PUT | `/api/notifications/settings` | 讀取 / 儲存通知設定 |

## 改用 SQL 資料庫

目前資料全部存在 `data/db.json`：每次寫入都會讀出整個檔案、修改、再整個寫回，並用 `updateDb()` 的佇列避免同時寫入。這種做法只適合**單一伺服器、少量資料**。要多台伺服器或資料量變大時，就需要換成 SQL 資料庫。以下是建議的做法，目前**還沒有實作**。

### 1. 選資料庫和工具

- **資料庫**：管理平台已經在用的資料庫優先。沒有的話建議用 **PostgreSQL**。只跑一台伺服器的話，SQLite 也可以，下面的設計一樣適用。
- **存取方式**：建議用 [Drizzle ORM](https://orm.drizzle.team/)。它可以用 TypeScript 定義資料表、自動產生 migration，查詢結果也有型別，跟 Nitro 搭配不需要額外設定。
  ```bash
  npm install drizzle-orm pg
  npm install -D drizzle-kit @types/pg
  ```
- **連線設定**：連線字串放在環境變數 `DATABASE_URL`，透過 `nuxt.config.ts` 的 `runtimeConfig` 讀取。`.env` 檔要加進 `.gitignore`，**不要把密碼 commit 進去**。

### 2. 資料表設計

對應 [shared/types.ts](shared/types.ts) 的結構（以 PostgreSQL 為例）。原本存在 ticket 裡面的陣列（子項目、延期紀錄）和通知設定裡的專案清單，都拆成獨立的資料表：

```sql
CREATE TABLE users (
  id    text PRIMARY KEY,
  name  text NOT NULL,
  email text NOT NULL UNIQUE,
  color text NOT NULL
);

CREATE TABLE projects (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  color       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  creator_id  text NOT NULL REFERENCES users(id)
);

CREATE TABLE tickets (
  id          text PRIMARY KEY,
  code        text NOT NULL UNIQUE,                 -- TK-7F3K9Q，不可重複
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'todo'   CHECK (status IN ('todo', 'in_progress', 'done')),
  priority    text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  deadline    date,                                 -- null = 無死線
  pr_url      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  creator_id  text NOT NULL REFERENCES users(id),
  assignee_id text NOT NULL REFERENCES users(id),   -- 只有一個負責人，刻意不做成多對多
  project_id  text REFERENCES projects(id) ON DELETE SET NULL  -- 刪專案 → 未分類
);

-- 子項目的 id（s1、s2…）只在同一張 ticket 內不重複，所以主鍵要加上 ticket_id
CREATE TABLE subtasks (
  ticket_id text NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  id        text NOT NULL,
  title     text NOT NULL,
  done      boolean NOT NULL DEFAULT false,
  position  int NOT NULL,                           -- 保留顯示順序
  PRIMARY KEY (ticket_id, id)
);

CREATE TABLE extension_requests (
  id            text PRIMARY KEY,
  ticket_id     text NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  requester_id  text NOT NULL REFERENCES users(id),
  from_deadline date NOT NULL,
  to_deadline   date NOT NULL,
  reason        text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  decider_id    text REFERENCES users(id),
  decided_at    timestamptz,
  note          text
);
-- 一張 ticket 一次只能有一筆待審核的申請，交給資料庫保證
CREATE UNIQUE INDEX one_pending_extension ON extension_requests (ticket_id) WHERE status = 'pending';

CREATE TABLE notifications (
  id           text PRIMARY KEY,
  user_id      text NOT NULL REFERENCES users(id),
  kind         text NOT NULL,
  ticket_id    text NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,  -- 刪 ticket 一併刪通知
  ticket_title text NOT NULL,
  actor_id     text REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  read         boolean NOT NULL DEFAULT false,
  key          text,                                -- 死線提醒的去重 key
  request_id   text,
  decision     text,
  deadline     date,
  to_deadline  date,
  UNIQUE (user_id, key)
);
CREATE INDEX notifications_user ON notifications (user_id, created_at DESC);

CREATE TABLE notification_settings (
  user_id       text PRIMARY KEY REFERENCES users(id),
  my_tickets    boolean NOT NULL DEFAULT true,
  due_soon_days int NOT NULL DEFAULT 3,
  overdue       boolean NOT NULL DEFAULT true
);

-- 關注的專案；刪專案時自動移除
CREATE TABLE notification_setting_projects (
  user_id    text NOT NULL REFERENCES users(id),
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, project_id)
);
```

用 Drizzle 的話，這份設計寫成 `server/db/schema.ts`，再用 `drizzle-kit generate` 產生 migration 檔，不用手寫 SQL。

### 3. 改寫伺服器程式

原則是 **API 的網址和回傳格式都不變**，這樣前端（`app/`）完全不用改。

| 檔案 | 要改的地方 |
|---|---|
| [server/utils/db.ts](server/utils/db.ts) | 改成建立資料庫連線。`readDb()` / `updateDb()` 移除；`findTicket()`、`newTicketCode()` 改成查資料庫 |
| `server/api/**` | 每支 API 改成直接查詢或寫入資料表。原本用 `updateDb()` 的，改用 `db.transaction()` 包起來，讀取、檢查、寫入在同一個 transaction 裡完成 |
| [server/utils/notify.ts](server/utils/notify.ts) | `notify()` 改成 INSERT；每人只保留 100 則的限制改成 DELETE 舊的；`syncDeadlineAlerts()` 改成查詢要提醒的 ticket，再新增或刪除提醒 |
| [server/utils/validate.ts](server/utils/validate.ts) | `requireUser()` 改成查 users 表；檢查專案、使用者是否存在的地方也改成查詢 |
| [scripts/seed.mjs](scripts/seed.mjs) | 改成清空資料表後 INSERT 測試資料 |

要注意的地方：
- **ticket 要組回原本的形狀**：`GET /api/tickets` 回傳的 ticket 裡面有 `subtasks` 和 `extensionRequests` 陣列，查詢後要把這兩張表的資料組回去，子項目依 `position` 排序。欄位名稱也要從 `snake_case` 轉回 `camelCase`（Drizzle 可以在 schema 裡直接對應）。
- **日期格式**：`deadline` 這類 `date` 欄位要以 `YYYY-MM-DD` 字串讀出。`pg` 預設會轉成 JS `Date`，可能因為時區差一天；Drizzle 請用 `date('deadline', { mode: 'string' })`。時間欄位回傳時轉成 ISO 字串。
- **業務規則照舊在程式裡檢查**：例如只有建立者能改死線、新死線要晚於目前死線。資料庫的限制（編號不重複、只能有一筆 pending）是最後一道防線。違反時資料庫會丟錯，要轉成 `fail('…', 409)` 這類看得懂的訊息。
- **新增欄位的方式會改變**：現在是在 `readDb()` 裡補預設值，換成 SQL 後改成新增 migration，並在欄位上設 `DEFAULT`。
- **使用者表**：整合進管理平台後，`users` 應該直接用管理平台的帳號資料，上面的 `REFERENCES users(id)` 改指向那張表。

### 4. 搬移現有資料

寫一支一次性的腳本（例如 `scripts/migrate-json-to-sql.mjs`），讀 `data/db.json` 寫進資料庫：
1. 先補上 `readDb()` 會補的預設值：`projectId`、`deadline`、`prUrl` 預設 `null`，`extensionRequests` 預設空陣列。沒有 `code` 的舊 ticket 要用 `ticketCodeFromSeed(id)` 算出編號，否則編號會跟現在畫面上看到的不同。
2. 依照外鍵的順序寫入：users → projects → tickets → subtasks → extension_requests → notifications → notification_settings → notification_setting_projects。
3. 全部包在一個 transaction 裡，中途失敗就整個復原。
4. 搬完後比對每張表的筆數和 `db.json` 是否一致。

### 5. 驗證

跟現在一樣，用 `npm run build` 加上啟動 `node .output/server/index.mjs` 打 API，並用瀏覽器實際操作一遍。重點確認：
- ticket 的建立、修改、刪除，刪除後相關通知也一起消失。
- 延期申請、審核，以及連續申請兩次時會被擋下。
- 刪除專案後 ticket 變成未分類，通知設定裡的關注專案也被移除。
- 快到期和逾期提醒會出現，條件不成立時會消失。
- 用編號開啟 ticket，也就是 `/tickets/TK-…`，還是正常。

最後更新 `CLAUDE.md` 的架構說明，包括 `updateDb` 和 `readDb` 補預設值的部分，以及這份 README。

## 整合到管理平台前要做的事

- **登入**：把 [useSession.ts](app/composables/useSession.ts) 和 `requireUser`（[server/utils/validate.ts](server/utils/validate.ts)）換成真正的登入驗證。目前 cookie 可以被任意修改，**不能直接上線**。
- **資料庫**：把 [server/utils/db.ts](server/utils/db.ts) 換成正式資料庫。JSON 檔只適合單一伺服器。做法見上方「[改用 SQL 資料庫](#改用-sql-資料庫)」。
- **死線提醒**：目前在讀取通知時才計算，建議改成排程定期執行 `syncDeadlineAlerts`。
- **即時通知**：目前每 30 秒更新一次，可改用 WebSocket 或 SSE。

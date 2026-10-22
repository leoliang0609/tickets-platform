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

### Ticket
- 欄位：編號（例如 `TK-7F3K9Q`）、標題、詳細內容、子項目（可勾選完成）、優先度、死線（可設為「無死線」）、建立時間、建立者、被指派者、所屬專案
- 編號是 `TK-` 加 6 碼隨機英數，不會重複，可以寫在 commit 訊息裡對應 ticket（例如 `git commit -m "TK-7F3K9Q 修正選單"`，查詢用 `git log --grep TK-7F3K9Q`）
- 搜尋框輸入編號按 Enter 直接打開（大小寫不分、可省略 `TK-`）；網址也可以用 `/tickets/TK-7F3K9Q`；ticket 頁面點編號可複製
- 狀態：待辦 → 進行中 → 已完成，在 ticket 頁面右側切換
- 子項目：在 ticket 頁面只能勾選完成；新增、修改、刪除要到「編輯」裡做
- 首頁可以依「全部 / 指派給我 / 我建立的」切換，並用專案、狀態、關鍵字篩選，依死線、優先度或建立時間排序
- 快到期（3 天內）顯示黃色，逾期顯示紅色

### 專案
- 每張 ticket 可以歸屬一個專案，也可以「未分類」
- 專案頁依成員分欄，列出每個人在這個專案中的 ticket
- 刪除專案時，底下的 ticket 會改為「未分類」，不會被刪掉

### 死線延期
1. **被指派者**在 ticket 頁面按「申請延期」，選新日期並填寫原因
2. **建立者**收到通知，可以在通知欄或 ticket 頁面核准或駁回
3. 核准後死線自動更新；每筆申請都保留在「延期紀錄」

規則：
- 只有建立者能直接修改死線，其他人只能申請延期
- 同一張 ticket 一次只能有一筆待審核的申請
- 已完成或無死線的 ticket 不能申請延期

### 通知
右上角 🔔 顯示未讀數量，以下情況會收到通知：

| 通知 | 觸發時機 |
|---|---|
| 指派 | 有人把 ticket 指派給你 |
| 延期申請 | 有人對你建立的 ticket 申請延期（可在通知中直接審核） |
| 延期結果 | 你的延期申請被核准或駁回 |
| 快到期 / 已逾期 | 依照你的通知設定 |

**通知設定**（`/notifications`）可以選擇：
- 是否提醒「指派給我的 ticket」
- 關注哪些專案：該專案中所有人的 ticket 快到期或逾期都會通知你
- 到期前幾天提醒，以及是否提醒逾期

通知每 30 秒自動更新一次，目前沒有即時推播或 email。

### 使用教學
導覽列的「使用教學」（`/guide`）是給同事看的操作說明，涵蓋所有功能和常見問題。**功能有變動時請一併更新這一頁**（[app/pages/guide.vue](app/pages/guide.vue)）。

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

## 整合到管理平台前要做的事

- **登入**：把 [useSession.ts](app/composables/useSession.ts) 和 `requireUser`（[server/utils/validate.ts](server/utils/validate.ts)）換成真正的登入驗證。目前 cookie 可以被任意修改，**不能直接上線**。
- **資料庫**：把 [server/utils/db.ts](server/utils/db.ts) 換成正式資料庫。JSON 檔只適合單一伺服器。
- **死線提醒**：目前在讀取通知時才計算，建議改成排程定期執行 `syncDeadlineAlerts`。
- **即時通知**：目前每 30 秒更新一次，可改用 WebSocket 或 SSE。

# CLAUDE.md

Ticket 管理平台原型：Nuxt 4（Vue 3）+ Nitro API，資料存在 `data/db.json`。功能說明與 API 列表見 [README.md](README.md)。

## 溝通

- 回覆使用者一律用**繁體中文**，包含工具呼叫之間的進度說明。
- UI 文字、錯誤訊息、程式註解都用繁體中文。

## 指令

```bash
npm run dev      # 開發：http://localhost:3000
npm run build    # 建置；改完程式至少要跑過這個
npm run seed     # 重設 data/db.json 為測試資料（會覆蓋使用者的資料）
```

- 沒有測試框架，也沒有 lint。驗證方式：`npm run build`，加上啟動 `node .output/server/index.mjs` 用 fetch 打 API。
- 要測試 UI 行為（點擊、畫面更新）一定要用真的瀏覽器跑，只看 SSR 的 HTML 抓不到 client 端的錯誤。
- 測試會改到 `data/db.json`，測完要執行 `npm run seed` 或還原備份。
- 使用者常常開著自己的 `npm run dev`（port 3000），不要把它關掉；自己的測試 server 用其他 port（例如 `PORT=3100`）。

## 架構

- `app/` 是 Nuxt 4 的 srcDir；`shared/` 放前後端共用的型別（`#shared/types`）和工具。
- 所有寫入都要透過 `updateDb(db => …)`（[server/utils/db.ts](server/utils/db.ts)），它會排隊執行並以暫存檔 + rename 寫入，避免同時寫入互相覆蓋。只讀取用 `readDb()`。
- `readDb()` 會替舊資料補上新欄位的預設值。**新增欄位時要在這裡補預設值**，也要同步更新 [scripts/seed.mjs](scripts/seed.mjs)。
- 目前使用者：cookie `uid`，server 端用 `requireUser(db, getCookie(event, 'uid'))` 取得。
- 輸入驗證集中在 [server/utils/validate.ts](server/utils/validate.ts)；用 `fail(message, statusCode)` 丟錯。錯誤一律用 `message`（不要用 `statusMessage`，h3 會警告）。
- 前端資料都在 composables 裡，用固定的 `useFetch` key（`tickets`、`projects`、`users`、`notifications`、`notification-settings`）讓各元件共用同一份資料。
- 為了簡單，前端一次抓全部 ticket，再在前端篩選。

## 業務規則（server 端強制檢查）

- **一張 ticket 只有一個負責人**（`assigneeId`），這是刻意的決定，不要改成多人指派。延期申請、完成狀態、專案頁依人分欄都建立在這個前提上。需要兩個人做時，請拆成兩張 ticket。如果之後要支援協作，預定的做法是加「協作者」欄位，或讓子項目可以指定負責人，而不是多個 assignee。

- **死線**：`deadline` 是 `YYYY-MM-DD` 或 `null`（無死線）。只有建立者能直接改；其他人透過 PATCH 改死線會收到 403，要走延期申請。
- **延期**：只有被指派者（且不是建立者）能申請；只有建立者能審核；一次只能有一筆 pending；新日期必須晚於目前死線。
- **通知**：用 `notify(db, …)`（[server/utils/notify.ts](server/utils/notify.ts)）建立；自己操作不會通知自己。新增會觸發通知的操作時要記得呼叫。
- **死線提醒**（`due_soon` / `overdue`）不是事件，而是 `syncDeadlineAlerts` 依使用者設定算出來的，用 `key` 去重；條件不再成立時，未讀的提醒會被刪除。目前在 `GET /api/notifications` 和儲存設定時執行。
- **編號**：`ticket.code`（例如 `TK-7F3K9Q`）是給人和 commit 訊息用的對外編號，邏輯都在 [shared/utils/ticketCode.ts](shared/utils/ticketCode.ts)：新 ticket 用 `newTicketCode(db)` 隨機產生並檢查不重複；舊資料由 id 雜湊補上（結果固定）；使用者輸入一律先經過 `normalizeTicketCode`（大小寫、前綴、O/I/L 誤打都會校正）。`id` 是內部主鍵，不要顯示給使用者。給使用者的連結用 `/tickets/{code}`；server 端用 `findTicket(db, idOrCode)`、前端用 `findTicketByIdOrCode` 查找，兩者都接受 id 或編號。**不要改回 `#數字`**：在 GitHub 的 commit 裡 `#12` 會被當成 issue 連結。
- 刪除 ticket 會刪掉相關通知；刪除專案會把 ticket 改為未分類，並從通知設定中移除該專案。

## 容易踩到的坑

- **`useFetch` 的 `data` 是 shallowRef**（Nuxt 4 預設）。`tickets.value[i] = t` 或 `.push()` **不會**更新畫面，一定要整個重新指派（例如 `tickets.value = tickets.value.map(…)`）。`useTickets` 的 `replace()` 就是做這件事。
- **`shared/utils` 的函式要明確 import**（`import { daysUntil } from '#shared/utils/date'`），不要依賴 auto-import：dev server 啟動後才新增的目錄不會被掃描，會在瀏覽器中出現 `xxx is not defined`。
- **Hydration mismatch**：
  - 不要在 SSR 會輸出的內容裡用 `toLocaleString`，Node 和瀏覽器的輸出不同；請用 `formatDateTime()`（[app/utils/ticket.ts](app/utils/ticket.ts)）。
  - 表單初始值如果來自 fetch，要 `await` 之後再初始化（參考 `useNotificationSettings`），否則 SSR 會輸出預設值。
- ticket 有變動後，`useTickets` 會呼叫 `refreshNuxtData('notifications')`，因為完成、改死線、審核延期都可能影響通知。
- 切換使用者時用 `watch(uid, refresh, { flush: 'post' })` 重新抓個人資料，確保 cookie 已更新。

## 樣式

- 只用 [app/assets/css/main.css](app/assets/css/main.css) 的 CSS 變數（`--bg`、`--surface`、`--accent`、`--danger`、`--warn`、`--ok`…），不要寫死顏色。
- 共用 class：`.btn`（`-primary` / `-ghost` / `-danger` / `-sm` / `-icon`）、`.input`、`.select`、`.textarea`、`.card`、`.badge-*`、`.prio-*`、`.tone-*`、`.modal-overlay` / `.modal` / `.modal-head` / `.modal-body` / `.modal-foot`。
- 元件樣式寫在 `<style scoped>`。沒有使用 UI 套件或 Tailwind。
- 新的視窗元件照 [ProjectFormModal.vue](app/components/ProjectFormModal.vue) 的寫法：Teleport 到 body、按 Esc 關閉、點背景關閉。

## 使用教學頁

[app/pages/guide.vue](app/pages/guide.vue) 是給一般同事看的操作教學。新增或修改使用者看得到的功能、規則時，要同步更新這一頁的說明和常見問題。

## 之後要換掉的部分

- 登入：`useSession` + `requireUser`（cookie 可被任意偽造，不能上線）
- 資料庫：`server/utils/db.ts`
- 死線提醒改成排程；通知改成即時推播

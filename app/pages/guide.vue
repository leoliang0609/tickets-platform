<script setup lang="ts">
import type { Ticket } from '#shared/types'
import { addDays, todayStr } from '#shared/utils/date'

useHead({ title: '使用教學' })

const { users } = useSession()
const { open: openCreate } = useCreateTicket()

const sections = [
  { id: 'start', title: '開始之前' },
  { id: 'home', title: '看我的工作' },
  { id: 'card', title: '看懂 ticket 卡片' },
  { id: 'create', title: '建立 ticket' },
  { id: 'work', title: '進行工作' },
  { id: 'project', title: '專案' },
  { id: 'extension', title: '死線與延期' },
  { id: 'notify', title: '通知' },
  { id: 'faq', title: '常見問題' }
]

// 示範用的卡片（不會存進資料）
const demoTicket = computed<Ticket>(() => ({
  id: 'demo',
  code: 'TK-4QZ8MD',
  title: '設計管理平台登入流程',
  description: '整理登入、忘記密碼、SSO 三種流程的畫面與 API 規格。',
  subtasks: [
    { id: 's1', title: '畫出流程圖', done: true },
    { id: 's2', title: '列出 API 規格', done: false },
    { id: 's3', title: '和後端開會確認', done: false }
  ],
  status: 'in_progress',
  priority: 'high',
  deadline: addDays(todayStr(), 2),
  extensionRequests: [],
  createdAt: `${addDays(todayStr(), -5)}T02:00:00.000Z`,
  updatedAt: `${addDays(todayStr(), -1)}T02:00:00.000Z`,
  creatorId: users.value[1]?.id ?? 'u2',
  assigneeId: users.value[0]?.id ?? 'u1',
  projectId: 'p_admin'
}))

// 目錄跟著捲動位置標示目前章節
const active = ref('start')
let observer: IntersectionObserver | undefined
onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
    if (visible[0]) active.value = visible[0].target.id
  }, { rootMargin: '-80px 0px -60% 0px' })
  for (const s of sections) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="guide">
    <aside class="toc">
      <div class="toc-title">目錄</div>
      <a v-for="(s, i) in sections" :key="s.id" :href="`#${s.id}`" :class="{ active: active === s.id }">
        <span class="toc-num">{{ i + 1 }}</span>{{ s.title }}
      </a>
    </aside>

    <article class="content">
      <header class="intro">
        <span class="eyebrow">使用教學</span>
        <h1>Tickets 使用說明</h1>
        <p>
          Tickets 是團隊的工作清單：每一件要做的事就是一張 <b>ticket</b>，有負責人、死線和進度。
          看完這頁大約 5 分鐘，就能開始指派工作、追蹤進度和申請延期。
        </p>
        <div class="quick">
          <NuxtLink to="/" class="quick-item"><b>我有哪些工作？</b><span>首頁 → 「指派給我」</span></NuxtLink>
          <button class="quick-item" @click="openCreate()"><b>交辦一件事</b><span>右上角「新增 Ticket」</span></button>
          <a href="#extension" class="quick-item"><b>來不及做完</b><span>在 ticket 裡「申請延期」</span></a>
        </div>
      </header>

      <!-- 1 -->
      <section id="start">
        <h2><span class="num">1</span>開始之前</h2>
        <p>畫面最上方的導覽列，從左到右是：</p>
        <ul class="defs">
          <li><b>所有 Ticket</b>：首頁，列出所有工作</li>
          <li><b>專案</b>：依專案查看大家的工作</li>
          <li><b>使用教學</b>：就是這一頁</li>
          <li><b>目前身分</b>：切換現在是誰在使用</li>
          <li><b>🔔 通知</b>：紅色數字是未讀通知數量</li>
          <li><b>新增 Ticket</b>：建立新的工作</li>
        </ul>
        <div class="note">
          <b>關於「目前身分」</b>：系統還沒有登入功能，請先用右上角切換成自己的名字再操作。之後整合到管理平台後，會自動使用你的登入帳號。
          <div class="who">
            <span v-for="u in users" :key="u.id" class="who-item"><UserAvatar :user="u" :size="20" />{{ u.name }}</span>
          </div>
        </div>
      </section>

      <!-- 2 -->
      <section id="home">
        <h2><span class="num">2</span>看我的工作</h2>
        <p>打開首頁，最上面四個數字是<b>指派給你</b>的工作統計：待辦、進行中、已逾期、已完成。</p>
        <p>下方的分頁可以切換要看哪些 ticket：</p>
        <div class="table">
          <div><b>全部</b><span>所有人的所有 ticket</span></div>
          <div><b>指派給我</b><span>你是負責人的 ticket，也就是你要做的事</span></div>
          <div><b>我建立的</b><span>你交辦給別人（或自己）的 ticket</span></div>
        </div>
        <p>右邊可以再用<b>專案</b>、<b>狀態</b>、<b>關鍵字</b>篩選，並依<b>死線</b>、<b>優先度</b>或<b>建立時間</b>排序。已完成的 ticket 一律排在最後。</p>
        <h3>用編號找 ticket</h3>
        <p>每張 ticket 都有一個不會重複的編號，例如 <b>TK-7F3K9Q</b>。和同事溝通、或寫在程式的 commit 訊息裡，都用這個編號對應 ticket。</p>
        <ul class="defs">
          <li>在搜尋框輸入編號，按 <b>Enter</b> 就會直接打開那張 ticket。大小寫不分，也可以省略 <code>TK-</code>，例如 <code>7f3k9q</code></li>
          <li>只記得一部分也沒關係，輸入幾個字元就會列出符合的 ticket</li>
          <li>就算它不在目前的分頁或篩選條件中，也會提示你並提供連結</li>
          <li>ticket 的網址就是編號，例如 <code>/tickets/TK-7F3K9Q</code>，可以直接貼給同事</li>
        </ul>
        <h3>寫在 commit 訊息裡</h3>
        <p>在 ticket 頁面點標題上方的編號就能複製。寫 commit 時把編號放進訊息，之後就能從編號找到所有相關的程式修改：</p>
        <pre class="code-block">git commit -m "TK-7F3K9Q 修正手機版選單跑版"

# 查詢某張 ticket 相關的所有 commit
git log --grep TK-7F3K9Q</pre>
        <div class="tip">
          <b>小技巧</b>：選了專案篩選後，網址會變成 <code>/?project=…</code>，可以直接複製給同事或加入書籤。
        </div>
      </section>

      <!-- 3 -->
      <section id="card">
        <h2><span class="num">3</span>看懂 ticket 卡片</h2>
        <div class="card-demo">
          <div class="demo-wrap" aria-hidden="true">
            <TicketCard :ticket="demoTicket" />
          </div>
          <ol class="callouts">
            <li><b>狀態</b>：待辦、進行中、已完成</li>
            <li><b>專案</b>與<b>優先度</b>（高／中／低）</li>
            <li><b>編號</b>與標題</li>
            <li><b>子項目進度</b>：完成幾項、共幾項</li>
            <li><b>建立者 → 負責人</b>：左邊是交辦的人，右邊是負責的人</li>
            <li><b>死線</b>與建立日期</li>
          </ol>
        </div>
        <p>死線的顏色代表急迫程度：</p>
        <div class="legend">
          <span class="tone-muted">2026-11-20　還有時間</span>
          <span class="tone-warn">剩 2 天　3 天內到期</span>
          <span class="tone-danger">今天到期／逾期 3 天</span>
          <span class="tone-ok">已完成</span>
          <span class="tone-muted">無死線</span>
        </div>
        <p>逾期的卡片左邊會有一條紅線；已完成的卡片會變淡，標題加上刪除線。</p>
      </section>

      <!-- 4 -->
      <section id="create">
        <h2><span class="num">4</span>建立 ticket</h2>
        <ol class="steps">
          <li>按右上角的 <b>新增 Ticket</b></li>
          <li>填寫<b>標題</b>：一句話說清楚要做什麼，例如「修正報表匯出 CSV 亂碼」</li>
          <li>選擇<b>指派給</b>誰。預設是另一位同事，也可以指派給自己</li>
          <li>選擇<b>專案</b>、<b>優先度</b>和<b>死線</b>。沒有明確期限的事，可以勾選「無死線」</li>
          <li>在<b>詳細內容</b>寫背景、需求和完成標準</li>
          <li>把工作拆成<b>子項目</b>，輸入後按 Enter 加入</li>
          <li>按 <b>建立 Ticket</b>，對方會收到通知</li>
        </ol>
        <div class="tip">
          <b>小技巧</b>：在某個專案的頁面裡按「在此專案新增 Ticket」，專案會自動帶入。
        </div>
        <button class="btn btn-primary" @click="openCreate()">試著建立一張 ticket</button>
      </section>

      <!-- 5 -->
      <section id="work">
        <h2><span class="num">5</span>進行工作</h2>
        <p>點一下卡片就會打開 ticket 頁面。</p>
        <div class="table">
          <div><b>更新狀態</b><span>右側「狀態」區塊點<b>待辦／進行中／已完成</b>，馬上儲存</span></div>
          <div><b>完成子項目</b><span>直接勾選。勾完所有子項目<b>不會</b>自動完成 ticket，記得再把狀態改成「已完成」</span></div>
          <div><b>新增或修改子項目</b><span>按右上角的<b>編輯</b>，在編輯視窗裡新增、改名或刪除</span></div>
          <div><b>修改內容</b><span>同樣在<b>編輯</b>裡改標題、內容、負責人、專案和優先度</span></div>
          <div><b>刪除</b><span>右上角的<b>刪除</b>，刪除後無法復原</span></div>
        </div>
        <div class="note">
          <b>一張 ticket 只有一個負責人。</b>如果一件事需要兩個人做，請拆成兩張 ticket，各自有負責人和死線，這樣進度和延期才不會互相影響。
        </div>
      </section>

      <!-- 6 -->
      <section id="project">
        <h2><span class="num">6</span>專案</h2>
        <p>專案用來把相關的 ticket 歸在一起，例如「官網改版」或「系統維運」。</p>
        <ul class="defs">
          <li>在<b>專案</b>頁面按「新增專案」，填名稱、說明並選一個顏色</li>
          <li>每個專案卡片會顯示完成進度、未完成和逾期數量，以及有哪些人參與</li>
          <li>點進專案後，ticket 會<b>依負責人分欄</b>，一眼看出每個人手上有什麼工作。預設不顯示已完成的，可以勾「顯示已完成」</li>
          <li>不屬於任何專案的 ticket 會顯示為「未分類」</li>
          <li>刪除專案<b>不會</b>刪除裡面的 ticket，它們會改成「未分類」</li>
        </ul>
        <NuxtLink to="/projects" class="btn">前往專案</NuxtLink>
      </section>

      <!-- 7 -->
      <section id="extension">
        <h2><span class="num">7</span>死線與延期</h2>
        <p>死線由<b>建立 ticket 的人</b>決定。負責人如果需要更多時間，不能直接改死線，要提出延期申請：</p>
        <div class="flow">
          <div class="flow-step">
            <span class="flow-num">1</span>
            <b>負責人申請</b>
            <p>在 ticket 頁面右側的「死線」區塊按<b>申請延期</b>，選新的日期並寫下原因</p>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-step">
            <span class="flow-num">2</span>
            <b>建立者審核</b>
            <p>建立者會收到通知，可以在<b>通知欄</b>或 <b>ticket 頁面</b>按核准或駁回，也可以附上回覆</p>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-step">
            <span class="flow-num">3</span>
            <b>自動更新</b>
            <p>核准後死線自動改成新日期；結果會通知申請人，並記錄在「延期紀錄」</p>
          </div>
        </div>
        <ul class="defs">
          <li>同一張 ticket 一次只能有一筆申請在審核中</li>
          <li>新日期必須晚於目前的死線</li>
          <li>已完成或無死線的 ticket 不需要申請</li>
          <li>如果 ticket 是你建立、又指派給自己的，直接在「編輯」裡改死線就好</li>
        </ul>
        <div class="tip">
          <b>建議</b>：發現可能來不及時就提早申請，並在原因裡說明卡在哪裡、還需要多久。
        </div>
      </section>

      <!-- 8 -->
      <section id="notify">
        <h2><span class="num">8</span>通知</h2>
        <p>點右上角的 🔔 打開通知欄，點任一則通知會跳到對應的 ticket 並標為已讀。以下情況會通知你：</p>
        <div class="table">
          <div><b><span class="dot dot-accent" />被指派</b><span>有人把 ticket 交給你</span></div>
          <div><b><span class="dot dot-warn" />延期申請</b><span>有人對你建立的 ticket 申請延期，可以直接在通知裡核准或駁回</span></div>
          <div><b><span class="dot dot-ok" />延期結果</b><span>你的延期申請被核准或駁回</span></div>
          <div><b><span class="dot dot-warn" />快到期</b><span>ticket 即將到期</span></div>
          <div><b><span class="dot dot-danger" />已逾期</b><span>ticket 已經超過死線</span></div>
        </div>
        <h3>設定要提醒哪些 ticket</h3>
        <p>在通知欄下方點<b>通知設定</b>，可以調整「快到期」和「已逾期」的提醒：</p>
        <ul class="defs">
          <li><b>指派給我的 ticket</b>：你負責的工作，不分專案都會提醒</li>
          <li><b>關注的專案</b>：勾選後，該專案中<b>所有人</b>的 ticket 快到期或逾期都會通知你，適合專案負責人或主管</li>
          <li><b>提醒時機</b>：到期前幾天提醒，以及逾期是否也要提醒</li>
        </ul>
        <p class="muted">通知每 30 秒自動更新一次。如果剛發生的事還沒出現，等一下或重新整理頁面即可。</p>
        <NuxtLink to="/notifications#settings" class="btn">前往通知設定</NuxtLink>
      </section>

      <!-- 9 -->
      <section id="faq">
        <h2><span class="num">9</span>常見問題</h2>
        <details>
          <summary>同事給我一個編號（例如 TK-7F3K9Q），怎麼快速找到？</summary>
          <p>在首頁搜尋框貼上編號後按 Enter，或直接開啟網址 /tickets/TK-7F3K9Q。大小寫不分，也可以省略 TK-。</p>
        </details>
        <details>
          <summary>一件事需要兩個人一起做，怎麼辦？</summary>
          <p>請拆成兩張 ticket，各自指派給一個人，放在同一個專案裡。這樣每個人都有自己的死線和進度，延期也不會互相影響。</p>
        </details>
        <details>
          <summary>為什麼我不能修改死線？</summary>
          <p>只有建立 ticket 的人能直接修改死線。如果你是負責人，請在 ticket 頁面按「申請延期」，由建立者審核。</p>
        </details>
        <details>
          <summary>子項目都勾完了，ticket 怎麼還沒完成？</summary>
          <p>子項目和 ticket 狀態是分開的。確認工作都完成後，請在 ticket 頁面右側把狀態改成「已完成」。</p>
        </details>
        <details>
          <summary>在 ticket 頁面找不到新增子項目的地方？</summary>
          <p>ticket 頁面只能勾選子項目。要新增、改名或刪除子項目，請按右上角的「編輯」。</p>
        </details>
        <details>
          <summary>刪掉專案後，裡面的 ticket 會不見嗎？</summary>
          <p>不會。ticket 會保留，只是改成「未分類」，之後可以在編輯中重新選專案。</p>
        </details>
        <details>
          <summary>我的延期申請被駁回了，可以再申請嗎？</summary>
          <p>可以。看一下建立者的回覆，調整日期或補充原因後再送出一次。</p>
        </details>
        <details>
          <summary>為什麼有人申請延期，我卻沒看到通知？</summary>
          <p>通知每 30 秒更新一次，請稍等或重新整理頁面。也請確認右上角的「目前身分」是你自己。</p>
        </details>
      </section>

      <footer class="end">
        <p>準備好了嗎？</p>
        <div class="end-actions">
          <NuxtLink to="/" class="btn">查看我的工作</NuxtLink>
          <button class="btn btn-primary" @click="openCreate()">新增第一張 Ticket</button>
        </div>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.guide { display: grid; grid-template-columns: 200px minmax(0, 760px); gap: 48px; justify-content: center; }

.toc { position: sticky; top: 88px; align-self: start; display: flex; flex-direction: column; gap: 2px; }
.toc-title { font-size: 12px; font-weight: 600; letter-spacing: .06em; color: var(--muted); margin: 0 0 8px 10px; }
.toc a { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: var(--radius-sm); color: var(--text-2); font-size: 13px; }
.toc a:hover { background: var(--surface); color: var(--text); }
.toc a.active { background: var(--accent-soft); color: var(--accent); }
.toc-num { width: 18px; font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
.toc a.active .toc-num { color: var(--accent); }

.content { min-width: 0; }
.intro { padding-bottom: 32px; border-bottom: 1px solid var(--border); }
.eyebrow { font-size: 12px; font-weight: 600; letter-spacing: .08em; color: var(--accent); }
h1 { margin: 6px 0 12px; font-size: 30px; font-weight: 700; letter-spacing: -.01em; }
.intro p { margin: 0; font-size: 15px; color: var(--text-2); line-height: 1.75; }
.quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 22px; }
.quick-item {
  display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; text-align: left;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  color: var(--text); font: inherit; cursor: pointer; transition: border-color .15s, background .15s;
}
.quick-item:hover { border-color: var(--border-strong); background: var(--surface-hover); }
.quick-item span { font-size: 12px; color: var(--muted); }

section { padding: 36px 0; border-bottom: 1px solid var(--border); scroll-margin-top: 80px; }
h2 { display: flex; align-items: center; gap: 12px; margin: 0 0 14px; font-size: 21px; font-weight: 700; }
.num {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px;
  background: var(--accent-soft); color: var(--accent); font-size: 14px;
}
h3 { margin: 24px 0 8px; font-size: 15px; }
section p { margin: 0 0 12px; color: var(--text-2); line-height: 1.75; }
section b { color: var(--text); font-weight: 600; }
.muted { font-size: 13px; color: var(--muted) !important; }
.code-block {
  margin: 0 0 14px; padding: 14px 16px; overflow-x: auto; border-radius: var(--radius-sm);
  background: var(--bg-elev); border: 1px solid var(--border);
  font: 13px/1.6 ui-monospace, 'Cascadia Mono', Consolas, monospace; color: var(--text-2);
}
code { padding: 1px 6px; border-radius: 4px; background: var(--surface-2); font-size: 12px; color: var(--text); }
section > .btn { margin-top: 8px; }

.defs, .steps { margin: 0 0 14px; padding-left: 20px; color: var(--text-2); line-height: 1.75; }
.defs li, .steps li { margin: 4px 0; }
.steps { counter-reset: step; list-style: none; padding: 0; }
.steps li { position: relative; padding: 8px 0 8px 40px; }
.steps li::before {
  counter-increment: step; content: counter(step);
  position: absolute; left: 0; top: 7px; width: 26px; height: 26px; border-radius: 50%;
  display: grid; place-items: center; font-size: 12px; font-weight: 700;
  border: 1px solid var(--border-strong); color: var(--text-2);
}

.table { margin: 0 0 14px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.table > div { display: grid; grid-template-columns: 150px 1fr; gap: 16px; padding: 11px 16px; font-size: 14px; }
.table > div + div { border-top: 1px solid var(--border); }
.table > div > b { display: flex; align-items: center; gap: 8px; }
.table > div > span { color: var(--text-2); }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-accent { background: var(--accent); }
.dot-warn { background: var(--warn); }
.dot-ok { background: var(--ok); }
.dot-danger { background: var(--danger); }

.note, .tip { margin: 14px 0; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 14px; line-height: 1.7; color: var(--text-2); }
.note { background: var(--surface); border: 1px solid var(--border); }
.tip { background: var(--accent-soft); border: 1px solid rgba(124, 140, 255, .3); }
.who { display: flex; gap: 8px; margin-top: 10px; }
.who-item { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 4px; border-radius: 999px; background: var(--surface-2); font-size: 13px; color: var(--text); }

.card-demo { display: grid; grid-template-columns: 320px 1fr; gap: 28px; align-items: center; margin-bottom: 18px; }
.demo-wrap { pointer-events: none; }
.callouts { margin: 0; padding-left: 20px; color: var(--text-2); line-height: 1.75; font-size: 14px; }
.callouts li { margin: 6px 0; }
.legend { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.legend span { padding: 4px 10px; border-radius: 6px; background: var(--surface); border: 1px solid var(--border); font-size: 13px; font-weight: 600; }

.flow { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 10px; align-items: stretch; margin: 8px 0 18px; }
.flow-step { position: relative; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.flow-step > b { display: block; margin: 8px 0 4px; }
.flow-step p { margin: 0; font-size: 13px; line-height: 1.6; }
.flow-num { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--warn-soft); color: var(--warn); font-size: 12px; font-weight: 700; }
.flow-arrow { display: grid; place-items: center; color: var(--muted); font-size: 18px; }

details { border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); }
details + details { margin-top: 8px; }
summary { padding: 12px 16px; cursor: pointer; font-weight: 500; list-style: none; display: flex; justify-content: space-between; gap: 12px; }
summary::-webkit-details-marker { display: none; }
summary::after { content: '+'; color: var(--muted); font-size: 18px; line-height: 1; }
details[open] summary::after { content: '−'; }
details p { margin: 0; padding: 0 16px 14px; }

.end { padding: 40px 0 0; text-align: center; }
.end p { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
.end-actions { display: flex; justify-content: center; gap: 10px; }

@media (max-width: 900px) {
  .guide { grid-template-columns: minmax(0, 1fr); }
  .toc { display: none; }
}
@media (max-width: 640px) {
  .quick { grid-template-columns: 1fr; }
  .card-demo { grid-template-columns: 1fr; }
  .flow { grid-template-columns: 1fr; }
  .flow-arrow { transform: rotate(90deg); }
  .table > div { grid-template-columns: 1fr; gap: 2px; }
}
</style>

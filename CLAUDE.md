# Dog-ear（折角）

多益閱讀錯題本 PWA。使用者拍下紙本題本上寫錯的題目、標記錯因，系統依間隔複習規則每天排出要「重做」的題目。

- 完整產品規格：`docs/PRD.md`（功能、流程、資料結構、排程演算法、文案，以此為準）
- 視覺規格：`docs/DESIGN.md`（design tokens、字體、元件、Logo）
- 開發排程：`docs/BUILD_PLAN.md`（Day 4–10，每天一個範圍）
- Figma 設計稿：https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD （頁面「高保真 v1」為準）

## 技術棧

- Vite + React + TypeScript（`strict: true`）
- Tailwind CSS v4，tokens 寫在 `src/index.css` 的 `@theme`（見 `docs/DESIGN.md`）
- Dexie.js（IndexedDB）+ `dexie-react-hooks` 的 `useLiveQuery`
- React Router
- vite-plugin-pwa
- browser-image-compression（照片壓縮）、JSZip（備份）
- Vitest（排程與日期邏輯的單元測試）
- 部署：Vercel

## 指令

- `npm run dev`：開發伺服器
- `npm run build`：型別檢查 + 建置
- `npm run test`：單元測試
- `npm run preview`：預覽建置結果

## 專案結構

```
src/
  db/            schema.ts（Dexie 資料表）、各資料表的存取函式
  lib/
    scheduler.ts 間隔複習排程（純函式，必須有單元測試）
    date.ts      本地日期工具（YYYY-MM-DD）
    image.ts     照片壓縮
    backup.ts    ZIP 匯出／匯入
    standalone.ts 偵測是否從主畫面開啟、申請持久儲存
  components/    Button、Option、Chip、Photo、Banner、Header、NavBar、Card、FoldCorner、Sheet
  features/
    review/      複習頁（首頁）與今日複習流程
    capture/     錄入流程
    library/     錯題庫與單題詳情
    settings/    設定、錯因管理、備份
    onboarding/  首次開啟教學
  index.css      Tailwind 與 design tokens
```

## 架構原則

- **純前端**：沒有後端、沒有帳號、沒有分析追蹤。所有資料存在 IndexedDB。
- **手機優先**：設計寬度 390px，內容最大寬度 480px 置中。所有畫面都要在 iPhone Safari 上可用。
- **UI 一律繁體中文（zh-TW）**，文案以 `docs/PRD.md` 的「文案」章節為準，不要自行改寫。
- **日期一律用本地日期字串 `YYYY-MM-DD`**，午夜換日。不要用 `toISOString().slice(0, 10)`（那是 UTC，台灣早上 8 點前會算錯日）。統一走 `src/lib/date.ts`。
- **顏色、圓角、字體只用 tokens**，不要在元件裡寫死色碼。
- **照片存成 Blob**；顯示時用 `URL.createObjectURL`，元件卸載時 `revokeObjectURL`。
- 錯題記錄錯因的 **ID**，不記名稱，所以錯因改名不必改題目資料。

## 工作規則

- 不要新增 PRD 沒寫的功能。規格不清楚或互相矛盾時，先問我，不要自己猜。
- 修改 `scheduler.ts` 或 `date.ts` 時，必須同步更新並通過單元測試。
- 每完成一個任務：`npm run build` 無錯誤、`npm run test` 通過，並在 390px 寬度下檢查畫面。
- 開發新畫面前先對照 Figma「高保真 v1」頁面的對應畫面（畫面編號見 `docs/DESIGN.md`）。
- 提交訊息用繁體中文，描述做了什麼與為什麼。

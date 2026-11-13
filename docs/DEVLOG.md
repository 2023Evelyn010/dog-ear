# 開發日誌

每天收工前寫 3–5 行：做了什麼決策、為什麼、卡在哪裡。這是作品集的原始素材。

## Day 1–3（設計階段，已完成）

- 定位收斂為「紙本題本的閱讀錯題本」，聽力交給 VoiceTube，刻意不做。
- 首頁命名為「複習」，第一次使用的困惑交給空狀態文案解釋，不另做教學頁。
- 錯因多選用平鋪標籤而非下拉選單：錄入速度優先，最多顯示 8 個，其餘收合。
- 答對時「猜的」與「有把握」並排，避免記住答案的題目被誤判為已學會。
- 視覺選「冷白書頁＋鋼筆藍＋書籤分色」：顏色是資訊，不是裝飾。

## Day 4（專案骨架）

- 日期全部走 `src/lib/date.ts` 的本地日曆計算；測試固定在 `Asia/Taipei` 執行，並加一個「台灣 07:30 = UTC 前一天 23:30」的案例，證明 `toISOString()` 會算錯日。
- Tailwind 用 `--color-*: initial` 清掉預設色票，元件只能用 DESIGN.md 的 tokens；文字樣式也做成 `text-title`、`text-body` 等 tokens（Body/Base 命名為 `text-body`，避免覆蓋 Tailwind 的 `text-base`）。
- 預設錯因與設定用 Dexie 的 `populate` 事件建立：只在資料庫第一次建立時執行，重開不會重複。
- 導覽列只出現在複習、錯題庫兩個分頁；設定依 Figma 5-1 為返回式頁首、沒有導覽列。流程頁的 ✕／‹ 優先返回上一頁，直接開網址時回到預設頁。
- 卡關：Windows 上 headless Edge 的視窗有最小寬度，`--window-size=390` 不準，改用 390px 寬的 iframe 檢查畫面。
- 部署：GitHub repo 匯入 Vercel（https://dog-ear-two.vercel.app），之後 push 到 main 就自動部署。iPhone Safari 加入主畫面後以全螢幕開啟、三個分頁可切換、飛航模式下仍可開啟，Day 4 驗收通過。

## Day 5（錄入流程）

- 規格沒寫的四件事先跟自己確認再做：✕ 離開時若已存過題目，視同「略過」寫入 PracticeSession（避免題目的 `sessionId` 指向不存在的紀錄）；縮圖可刪除；缺少欄位提示沿用「還沒選正確答案」的句型；新增錯因後自動展開「更多錯因」，因為使用 0 次的新錯因會排到第 9 個以後。
- 「中途離開確認」不是看「欄位有沒有值」，而是跟表單重設時的狀態比：自動帶入的題本來源、沿用的照片與 Part 都不算「已填」，否則「再拍一題」之後每次按 ✕ 都會被問。
- 錯因使用次數只讀 `*errorTagIds` 多值索引的 key，不把題目（含照片 Blob）整筆載入記憶體。
- 照片元件改成在 effect 裡直接設定 `<img>` 的 src 並在卸載時 revoke，避開「effect 裡 setState」的 lint 警告，也不會在 StrictMode 重跑 effect 時拿到已 revoke 的網址。
- 輸入框字級一律 16px：iOS Safari 對小於 16px 的輸入框聚焦時會自動放大畫面。
- 驗證：用 headless Edge + CDP 的 `setDeviceMetricsOverride` 模擬 390px（取代 Day 4 的 iframe 作法），腳本實際上傳 3024×4032 照片、走完三題錄入與練習量面板，42 項檢查全過；照片壓成 1200×1600 JPEG、約 24KB。真實題本與 30 秒的驗收要在手機上做。

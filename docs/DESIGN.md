# Dog-ear 視覺規格

Figma：https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD
以「高保真 v1」頁面為準；「線框稿 v1」只作為演進紀錄，不要照著做。

**風格一句話**：冷白書頁＋鋼筆藍，用書籤色區分 Part；圓體標題呼應紙狗，紙本感來自卡片折角與 Logo。顏色是資訊，不是裝飾：每個顏色都要有用途。

## 1. Design tokens

寫在 `src/index.css`：

```css
@import "tailwindcss";

@theme {
  /* 顏色 */
  --color-bg: #F7FAFF;           /* 頁面底色（冷白） */
  --color-card: #FFFFFF;         /* 卡片、面板 */
  --color-photo: #E9EEF6;        /* 照片佔位、縮圖底 */
  --color-line: #DCE3EE;         /* 框線、分隔線、進度條底 */
  --color-primary: #2E4A7D;      /* 鋼筆藍：主要按鈕、選取狀態 */
  --color-primary-soft: #E6ECF6; /* 提示列底色 */
  --color-ink: #1E1E1E;          /* 主要文字 */
  --color-sub: #6B7280;          /* 次要文字 */
  --color-on-primary: #FFFFFF;   /* 主色上的文字 */
  --color-part5: #3E6FB0;
  --color-part6: #4E9A7A;
  --color-part7: #E0A23A;
  --color-fold: #E0A23A;         /* 折角 */
  --color-overlay: #1E2A3D;      /* 面板遮罩，使用時 45% 透明度 */

  /* 圓角 */
  --radius-card: 12px;           /* 卡片右上角例外：0（留給折角） */
  --radius-button: 10px;
  --radius-option: 10px;
  --radius-chip: 9999px;

  /* 字體 */
  --font-heading: "Chiron GoRound TC", "Noto Sans TC", system-ui, sans-serif;
  --font-body: "Noto Sans TC", system-ui, sans-serif;
}
```

**字體載入**：兩者都是 Google Fonts。只載入用到的字重：Chiron GoRound TC 700、Noto Sans TC 400／500／700。中文字型檔很大，使用 `display=swap`。

## 2. 文字樣式

| 名稱 | 字體 | 大小／行高 | 用途 |
| --- | --- | --- | --- |
| Heading/Display | 昭源甜圓 Bold | 40／48 | 「12 題」大數字 |
| Heading/Title | 昭源甜圓 Bold | 24／32 | 分頁標題、首次開啟標題 |
| Heading/Section | 昭源甜圓 Bold | 20／28 | 卡片標題、空狀態標題、面板標題 |
| Heading/Card | 昭源甜圓 Bold | 18／26 | 揭曉卡片標題、答案選項字母 |
| Body/Button | Noto Sans TC Medium | 16／24 | 按鈕、流程頁首標題 |
| Body/Label | Noto Sans TC Medium | 14／20 | 欄位名稱 |
| Body/Base | Noto Sans TC Regular | 14／22 | 內文、標籤 |
| Body/Small | Noto Sans TC Regular | 13／20 | 說明文字、提示列 |
| Body/Caption | Noto Sans TC Regular | 12／18 | 數據標籤、輔助說明 |

數字（題數、天數、百分比）在數據卡片中用昭源甜圓 Bold 20–22。

## 3. 元件

| 元件 | 規格 |
| --- | --- |
| Button / Primary | 主色底、白字、圓角 10、上下 padding 14、滿寬 |
| Button / Secondary | 白底、1.5px `line` 框線、主色字 |
| Option（A–D、Part） | 高 52、圓角 10；預設白底＋`line` 框線；選取時主色底白字；字母用 Heading/Card |
| Chip（錯因） | 膠囊形、左右 14／上下 8；預設白底＋`line` 框線；選取時主色底白字；「＋ 新增錯因」為 1.5px 虛線、`sub` 色字 |
| Photo | `photo` 底色、圓角 12；有照片時 `object-fit: cover` |
| Banner（提示列） | `primary-soft` 底、主色字、圓角 10、Body/Small |
| Card | 白底、1px `line` 框線、圓角 12，**右上角 0** |
| FoldCorner（折角） | 24×24，貼在卡片右上角：左下三角形 `fold` 色，右上三角形與頁面底色相同，看起來像紙角被折起 |
| Header / Tab | 高 64、左右 padding 24、標題 Heading/Title；複習頁右側齒輪 24px |
| Header / Flow | 高 56、左 ✕ 或 ‹、中間標題 Body/Button、右側次要文字（今日複習中為 Part 色＋粗體） |
| NavBar | 高 84（含 iOS 安全區）、白底、上方 1px `line`；左右兩項為圖示＋文字，選取時主色粗體；中間「＋」為 48px 主色圓形按鈕，帶淡藍陰影 |
| Sheet（底部面板） | 白底、上方圓角 20、padding 24（底部 40）；背後遮罩 `overlay` 45% |
| Progress | 高 4、圓角 2、底 `line`、進度主色 |
| Part 書籤條 | 錯題庫列表項左側 4px 寬、圓角 2、該 Part 顏色 |

**折角出現的位置**：複習頁主卡片、今天沒有到期卡片、揭曉答錯／答對卡片。不要每張卡片都加，它是重點標記。

**Part 顏色出現的位置**：錯題庫書籤條、今日複習頁首的「Part N」文字。之後的統計圖表也沿用。

## 4. 紙狗 Logo

耳朵往下折的紙狗，呼應「Dog-ear」書頁折角的原意。存為 `src/assets/logo.svg`：

```svg
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <polygon points="20,30 48,22 76,30 64,72 48,80 32,72" fill="#FFFFFF" stroke="#1E1E1E" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="20,30 8,60 32,48" fill="#E0A23A" stroke="#1E1E1E" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="76,30 88,60 64,48" fill="#E0A23A" stroke="#1E1E1E" stroke-width="2" stroke-linejoin="round"/>
  <line x1="48" y1="22" x2="48" y2="62" stroke="#1E1E1E" stroke-width="1" stroke-dasharray="3 3"/>
  <circle cx="38" cy="47" r="2.8" fill="#1E1E1E"/>
  <circle cx="58" cy="47" r="2.8" fill="#1E1E1E"/>
  <polygon points="42,62 54,62 48,70" fill="#3E6FB0"/>
</svg>
```

使用位置：空狀態（120px）、複習完成（96px）、首次開啟（80px）、PWA 圖示（以 Logo 置中於 `bg` 色方形底，輸出 192 與 512px，另需 180px `apple-touch-icon`）。

## 5. 畫面對照

| 編號 | 畫面 | Figma 節點 |
| --- | --- | --- |
| 1-1 | 複習頁：有待複習 | [18:214](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-214) |
| 1-2 | 複習頁：還沒有錯題 | [18:237](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-237) |
| 1-3 | 複習頁：今天沒有到期 | [18:251](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-251) |
| 2-1 | 錄入：填寫表單 | [18:275](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-275) |
| 2-2 | 錄入：存檔後選擇 | [18:321](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-321) |
| 2-3 | 錄入：這次寫了幾題 | [18:331](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-331) |
| 3-1 | 今日複習：作答 | [18:346](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-346) |
| 3-2 | 今日複習：答錯 | [18:362](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-362) |
| 3-3 | 今日複習：答對 | [18:381](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-381) |
| 3-4 | 今日複習：完成 | [18:397](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-397) |
| 4-1 | 錯題庫列表 | [18:427](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-427) |
| 4-2 | 單題詳情 | [18:476](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-476) |
| 5-1 | 設定 | [18:501](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-501) |
| 5-2 | 錯因管理 | [18:532](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-532) |
| 5-3 | 首次開啟：加入主畫面 | [18:588](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-588) |

元件總表：[18:177](https://www.figma.com/design/cSiSdZFJReBO2yZKklPwkD?node-id=18-177)

**設計稿尚未定稿的地方**（開發時照本文件與 PRD 處理，不必等設計）：導覽列圖示仍是方塊佔位，先用簡單的線條圖示；照片為灰色佔位；2-2、2-3 面板後方應顯示剛填好的表單。

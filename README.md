# Vocabulary Leaner (Anki Clone) - Spaced Repetition Learning App (個人版)

一個極簡風格的單字學習網頁應用程式，採用間隔重複記憶（SRM）演算法。使用 React、Tailwind CSS 和 Supabase 建構。

**特別說明：這是單用戶版本，無需登入，適合個人使用。**

## 功能特色

### 單字本管理
- 創建和組織多個單字本
- 釘選重要的單字本以快速存取
- 查看每個單字本的統計資料（總數、普通、熟悉）
- 編輯和刪除單字本

### 單字卡片管理
- **單筆新增**：逐一新增單字卡（英文、詞性、中文）
- **批量匯入**：一次匯入多張卡片，支援自訂分隔符（逗號、斜線、管道符號、Tab）
- 批量匯入前可預覽確認
- 刪除個別卡片
- 在全域單字庫中搜尋和排序所有卡片

### 智能測驗系統
- 由anki啟發
- 可選擇多個單字本進行組合測驗
- 精美的翻牌動畫效果
- **間隔重複演算法**：
  - **重來（Again）**：卡片會在本次測驗中重新出現
  - **普通（Normal）**：1 天後複習
  - **熟悉（Familiar）**：漸進式間隔（2 → 4 → 8 天，最多 8 天）
- 測驗中可前後瀏覽卡片
- 完整的測驗總結：
  - 圓餅圖視覺化統計
  - 分類明細（熟悉、普通、需要複習）
  - 每個類別的詳細卡片清單

### 設計理念
- **極簡主義**美學，精緻的灰色調色盤
- **優雅排版**使用 Crimson Pro 和 Inter 字型
- **響應式設計**針對 iPhone 17 Pro、iPad Air 5 和 LG Gram 16" 優化
- 使用 Framer Motion 的流暢動畫和過渡效果
- 乾淨、無干擾的介面

## 快速開始

### 前置需求
- Node.js (v16 或更高版本)
- npm 或 yarn
- Supabase 帳號

### 1. 複製專案
```bash
git clone https://github.com/wcyeee/Vocabulary_learning
cd Vocabulary_learning
```

### 2. 安裝相依套件
```bash
npm install
```

### 3. 設定 Supabase

#### 建立 Supabase 專案
1. 前往 [supabase.com](https://supabase.com)
2. 建立新專案
3. 記下您的專案 URL 和 anon key

#### 設定資料庫
1. 在 Supabase 儀表板中，前往 SQL Editor
2. 複製 `database-schema.sql` 的內容
3. 執行 SQL 腳本以建立資料表和索引

### 4. 設定環境變數
1. 建立.env檔

2. 填入您的 Supabase 憑證：
```env
VITE_SUPABASE_URL=https://your_supabase_project_id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. 執行開發伺服器
```bash
npm run dev
```

應用程式將在 `http://localhost:3000` 上運行


## 資料庫結構

### Notebooks 資料表
```sql
- id: UUID (主鍵)
- name: TEXT
- is_pinned: BOOLEAN
- last_tested_at: TIMESTAMP
- created_at: TIMESTAMP
```

### Cards 資料表
```sql
- id: UUID (主鍵)
- notebook_id: UUID (外鍵指向 notebooks)
- english: TEXT
- part_of_speech: TEXT
- chinese: TEXT
- status: TEXT ('new', 'normal', 'familiar')
- next_review_at: TIMESTAMP
- current_interval: INTEGER
- consecutive_familiar_count: INTEGER
- created_at: TIMESTAMP
```

## 使用方法

### 建立第一個單字本
1. 進入網站（無需登入）
2. 點擊儀表板上的「New Notebook」
3. 輸入名稱並點擊「Create」

### 新增單字卡

#### 單筆模式
1. 開啟單字本並點擊「Add Card」
2. 輸入英文單字、選擇詞性、新增中文翻譯
3. 點擊「Add Card」

#### 批量模式
1. 在單字本檢視中點擊「Batch Add」
2. 選擇您的分隔符（逗號、斜線、管道符號或 Tab）
3. 以 `english{分隔符}part_of_speech{分隔符}chinese` 格式輸入卡片
4. 點擊「Preview」以驗證解析結果
5. 點擊「Add Cards」儲存

批量輸入範例（逗號分隔符）：
```
happy,adj,快樂的
learn,v,學習
spiff,n v,小費、打扮整齊
```

### 開始測驗
1. 從儀表板點擊單字本上的「Quiz」，或
2. 前往 Quiz 頁面並選擇多個單字本
3. 點擊「Start Quiz」
4. 點擊卡片翻轉並顯示答案，電腦可按下空白鍵快速操作
5. 可按下語音鍵聽取英文單字發音，電腦可按下 "v" 鍵快速操作
6. 選擇您的信心程度：
   - **Again（重來）**：需要更多練習（本次測驗中重新出現），電腦可按下數字鍵 "1" 快速操作
   - **Normal（普通）**：有些信心（1 天後複習），電腦可按下數字鍵 "2" 快速操作
   - **Familiar（熟悉）**：非常有信心（2/4/8 天間隔），電腦可按下數字鍵 "3" 快速操作

### 查看所有卡片
1. 從選單導航至「All Cards」
2. 使用搜尋欄尋找特定單字
3. 按字母或新增日期排序

## 設計特色

### 字型
- **展示字型**：Google Sans
- **內文字型**：Inter

### 響應式斷點
- 手機：< 768px（單欄）
- 平板：768px - 1024px（2 欄）
- 桌面：> 1024px（3 欄）

## 🛠️ 技術堆疊

- **前端**：React 18
- **樣式**：Tailwind CSS
- **路由**：React Router DOM
- **動畫**：Framer Motion
- **圖表**：Recharts
- **圖示**：Lucide React
- **資料庫**：Supabase (PostgreSQL)
- **建置工具**：Vite

## 響應式設計

應用程式完全響應式，已在以下裝置測試：
- **iPhone 17 Pro** (393 × 852 px)
- **iPad Air 5** (820 × 1180 px)
- **LG Gram 16"** (1920 × 1200 px)

## 貢獻

這是一個學習專案。歡迎 fork 並根據您的需求進行自訂！

## 授權

MIT License - 可自由用於個人或教育目的。

## 致謝

- 靈感來自 [Anki](https://apps.ankiweb.net/)
- 間隔重複演算法基於 SM-2 原則

---

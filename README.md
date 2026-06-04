# Vocabulary — 個人單字學習應用程式

一個極簡風格的單字學習網頁應用程式，採用間隔重複記憶（SRM）演算法，靈感來自 Anki。使用 React、Tailwind CSS 與 Firebase 建構，專為個人使用設計。

**技術堆疊：** React 18 · Tailwind CSS · Firebase (Auth + Firestore) · Framer Motion · Recharts · Vite

---

## 功能特色

### 單字本管理
- 建立多個單字本，分類整理詞彙
- 釘選常用單字本以快速存取
- 即時顯示每本的卡片統計（總數、普通、熟悉）
- 重新命名、刪除單字本

### 單字卡管理
- **單筆新增**：逐一輸入英文、詞性、中文，並提供 Cambridge Dictionary 快捷連結
- **批量匯入**：支援逗號、斜線、管道符號、Tab 等分隔符，匯入前可預覽確認
- **編輯 / 刪除**：在單字本頁或全局卡片頁皆可操作
- **匯出**：支援 Excel（.xlsx）與 PDF 列印兩種格式

### 智能測驗系統（Anki 風格 SRM）
- 可同時選擇多個單字本組合測驗
- 翻牌動畫，點擊卡片或按空白鍵翻轉
- 按 `V` 鍵隨時播放英文發音（優先使用 Google 高品質語音）
- 三段評分，按數字鍵 1 / 2 / 3 快速操作：
  | 按鈕 | 說明 | 下次複習 |
  |------|------|----------|
  | **Again（重來）** | 本次測驗中重新出現 | — |
  | **Normal（普通）** | 有些把握 | 1 天後 |
  | **Familiar（熟悉）** | 非常有把握 | 2 → 4 → 8 天（漸進） |
- 測驗結束後顯示圓餅圖統計與分類卡片明細

### 全局單字庫（All Cards）
- 跨所有單字本搜尋
- 多種排序方式：字母、新增日期、距複習天數、狀態
- 直接在此頁編輯或刪除卡片

### 其他
- **深色模式**：一鍵切換，偏好設定儲存於 localStorage
- **響應式設計**：針對手機、平板、桌機優化
- **Firebase 登入**：電子郵件 / 密碼驗證，保護個人資料

---

## 快速開始

### 前置需求
- Node.js v16+
- npm 或 yarn
- Firebase 帳號

### 1. 複製並安裝

```bash
git clone https://github.com/wcyeee/vocabulary-learning
cd vocabulary-learning
npm install
```

### 2. 設定 Firebase

#### 建立專案
1. 前往 [console.firebase.google.com](https://console.firebase.google.com)，新增專案（關閉 Google Analytics）

#### 啟用 Authentication
1. 左側選單 → **Authentication** → 開始使用
2. 登入方法 → 啟用**電子郵件 / 密碼**
3. Users 標籤 → 新增使用者（輸入您的 Email 與密碼）

#### 建立 Firestore 資料庫
1. 左側選單 → **Firestore Database** → 建立資料庫
2. 選擇**以實際工作模式啟動**，區域建議選 `asia-east1`
3. 進入 **Rules** 標籤，貼上以下規則後發布：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### 取得 Firebase 設定金鑰
1. 專案設定（齒輪圖示）→ 向下捲動至「您的應用程式」→ 點擊 `</>` 註冊 Web 應用程式
2. 複製 `firebaseConfig` 物件內容備用

### 3. 設定環境變數

在專案根目錄建立 `.env`：

```env
VITE_FIREBASE_API_KEY=您的_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=您的_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=您的_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=您的_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=您的_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=您的_APP_ID
```

### 4. 匯入範例資料（建立資料結構）

```bash
# 先在 importData.mjs 填入您的 Firebase Config (匯入後請記得勿上傳firebase config)
node importData.mjs
```

### 5. 啟動開發伺服器

```bash
npm run dev
# http://localhost:3000
```

> 也可部署至 Vercel，直接連接 GitHub 倉庫即可。

---

## 使用說明

### 新增單字卡

**單筆模式：** 在儀表板點擊「Add Card」，或進入單字本後點擊「Add Card」。輸入英文後可點擊 **Cambridge** 按鈕快速查詞。

**批量模式：** 進入單字本 → 點擊「Batch Add」。每行一張卡片，格式為：

```
english{分隔符}part_of_speech{分隔符}chinese
```

範例（逗號分隔）：
```
serendipity,n,意外發現美好事物的能力
trivialize,v,使顯得不重要、輕視
hurdle,n v,障礙、困難、跨欄
```

### 批量移動/刪除單字卡

進入notebook manage介面或是All Cards介面可批量選擇單字卡進行移動（到其他單字本）或是刪除的動作。

### 測驗流程

1. 儀表板點擊「Quiz」（直接帶入該本），或前往 Quiz 頁面手動選擇多個單字本
2. 點擊卡片或按**空白鍵**翻轉
3. 按 **V** 鍵播放發音
4. 翻開後按 **1 / 2 / 3** 或點擊按鈕評分
5. 測驗完成後查看統計摘要

### 匯出資料

在「All Cards」頁或任一單字本頁，點擊「Export」可選擇匯出為：
- **Excel（.xlsx）**：含編號、英文、詞性、中文、狀態、所屬單字本
- **PDF（列印）**：開啟瀏覽器列印對話框

---

## 資料庫結構

```
notebooks/
  {notebookId}
    name, is_pinned, last_tested_at, createdAt
    cards/
      {cardId}
        english, part_of_speech, chinese
        status           # 'new' | 'normal' | 'familiar'
        next_review_at   # ISO 8601 timestamp
        current_interval # days
        consecutive_familiar_count
        notebook_id, createdAt
```

---

## 響應式支援

| 裝置 | 斷點 | 佈局 |
|------|------|------|
| 手機 | < 768px | 單欄 |
| 平板 | 768–1024px | 雙欄 |
| 桌機 | > 1024px | 三欄 |

測試裝置：iPhone 17 Pro · iPad Air 5 · LG Gram 16"

---

## 授權

MIT License — 可自由用於個人或教育目的。

## 致謝

- 靈感來自 [Anki](https://apps.ankiweb.net/)
- 間隔重複演算法基於 SM-2 原則
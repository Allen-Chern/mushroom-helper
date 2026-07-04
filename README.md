# 蘑菇重生計時器

協作記錄皮克敏手遊蘑菇重新生長時間的小工具。完整設計文件見 [`docs/design.md`](./docs/design.md);線上服務架構(各項雲端服務的用途與申請/設定步驟)見 [`docs/infrastructure.md`](./docs/infrastructure.md)。

## 開發環境設定

```bash
npm install
```

### 1. 建立 Firebase 專案

這個工具需要一個 Firebase 專案來提供多人即時同步(Firestore)。步驟:

1. 前往 [Firebase Console](https://console.firebase.google.com/),用 Google 帳號登入
2. 點「新增專案」,輸入專案名稱(例如 `mushroom-helper`),依畫面指示建立(可關閉 Google Analytics,不需要)
3. 專案建立後,左側選單點 **Databases & Storage** → 在跳出的選單中「NoSQL」分類下點 **Firestore** → 「Create database」(Firebase Console 介面偶爾會調整,若選單長得不太一樣,找「Firestore」這個字即可)
   - 位置選擇離你近的區域(例如 `asia-east1`)
   - 模式選「以正式版模式啟動」(production mode)—— 稍後會用專案內的 `firestore.rules` 覆蓋預設規則
4. 回到專案總覽頁,點網頁圖示(`</>`)「新增應用程式」,註冊一個 Web App(不需要勾選 Firebase Hosting,稍後會另外設定)
5. 註冊完成後畫面會顯示一段 `firebaseConfig` 物件,把裡面的值分別填入專案根目錄的 `.env`(見下一步)

### 2. 設定環境變數

複製範例檔並填入上一步拿到的 config 值:

```bash
cp .env.example .env
```

編輯 `.env`,對應填入(`firebaseConfig` 的 key 對到 `.env` 的 `VITE_FIREBASE_*`):

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxxxxxxx
VITE_FIREBASE_APP_ID=1:xxxxxxxxxx:web:xxxxxxxxxxxxxx
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-v3-site-key
```

`VITE_RECAPTCHA_SITE_KEY` 是第 4 步才會拿到的值,可以先留空,回頭補上即可。

`.env` 已列在 `.gitignore`,不會被提交。

### 3. 部署 Firestore 安全規則

專案內的 `firestore.rules` 定義了存取規則(知道觀察集連結即擁有讀寫權,詳見 `docs/design.md`)。需要用 Firebase CLI 部署:

```bash
npm install -g firebase-tools   # 只需安裝一次
firebase login                  # 用同一個 Google 帳號登入
firebase use --add              # 選擇剛剛建立的專案
firebase deploy --only firestore:rules
```

### 4. 設定 Cloud Functions / Vision API(OCR 用)

OCR 是由一個 Cloud Function(`ocrRecognize`)代打 Google Cloud Vision API,金鑰不會出現在前端程式碼裡(詳見 [`docs/design.md`](./docs/design.md) 決策 #21)。步驟:

1. **升級到 Blaze 方案**:Firebase Console → 左下角「升級」→ 選 Blaze(用量付費)。Blaze 本身有大方的免費額度(Functions 每月 200 萬次呼叫、Vision API 每月 1000 單位),這個規模的用量預期不會實際產生費用,但仍需要綁一張卡才能升級
2. **啟用 Vision API**:[Google Cloud Console](https://console.cloud.google.com/) 選到同一個專案 → API 和服務 → 程式庫 → 搜尋「Cloud Vision API」→ 啟用(不需要建立任何金鑰,Cloud Function 執行時用專案內建的服務帳號身分直接呼叫)
3. **申請 reCAPTCHA v3 site key**(給 App Check 用,擋掉非正式前端的呼叫):前往 [reCAPTCHA 管理後台](https://www.google.com/recaptcha/admin/create),註冊一個 v3 key,網域填 Firebase Hosting 網域(例如 `mushroom-helper.web.app`)
4. **Firebase Console 啟用 App Check**:左側選單「App Check」→ 選這個 Web app → Provider 選 reCAPTCHA v3 → 貼上上一步的 site key
5. 把 site key 填進 `.env` 的 `VITE_RECAPTCHA_SITE_KEY`
6. 部署 function:

   ```bash
   firebase deploy --only functions
   ```

7. 本機開發時,`npm run dev` 會自動接到本機的 Functions emulator(不需要每次改程式都重新部署),但第一次執行需要:

   ```bash
   firebase emulators:start --only functions
   ```

   瀏覽器主控台會印出一組 App Check debug token,把它貼到 Firebase Console → App Check → 這個 Web app → 「管理 debug token」加入允許清單,`npm run dev` 才能正常呼叫 function

## 常用指令

```bash
npm run dev       # 本機開發伺服器
npm run test      # 執行單元測試 (Vitest)
npm run build     # 建置正式版靜態檔案到 dist/
npm run preview   # 本機預覽建置結果
```

## 部署到 Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

部署完成後,Firebase 會提供一個 `https://<專案 ID>.web.app` 網址,即可分享觀察集連結給朋友。

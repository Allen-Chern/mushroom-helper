# 線上架構總覽

記錄這個專案實際用到哪些雲端服務、彼此怎麼串接,以及每一項從零開始怎麼申請/設定。`docs/design.md` 記的是「為什麼這樣設計」的產品決策;這份文件記的是「這些服務具體是什麼、怎麼建立」。

**這份文件不含任何帳號、專案 ID、金鑰等識別資訊**——那些放在 `docs/infrastructure.local.md`(已加進 `.gitignore`,不會被提交)。兩份文件搭配著看。

## 1. 總覽

```
使用者瀏覽器
  └─ Firebase Hosting
       └─ Vue 3 SPA
            ├─ Firebase Firestore ── 觀察集/項目資料,多人即時同步
            ├─ Firebase Cloud Functions ── ocrRecognize
            │    └─ Google Cloud Vision API ── 用 Application Default Credentials 呼叫,無金鑰
            └─ Firebase App Check(reCAPTCHA v3) ── 已註冊但目前未強制,見 infrastructure.local.md 已知問題
```

**成本防護**:
- 專案層級與帳單帳戶層級都設有預算告警(達一定金額寄信通知)
- `ocrRecognize` function 設 `maxInstances` 上限,避免異常流量無限擴張

## 2. 服務清單與申請/設定步驟

### 2.1 Firebase 專案

- **是什麼**:整個後端的容器,底下掛 Firestore / Hosting / Functions / App Check
- **怎麼建立**:[Firebase Console](https://console.firebase.google.com/) → 新增專案(可關閉 Google Analytics)

### 2.2 Firestore

- **是什麼**:觀察集(observation sets)與項目(items)資料的即時資料庫
- **規則檔案**:專案根目錄 `firestore.rules`(知道 setId 即可讀寫,無帳號機制)
- **部署**:`firebase deploy --only firestore:rules`
- **建立方式**:Firebase Console → Firestore Database → 建立資料庫(地區選離使用者近的區域,正式版模式啟動)

### 2.3 Firebase Hosting

- **是什麼**:靜態網站(Vite build 產出的 `dist/`)
- **注意**:Firebase Hosting 預設會同時提供 `<專案ID>.web.app` 和 `<專案ID>.firebaseapp.com` 兩個網域,兩個都指向同一個網站,設定第三方服務(例如 reCAPTCHA)的允許網域時記得兩個都要加
- **部署**:`npm run build && firebase deploy --only hosting`

### 2.4 Cloud Functions(`ocrRecognize`)

- **是什麼**:代打 Google Cloud Vision API 的後端 proxy,金鑰/憑證不落地到前端(見 `docs/design.md` 決策 #21)
- **原始碼位置**:`functions/index.js`
- **設定**:2nd Gen、Node.js 22 runtime、`maxInstances` 上限
- **部署**:`firebase deploy --only functions`
- **呼叫方式**:前端透過 Firebase SDK 的 `httpsCallable` 呼叫,不是直接開網址
- **查 log**:`firebase functions:log --only ocrRecognize`,或 Firebase Console → Functions → Logs 分頁
- **本機測試的限制**:`firebase emulators:start --only functions` 起的 emulator 裡,function 仍會打「真的」Vision API(不是模擬),需要本機有 `gcloud auth application-default login` 設好的憑證。如果開發機沒裝 `gcloud` CLI,這條路走不通,只能靠「直接部署到正式環境測試」

### 2.5 Google Cloud Vision API

- **是什麼**:實際做 OCR 辨識的服務,`ocrRecognize` function 內部呼叫這個
- **啟用方式**:Cloud Console → API 和服務 → 程式庫 → 搜尋「Cloud Vision API」→ Enable(只需要啟用,不用建立任何 API Key)
- **為什麼不需要金鑰**:Cloud Function 執行時自帶一個服務帳號身分,只要 Vision API 在專案內是啟用狀態,`@google-cloud/vision` 這個 client library 會自動用這個身分認證(Application Default Credentials),不用建立/管理/輪替金鑰

### 2.6 Blaze 方案(帳單)

- **為什麼需要**:Cloud Functions 呼叫外部 Google Cloud API(Vision)需要 Blaze 方案,Spark(免費)方案的專案沒辦法部署這種 function
- **升級位置**:Firebase Console → 齒輪 → Usage and billing → Details & settings → Modify plan → 選 Pay as you go(Blaze)→ 選/建立帳單帳戶
- **免費額度**:Cloud Functions 每月 200 萬次呼叫、Vision API 每月 1000 單位,小規模用量預期不會實際產生費用,但仍建議設定預算告警當保險

### 2.7 reCAPTCHA v3 + Firebase App Check

- **設計目的**:讓 `ocrRecognize` function 只接受「真的從我們自己網站來的呼叫」,擋掉外部腳本直接打 function 消耗額度(見 `docs/design.md` 決策 #22)
- **申請 reCAPTCHA v3 site key**:[reCAPTCHA 管理後台](https://www.google.com/recaptcha/admin/create) → Label 隨意 → 類型選 **Score based (v3)** → Domains 把 Hosting 的兩個網域(`.web.app` 和 `.firebaseapp.com`)都加進去,想在本機測試也加 `localhost` → 下方「Google Cloud Platform」欄位選對應的專案(⚠️ 這個下拉選單只會列出「目前登入的 Google 帳號」有權限的專案,如果找不到目標專案,先確認登入帳號是否正確,而不是專案不存在)→ Submit
- **在 Firebase 啟用 App Check**:Firebase Console → App Check → 選 Web app → Register → Provider 選 **reCAPTCHA**(不是 reCAPTCHA Enterprise)→ 貼上 reCAPTCHA 後台的 **secret key**(不是 site key,兩者用途不同,secret key 給 Firebase 後端驗證用,不會出現在前端)
- **前端設定**:site key(公開值,設計上就是給前端用的,但仍建議走環境變數而非寫死)填進 `.env` 的 `VITE_RECAPTCHA_SITE_KEY`,`src/firebase.js` 會用 `initializeAppCheck` 讀取這個值
- **本機開發**:reCAPTCHA v3 在 `localhost` 會用 debug token 取代真的驗證,`src/firebase.js` 已經處理(`import.meta.env.DEV` 時自動設 `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true`),主控台印出的 token 需貼到 Firebase Console → App Check → 這個 Web app →「管理 debug token」

**已知問題**:目前這項防護處於「已設定但暫時停用強制」的狀態,細節與排查方向記在 `docs/infrastructure.local.md`(因為牽涉到具體的 key/專案識別資訊)。

## 3. 環境變數對照表(`.env`)

| 變數 | 來源 |
|---|---|
| `VITE_FIREBASE_API_KEY` 等 6 個 `VITE_FIREBASE_*` | Firebase Console → 專案設定 → 一般 → 你的應用程式 → SDK 設定和程式碼片段 |
| `VITE_RECAPTCHA_SITE_KEY` | §2.7 申請 reCAPTCHA v3 key 拿到的 site key(公開值) |

`.env` 不會被提交(見 `.gitignore`),`functions/` 底下的程式**完全不需要**任何 `.env` 或金鑰設定,靠 Application Default Credentials 運作。

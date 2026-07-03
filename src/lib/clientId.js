// 裝置層級的隨機識別碼,僅用於清單上顯示「最後由誰更新」,不是帳號系統(對應 Decision Log #8)
const STORAGE_KEY = 'mushroom-helper:clientId'

export function getClientId() {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID().slice(0, 8)
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

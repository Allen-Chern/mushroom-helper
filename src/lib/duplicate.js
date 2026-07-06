// 依地標名稱找出「應該被更新」的既有項目。
// 不限 status:已重生待確認(awaiting_confirmation)的地標再次上傳截圖時,
// 應該回到倒數狀態並更新原項目,而不是另外新增一筆。
// 若同名項目有多筆,優先挑 counting 中的;再以 respawnAt 最新的為準。
export function findDuplicateItem(items, locationName) {
  const name = (locationName ?? '').trim()
  if (!name) return null

  const matches = items.filter((item) => (item.locationName ?? '').trim() === name)
  if (matches.length === 0) return null

  const counting = matches.filter((item) => item.status === 'counting')
  const pool = counting.length > 0 ? counting : matches
  return pool.reduce((best, item) => (item.respawnAt > best.respawnAt ? item : best))
}

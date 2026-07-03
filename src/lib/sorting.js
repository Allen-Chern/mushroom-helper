// 對應設計文件 §4.4 排序規則:
// counting 依剩餘時間升冪排最前(越快重生越前面),awaiting_confirmation 依 respawnAt 降冪排最後
export function sortItems(items, nowMs = Date.now()) {
  const counting = items
    .filter((item) => item.status === 'counting')
    .sort((a, b) => (a.respawnAt - nowMs) - (b.respawnAt - nowMs))

  const awaitingConfirmation = items
    .filter((item) => item.status === 'awaiting_confirmation')
    .sort((a, b) => b.respawnAt - a.respawnAt)

  return [...counting, ...awaitingConfirmation]
}

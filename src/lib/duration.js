// 解析遊戲截圖中的剩餘時間文字,例如「剩下1小時5分30秒」「剩下19分7秒」「剩下30秒」
// 各單位皆可缺省,只要至少辨識到一個單位就視為有效
export function parseDurationText(text) {
  if (!text) return null

  const anchorIndex = text.indexOf('剩下')
  const scope = anchorIndex >= 0 ? text.slice(anchorIndex, anchorIndex + 20) : text

  const hourMatch = scope.match(/(\d+)\s*小時/)
  const minuteMatch = scope.match(/(\d+)\s*分(?!鐘)/)
  const secondMatch = scope.match(/(\d+)\s*秒/)

  if (!hourMatch && !minuteMatch && !secondMatch) return null

  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0
  const seconds = secondMatch ? parseInt(secondMatch[1], 10) : 0
  const totalMs = ((hours * 60 + minutes) * 60 + seconds) * 1000

  return { hours, minutes, seconds, totalMs }
}

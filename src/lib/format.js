// 把重生時間戳格式化成牆上時鐘時間(幾點幾分),跨日時加上「明天/昨天」或日期,
// 讓玩家不用心算倒數也知道確切幾點幾分該回來
export function formatClockTime(timestampMs, nowMs = Date.now()) {
  const target = new Date(timestampMs)
  const pad = (n) => String(n).padStart(2, '0')
  const clock = `${pad(target.getHours())}:${pad(target.getMinutes())}`

  const now = new Date(nowMs)
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dayDiff = Math.round((startOfDay(target) - startOfDay(now)) / 86400000)

  if (dayDiff === 0) return clock
  if (dayDiff === 1) return `明天 ${clock}`
  if (dayDiff === -1) return `昨天 ${clock}`
  return `${target.getMonth() + 1}/${target.getDate()} ${clock}`
}

export function formatRemaining(remainingMs) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

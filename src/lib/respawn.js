// 固定緩衝時間,對應設計文件 Decision Log #11(不可調整)
export const BUFFER_MS = 5 * 60 * 1000

export function calculateRespawnAt(photoTimeMs, durationMs) {
  return photoTimeMs + durationMs + BUFFER_MS
}

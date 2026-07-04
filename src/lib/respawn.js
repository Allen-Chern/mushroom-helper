// 固定緩衝時間,對應設計文件 Decision Log #11(不可調整)
export const BUFFER_MS = 5 * 60 * 1000

// 到期後延遲轉為 awaiting_confirmation 的緩衝秒數,讓 ItemCard 的「GO」視覺撐滿這段時間,
// 對應設計文件 Decision Log #25(不可調整)
export const RESPAWN_GRACE_MS = 5 * 1000

export function calculateRespawnAt(photoTimeMs, durationMs) {
  return photoTimeMs + durationMs + BUFFER_MS
}

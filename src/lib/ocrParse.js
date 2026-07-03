import { parseDurationText } from './duration.js'

// 剩餘時間格式相對固定,直接對整段辨識文字做 regex 比對即可(對應設計文件 §4.3)
export function guessDurationText(fullText) {
  return parseDurationText(fullText)
}

// 地標名稱準確度較低,採取「畫面最上方區域內、繁中字元密度最高的一行文字」當猜測值(對應設計文件 §4.3)
// 排除純數字/符號組成的雜訊(例如工作力數字 "59,140"),也排除過短或過長的字串
//
// 以下兩條規則都是實測真實截圖後才發現、修正的:
// 1. 遊戲畫面左下角的倒數 pill 疊在草地背景上時,Tesseract 經常整段誤判成一長串亂碼英數字,
//    且該 pill 垂直位置大約落在畫面 1/3 處,跟原本「上方 1/3」的判斷區間重疊,導致這段亂碼
//    (通常較長)蓋過真正的地標名稱。改用更小的區間(上方 20%)+ 長度上限來降低誤判機率。
// 2. 手機狀態列(時間/訊號/電量)幾乎每張截圖都在最上方,長度常常和地標名稱相近甚至更長,
//    單純比長度會選到狀態列雜訊。地標名稱是繁體中文,狀態列/雜訊通常是英數字,
//    因此改用「中文字元數」當主要排序依據,長度只當 tie-break。
const TOP_REGION_RATIO = 0.2
const MAX_CANDIDATE_LENGTH = 16
const CLOCK_PATTERN = /^\d{1,2}[:.]\d{2}/

function countCjkChars(text) {
  return (text.match(/[一-鿿]/g) ?? []).length
}

export function guessLocationName(lines, imageHeight) {
  if (!lines || lines.length === 0 || !imageHeight) return ''

  const topRegion = imageHeight * TOP_REGION_RATIO
  const candidates = lines
    .filter((line) => line.bbox && line.bbox.y1 <= topRegion)
    .map((line) => line.text.trim())
    .filter(
      (text) =>
        text.length >= 2 &&
        text.length <= MAX_CANDIDATE_LENGTH &&
        !/^[\d,.\s]+$/.test(text) &&
        !CLOCK_PATTERN.test(text),
    )

  if (candidates.length === 0) return ''

  return candidates.reduce((best, current) => {
    const currentCjk = countCjkChars(current)
    const bestCjk = countCjkChars(best)
    if (currentCjk !== bestCjk) return currentCjk > bestCjk ? current : best
    return current.length > best.length ? current : best
  })
}

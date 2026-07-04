import { parseDurationText } from './duration.js'

// 剩餘時間格式相對固定,直接對整段辨識文字做 regex 比對即可(對應設計文件 §4.3)
export function guessDurationText(fullText) {
  return parseDurationText(fullText)
}

// 地標名稱準確度較低,採取「畫面最上方區域內、內容分數最高的一行文字」當猜測值(對應設計文件 §4.3)
//
// 以下規則都是實測真實截圖後才發現、修正的:
// 1. 遊戲畫面左下角的倒數 pill 疊在草地背景上時,Tesseract 經常整段誤判成一長串亂碼英數字,
//    且該 pill 垂直位置大約落在畫面 1/3 處,跟原本「上方 1/3」的判斷區間重疊,導致這段亂碼
//    蓋過真正的地標名稱。改用更小的區間(上方 20%)降低誤判機率。
// 2. 手機狀態列(時間/訊號/電量)幾乎每張截圖都在最上方,長度常常和地標名稱相近甚至更長,
//    單純比長度會選到狀態列雜訊,故排除開頭是時鐘格式(HH:MM)的行。
// 3. 地標名稱可能是中英雙語(例如「輕軌竿蓁林站 LRT Ganzhenlin Station」),曾經因為固定長度上限
//    把這種合法的長地標名稱擋掉;而且「中文字數最多」也不可靠 —— 實測發現一段被誤讀成一長串
//    「一 一 . 1 8」的亂碼,因為重複出現中文數字「一」而在中文字數上贏過另一行雖然中文部分被
//    誤讀、但英文地名部分(LRT GanzhenliniStation)幾乎完整正確的候選行。改用「內容分數」:
//    中文字元 * 3 + 連續 3 個字母以上的英文單字長度,兩者都納入,並拿掉長度上限。
const TOP_REGION_RATIO = 0.2
const CLOCK_PATTERN = /^\d{1,2}[:.]\d{2}/

// 遊戲畫面某些地標名稱後面會多一個「>」箭頭 UI 元素被 OCR 誤判成文字內容
// (例如「金色水岸捷運淡水線介紹牌 >」),屬於畫面固定元素而非地標名稱本身,
// 只去除字串「尾端」由空白/> 組成的那一段,不影響 > 出現在字串中間、或結尾非 > 字元的情況
const TRAILING_ARROW_PATTERN = /[\s>]+$/

function stripTrailingArrow(text) {
  return text.replace(TRAILING_ARROW_PATTERN, '')
}

function countCjkChars(text) {
  return (text.match(/[一-鿿]/g) ?? []).length
}

function countLatinWordChars(text) {
  const words = text.match(/[A-Za-z]{3,}/g) ?? []
  return words.reduce((sum, word) => sum + word.length, 0)
}

function contentScore(text) {
  return countCjkChars(text) * 3 + countLatinWordChars(text)
}

export function guessLocationName(lines, imageHeight) {
  if (!lines || lines.length === 0 || !imageHeight) return ''

  const topRegion = imageHeight * TOP_REGION_RATIO
  const candidates = lines
    .filter((line) => line.bbox && line.bbox.y1 <= topRegion)
    .map((line) => stripTrailingArrow(line.text.trim()))
    .filter((text) => text.length >= 2 && !CLOCK_PATTERN.test(text) && contentScore(text) > 0)

  if (candidates.length === 0) return ''

  return candidates.reduce((best, current) => {
    const currentScore = contentScore(current)
    const bestScore = contentScore(best)
    if (currentScore !== bestScore) return currentScore > bestScore ? current : best
    return current.length > best.length ? current : best
  })
}

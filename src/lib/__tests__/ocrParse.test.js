import { describe, it, expect } from 'vitest'
import { guessLocationName } from '../ocrParse.js'

describe('guessLocationName', () => {
  const imageHeight = 1920 // top region = 1920 * 0.2 = 384

  it('picks the highest content-score line within the top region of the image', () => {
    const lines = [
      { text: '風景變電箱', bbox: { y0: 60, y1: 120 } }, // top region
      { text: '13:40', bbox: { y0: 10, y1: 40 } }, // top region, but clock text -> excluded
      { text: '小 紫色蘑菇', bbox: { y0: 1000, y1: 1050 } }, // below top region -> excluded
    ]

    expect(guessLocationName(lines, imageHeight)).toBe('風景變電箱')
  })

  it('excludes purely numeric/symbol lines (no CJK or Latin word content)', () => {
    const lines = [{ text: '59,140', bbox: { y0: 100, y1: 160 } }]
    expect(guessLocationName(lines, imageHeight)).toBe('')
  })

  it('excludes lines shorter than 2 characters', () => {
    const lines = [{ text: 'A', bbox: { y0: 100, y1: 150 } }]
    expect(guessLocationName(lines, imageHeight)).toBe('')
  })

  // 迴歸測試:實測時發現遊戲截圖左下角的倒數 pill(疊在草地背景上)常被 Tesseract
  // 誤判成一長串英數字亂碼,且該 pill 垂直位置恰好落在畫面 1/3 附近,曾經蓋過真正的
  // 地標名稱被選中。改用更小的上方區間(20%)後,亂碼應該被排除在外。
  it('prefers the real landmark name over long OCR noise near the old 1/3 boundary', () => {
    const lines = [
      { text: '風景變電箱', bbox: { y0: 217, y1: 262 } }, // ~11-14% of height, real landmark
      { text: 'RS 3 A DY FER a a IB', bbox: { y0: 813, y1: 843 } }, // ~32% of height, OCR noise
    ]

    expect(guessLocationName(lines, imageHeight)).toBe('風景變電箱')
  })

  // 迴歸測試:實測時發現手機狀態列("13:40 ..." 這類雜訊)常被明確的時鐘格式規則排除,
  // 但其他不含冒號時間格式的英數字亂碼長度經常和真正的地標名稱相近甚至更長,單純比字串長度
  // 會選到雜訊。改用中文字元密度當主要排序依據後應能避開這類情況。
  it('prefers CJK-dense text over longer Latin/number noise', () => {
    const lines = [
      { text: 'RS 3 A DY FER a', bbox: { y0: 100, y1: 160 } }, // OCR noise, 15 chars, no CJK
      { text: '風景 變 電 箱 > 時', bbox: { y0: 217, y1: 262 } }, // real landmark, 12 chars incl. spaces, has CJK
    ]

    expect(guessLocationName(lines, imageHeight)).toBe('風景 變 電 箱 > 時')
  })

  it('excludes phone status bar clock text (e.g. "13:40")', () => {
    const lines = [{ text: '13:40 7 Mr =', bbox: { y0: 59, y1: 98 } }]
    expect(guessLocationName(lines, imageHeight)).toBe('')
  })

  // 迴歸測試:實測「輕軌竿蓁林站 LRT Ganzhenlin Station」這張截圖時發現,中文部分被誤讀成
  // 亂碼、但英文站名幾乎完整正確的那一行,反而輸給了另一行只是把某處誤讀成重複中文數字
  // 「一」的短亂碼 —— 因為舊邏輯只看「中文字數」,兩個字的「一一」贏過零個中文字的英文站名。
  // 改用「中文字元*3 + 連續英文單字長度」的內容分數,且拿掉長度上限(合法的雙語地標名稱
  // 可能很長),應該要讓資訊量明顯更高的那一行勝出。
  it('prefers a mostly-correct bilingual line over short noise with a repeated CJK numeral', () => {
    const lines = [
      {
        text: '_  &E#,%3HIE LRT GanzhenliniStation > hm',
        bbox: { y0: 189, y1: 302 },
      },
      { text: '一 一 . 1 8', bbox: { y0: 431, y1: 505 } },
    ]

    expect(guessLocationName(lines, imageHeight)).toBe(
      '_  &E#,%3HIE LRT GanzhenliniStation > hm',
    )
  })

  // 遊戲畫面的「>」箭頭 UI 元素有時會被 OCR 誤判成地標名稱的一部分,應該要被去掉
  it('strips a trailing ">" UI arrow icon and surrounding whitespace from the OCR guess', () => {
    const lines = [{ text: '金色水岸捷運淡水線介紹牌 >', bbox: { y0: 100, y1: 160 } }]
    expect(guessLocationName(lines, imageHeight)).toBe('金色水岸捷運淡水線介紹牌')
  })

  it('returns empty string when no lines or no image height', () => {
    expect(guessLocationName([], imageHeight)).toBe('')
    expect(guessLocationName(null, imageHeight)).toBe('')
    expect(guessLocationName([{ text: '風景變電箱', bbox: { y0: 0, y1: 10 } }], 0)).toBe('')
  })
})

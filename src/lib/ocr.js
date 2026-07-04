import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'

// OCR 辨識代理到 Cloud Function(呼叫 Cloud Vision API),金鑰留在後端,前端不持有任何憑證(對應設計文件 §4.1)
const callOcrRecognize = httpsCallable(functions, 'ocrRecognize')

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// 回傳辨識出的整段文字,以及每一行的文字 + 座標(bbox),供 ocrParse.js 判斷地標名稱位置用
export async function recognizeImage(imageFile) {
  const imageBase64 = await fileToBase64(imageFile)
  const { data } = await callOcrRecognize({ imageBase64 })
  return { text: data?.text ?? '', lines: data?.lines ?? [] }
}

// 讀取圖片實際尺寸,用來計算「畫面上方 1/3 區域」
export async function getImageDimensions(imageFile) {
  const bitmap = await createImageBitmap(imageFile)
  const { width, height } = bitmap
  bitmap.close?.()
  return { width, height }
}

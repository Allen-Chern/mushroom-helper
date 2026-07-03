import { createWorker } from 'tesseract.js'

// 延遲建立 worker,第一次呼叫 recognizeImage 才會下載繁中語言包(對應設計文件 §4.1)
let workerPromise = null

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(['chi_tra', 'eng'])
  }
  return workerPromise
}

// 回傳辨識出的整段文字,以及每一行的文字 + 座標(bbox),供 ocrParse.js 判斷地標名稱位置用
export async function recognizeImage(imageFile) {
  const worker = await getWorker()
  const { data } = await worker.recognize(imageFile, {}, { blocks: true, text: true })

  const lines = []
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const text = line.text?.trim()
        if (text) lines.push({ text, bbox: line.bbox })
      }
    }
  }

  return { text: data.text ?? '', lines }
}

// 讀取圖片實際尺寸,用來計算「畫面上方 1/3 區域」
export async function getImageDimensions(imageFile) {
  const bitmap = await createImageBitmap(imageFile)
  const { width, height } = bitmap
  bitmap.close?.()
  return { width, height }
}

export async function terminateOcrWorker() {
  if (workerPromise) {
    const worker = await workerPromise
    await worker.terminate()
    workerPromise = null
  }
}

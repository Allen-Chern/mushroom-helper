const { onCall, HttpsError } = require('firebase-functions/v2/https')
const vision = require('@google-cloud/vision')

const client = new vision.ImageAnnotatorClient()

// 把 paragraph 底下的 word/symbol 依 detectedBreak 重建成一段可讀文字(對應 Vision API 官方文件的標準寫法)
function paragraphText(paragraph) {
  let text = ''
  for (const word of paragraph.words ?? []) {
    for (const symbol of word.symbols ?? []) {
      text += symbol.text
      const breakType = symbol.property?.detectedBreak?.type
      if (breakType === 'SPACE' || breakType === 'SURE_SPACE' || breakType === 'EOL_SURE_SPACE') {
        text += ' '
      }
    }
  }
  return text.trim()
}

// 每個 paragraph 對應畫面上的一行文字,取 boundingBox 的 y 範圍給前端判斷位置用(對應 src/lib/ocrParse.js 的 guessLocationName)
function paragraphBbox(paragraph) {
  const ys = (paragraph.boundingBox?.vertices ?? []).map((v) => v.y ?? 0)
  return { y0: Math.min(...ys), y1: Math.max(...ys) }
}

function extractLines(fullTextAnnotation) {
  const lines = []
  for (const page of fullTextAnnotation?.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        const text = paragraphText(paragraph)
        if (text) lines.push({ text, bbox: paragraphBbox(paragraph) })
      }
    }
  }
  return lines
}

// enforceAppCheck 暫時關閉:2026-07-04 發現 reCAPTCHA v3 驗證持續失敗(assessments 卡在 0,
// grecaptcha.execute 對這把新建的 key 會 503/hang),原因待查,先關閉避免擋下所有正常呼叫
exports.ocrRecognize = onCall(
  { region: 'asia-east1', maxInstances: 10, enforceAppCheck: false },
  async (request) => {
    const imageBase64 = request.data?.imageBase64
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', '缺少圖片內容')
    }

    let result
    try {
      ;[result] = await client.documentTextDetection({
        image: { content: Buffer.from(imageBase64, 'base64') },
      })
    } catch (err) {
      console.error('Vision API 呼叫失敗', err)
      throw new HttpsError('internal', 'OCR 辨識服務暫時無法使用')
    }

    const fullTextAnnotation = result.fullTextAnnotation
    return {
      text: fullTextAnnotation?.text ?? '',
      lines: extractLines(fullTextAnnotation),
    }
  }
)

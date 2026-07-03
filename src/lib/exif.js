// 從 EXIF 區段讀取拍攝時間(優先 DateTimeOriginal 0x9003,其次 DateTime 0x0132)。
// 支援 JPEG(APP1 區段)與 PNG(eXIf chunk,PNG spec 2017 年後加入,iOS 截圖分享/匯出常會帶這段)。
// 讀不到就回傳 null,交給呼叫端 fallback 到 lastModified。這是最小必要子集的手寫解析器,不是完整 EXIF 函式庫。
//
// 實測發現:iOS 截圖(PNG)透過分享/上傳流程匯出時,實際上常帶有 eXIf chunk、且時間精準到秒,
// 一開始只判斷 JPEG 開頭導致完全沒讀到,誤以為只能退回精度較差的 lastModified。
export async function readExifDateTime(file) {
  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer()
    return readExifDateTimeFromBuffer(buffer)
  } catch {
    return null
  }
}

export function readExifDateTimeFromBuffer(buffer) {
  try {
    const view = new DataView(buffer)
    if (view.getUint16(0) === 0xffd8) return readJpegExifDateTime(view)
    if (isPngSignature(view)) return readPngExifDateTime(view)
    return null
  } catch {
    return null
  }
}

function isPngSignature(view) {
  return (
    view.byteLength > 8 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a
  )
}

function readJpegExifDateTime(view) {
  let offset = 2
  while (offset < view.byteLength - 4) {
    const marker = view.getUint16(offset)
    if (marker === 0xffe1) {
      const exifStart = offset + 4
      if (view.getUint32(exifStart) !== 0x45786966) return null // "Exif"
      return parseExifSegment(view, exifStart + 6)
    }
    if ((marker & 0xff00) !== 0xff00) break
    const segmentLength = view.getUint16(offset + 2)
    offset += 2 + segmentLength
  }
  return null
}

// PNG chunk 結構:4 bytes 長度 + 4 bytes type + <長度> bytes 資料 + 4 bytes CRC。
// eXIf chunk 資料本身就是 TIFF/EXIF 格式(不像 JPEG APP1 需要先跳過 "Exif\0\0" 識別字串)。
function readPngExifDateTime(view) {
  let offset = 8
  while (offset + 8 <= view.byteLength) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7),
    )
    const dataStart = offset + 8
    if (type === 'eXIf') return parseExifSegment(view, dataStart)
    if (type === 'IDAT' || type === 'IEND') return null // eXIf 一定會在圖像資料之前出現
    offset = dataStart + length + 4
  }
  return null
}

function parseExifSegment(view, tiffStart) {
  const little = view.getUint16(tiffStart) === 0x4949
  const get32 = (o) => view.getUint32(o, little)
  const firstIfdOffset = get32(tiffStart + 4)
  return readIfd(view, tiffStart, tiffStart + firstIfdOffset, little)
}

function readIfd(view, tiffStart, ifdOffset, little) {
  const get16 = (o) => view.getUint16(o, little)
  const get32 = (o) => view.getUint32(o, little)
  const entryCount = get16(ifdOffset)

  let exifIfdOffset = null
  let dateTimeValue = null

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdOffset + 2 + i * 12
    const tag = get16(entryOffset)
    if (tag === 0x8769) exifIfdOffset = get32(entryOffset + 8)
    if (tag === 0x0132) dateTimeValue = readAsciiValue(view, tiffStart, entryOffset, little)
  }

  if (exifIfdOffset != null) {
    const subIfdOffset = tiffStart + exifIfdOffset
    const subEntryCount = get16(subIfdOffset)
    for (let i = 0; i < subEntryCount; i++) {
      const entryOffset = subIfdOffset + 2 + i * 12
      if (get16(entryOffset) === 0x9003) {
        dateTimeValue = readAsciiValue(view, tiffStart, entryOffset, little)
        break
      }
    }
  }

  return dateTimeValue ? parseExifDateString(dateTimeValue) : null
}

function readAsciiValue(view, tiffStart, entryOffset, little) {
  const get32 = (o) => view.getUint32(o, little)
  const count = get32(entryOffset + 4)
  const valueOffset = count <= 4 ? entryOffset + 8 : tiffStart + get32(entryOffset + 8)
  let str = ''
  for (let i = 0; i < count - 1; i++) {
    str += String.fromCharCode(view.getUint8(valueOffset + i))
  }
  return str
}

// EXIF 日期格式:"YYYY:MM:DD HH:MM:SS"
function parseExifDateString(str) {
  const match = str.match(/(\d{4}):(\d{2}):(\d{2})\s(\d{2}):(\d{2}):(\d{2})/)
  if (!match) return null
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number)
  return new Date(year, month - 1, day, hour, minute, second).getTime()
}

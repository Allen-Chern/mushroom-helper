// 從 JPEG 的 EXIF 區段讀取拍攝時間(優先 DateTimeOriginal 0x9003,其次 DateTime 0x0132)。
// 手機截圖(PNG)通常沒有這段資料,讀不到就回傳 null,交給呼叫端 fallback 到 lastModified。
// 這是最小必要子集的手寫解析器,不是完整 EXIF 函式庫。
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
    if (view.getUint16(0) !== 0xffd8) return null // 不是 JPEG

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
  } catch {
    return null
  }
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

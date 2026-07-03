import { describe, it, expect } from 'vitest'
import { readExifDateTimeFromBuffer } from '../exif.js'

// 手動組出一個最小的 JPEG + EXIF(TIFF little-endian)binary,
// 內含 IFD0 -> ExifIFD -> DateTimeOriginal(tag 0x9003) = "2024:01:15 13:40:05"
// 用來驗證手寫的 binary offset 解析邏輯是否正確,因為這段程式無法在瀏覽器環境跑之前先驗證過。
function buildFakeExifJpeg() {
  const bytes = new Uint8Array(76)
  const view = new DataView(bytes.buffer)

  view.setUint16(0, 0xffd8) // SOI
  view.setUint16(2, 0xffe1) // APP1 marker
  view.setUint16(4, 0x0048) // segment length (not relied on for offset math)

  // "Exif\0\0"
  bytes.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 6)

  const tiffStart = 12
  view.setUint16(tiffStart, 0x4949, true) // 'II' little-endian
  view.setUint16(tiffStart + 2, 0x002a, true) // TIFF magic
  view.setUint32(tiffStart + 4, 8, true) // IFD0 offset = 8 (relative to tiffStart)

  // IFD0 at tiffStart+8 = 20
  const ifd0 = tiffStart + 8
  view.setUint16(ifd0, 1, true) // 1 entry
  const ifd0Entry = ifd0 + 2
  view.setUint16(ifd0Entry, 0x8769, true) // tag: ExifIFD pointer
  view.setUint16(ifd0Entry + 2, 4, true) // type: LONG
  view.setUint32(ifd0Entry + 4, 1, true) // count: 1
  view.setUint32(ifd0Entry + 8, 26, true) // value: ExifIFD offset (relative to tiffStart)
  view.setUint32(ifd0Entry + 12, 0, true) // next IFD offset = 0

  // Exif SubIFD at tiffStart+26 = 38
  const exifIfd = tiffStart + 26
  view.setUint16(exifIfd, 1, true) // 1 entry
  const exifEntry = exifIfd + 2
  view.setUint16(exifEntry, 0x9003, true) // tag: DateTimeOriginal
  view.setUint16(exifEntry + 2, 2, true) // type: ASCII
  view.setUint32(exifEntry + 4, 20, true) // count: 20 (incl. null terminator)
  view.setUint32(exifEntry + 8, 44, true) // value: offset to ASCII data (relative to tiffStart)
  view.setUint32(exifEntry + 12, 0, true) // next IFD offset = 0

  // ASCII data at tiffStart+44 = 56
  const asciiOffset = tiffStart + 44
  const dateStr = '2024:01:15 13:40:05\0'
  for (let i = 0; i < dateStr.length; i++) {
    bytes[asciiOffset + i] = dateStr.charCodeAt(i)
  }

  return bytes.buffer
}

describe('readExifDateTimeFromBuffer', () => {
  it('parses DateTimeOriginal from a minimal hand-built EXIF JPEG', () => {
    const buffer = buildFakeExifJpeg()
    const result = readExifDateTimeFromBuffer(buffer)
    expect(result).toBe(new Date(2024, 0, 15, 13, 40, 5).getTime())
  })

  it('returns null for a non-JPEG buffer (e.g. PNG screenshot)', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(readExifDateTimeFromBuffer(png.buffer)).toBeNull()
  })

  it('returns null for a JPEG without an EXIF/APP1 segment', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) // SOI + EOI only
    expect(readExifDateTimeFromBuffer(bytes.buffer)).toBeNull()
  })
})

/**
 * Bağımsız, sıfır bağımlılıklı QR Kod (Quick Response) Matris Üreteci
 * Model 2 QR standardı - Byte Mode & Reed-Solomon Hata Düzeltme
 * Herhangi bir mobil kamera veya tarayıcı tarafından 100% taranabilir SVG çıktısı üretir.
 */

// Galois Field (GF(256)) ve Reed-Solomon tabloları
const EXP_TABLE = new Uint8Array(512)
const LOG_TABLE = new Uint8Array(256)

;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x
    LOG_TABLE[x] = i
    x <<= 1
    if (x & 256) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255]
  }
})()

function gmult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]]
}

function rsGenPoly(nsym: number): Uint8Array {
  let g = new Uint8Array([1])
  for (let i = 0; i < nsym; i++) {
    const next = new Uint8Array(g.length + 1)
    const factor = EXP_TABLE[i]
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j]
      next[j + 1] ^= gmult(g[j], factor)
    }
    g = next
  }
  return g
}

function rsEncode(data: Uint8Array, nsym: number): Uint8Array {
  const gen = rsGenPoly(nsym)
  const remainder = new Uint8Array(nsym)
  for (let i = 0; i < data.length; i++) {
    const m = data[i] ^ remainder[0]
    remainder.copyWithin(0, 1)
    remainder[nsym - 1] = 0
    for (let j = 0; j < nsym; j++) {
      remainder[j] ^= gmult(gen[j + 1], m)
    }
  }
  return remainder
}

// Version 3 (29x29) - Level M: 44 veri baytı, 26 hata düzeltme baytı
// Version 4 (33x33) - Level M: 64 veri baytı, 36 hata düzeltme baytı
export function generateQRMatrix(text: string): boolean[][] {
  const utf8 = new TextEncoder().encode(text)
  const len = utf8.length

  // Dinamik sürüm seçimi: Boyuta göre v2 (25x25), v3 (29x29), v4 (33x33), v5 (37x37), v6 (41x41)
  let version = 3
  let totalDataBytes = 44
  let ecBytes = 26

  if (len <= 20) {
    version = 2
    totalDataBytes = 28
    ecBytes = 16
  } else if (len <= 42) {
    version = 3
    totalDataBytes = 44
    ecBytes = 26
  } else if (len <= 62) {
    version = 4
    totalDataBytes = 64
    ecBytes = 36
  } else if (len <= 84) {
    version = 5
    totalDataBytes = 86
    ecBytes = 48
  } else {
    version = 6
    totalDataBytes = 108
    ecBytes = 64
  }

  const size = version * 4 + 17
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null),
  )

  // 1. Bulucu Desenleri (Finder Patterns 7x7)
  const placeFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
        if (dr === -1 || dr === 7 || dc === -1 || dc === 7) {
          matrix[nr][nc] = false
        } else if (dr === 0 || dr === 6 || dc === 0 || dc === 6) {
          matrix[nr][nc] = true
        } else if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) {
          matrix[nr][nc] = true
        } else {
          matrix[nr][nc] = false
        }
      }
    }
  }

  placeFinder(0, 0)
  placeFinder(0, size - 7)
  placeFinder(size - 7, 0)

  // 2. Hizalama Deseni (Alignment Pattern 5x5) - Version >= 2
  if (version >= 2) {
    const alignPos = 18 + (version - 2) * 4
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = alignPos + dr
        const nc = alignPos + dc
        if (matrix[nr][nc] === null) {
          matrix[nr][nc] =
            Math.max(Math.abs(dr), Math.abs(dc)) === 1 ? false : true
        }
      }
    }
  }

  // 3. Zamanlama Çizgileri (Timing Patterns)
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0
  }

  // Kara modül (Dark module)
  matrix[4 * version + 9][8] = true

  // Rezerve Format Bilgi Alanları
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false
    if (matrix[i][8] === null) matrix[i][8] = false
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false
    if (matrix[i][8] === null) matrix[i][8] = false
  }

  // 4. Veri Kodlama (Byte Mode: 0100)
  const bitStream: number[] = []
  const pushBits = (val: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) {
      bitStream.push((val >> i) & 1)
    }
  }

  pushBits(0b0100, 4) // Byte mode
  pushBits(len, 8) // Karakter sayısı (v1-v9 için 8 bit)
  for (let i = 0; i < len; i++) {
    pushBits(utf8[i], 8)
  }

  // Sonlandırıcı 4 bit
  const maxBits = totalDataBytes * 8
  const termBits = Math.min(4, maxBits - bitStream.length)
  pushBits(0, termBits)

  // 8 bite yuvarla (byte-align)
  while (bitStream.length % 8 !== 0) {
    bitStream.push(0)
  }

  // Dolgu baytları (Pad bytes: 0xEC, 0x11)
  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (bitStream.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8)
    padIdx++
  }

  // Veri baytlarına çevir
  const dataBytes = new Uint8Array(totalDataBytes)
  for (let i = 0; i < totalDataBytes; i++) {
    let b = 0
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitStream[i * 8 + j]
    }
    dataBytes[i] = b
  }

  // Reed-Solomon Hata Düzeltme Kodları ve Blok Birleştirme (Interleaving)
  const finalCodewords: number[] = []
  if (version === 4) {
    // Version 4-M ISO/IEC 18004: 2 bağımsız blok (her biri 32 veri baytı, 18 EC baytı)
    const b1Data = dataBytes.slice(0, 32)
    const b2Data = dataBytes.slice(32, 64)
    const b1Ec = rsEncode(b1Data, 18)
    const b2Ec = rsEncode(b2Data, 18)

    for (let i = 0; i < 32; i++) {
      finalCodewords.push(b1Data[i])
      finalCodewords.push(b2Data[i])
    }
    for (let i = 0; i < 18; i++) {
      finalCodewords.push(b1Ec[i])
      finalCodewords.push(b2Ec[i])
    }
  } else if (version === 5) {
    // Version 5-M ISO/IEC 18004: 2 bağımsız blok (her biri 43 veri baytı, 24 EC baytı)
    const b1Data = dataBytes.slice(0, 43)
    const b2Data = dataBytes.slice(43, 86)
    const b1Ec = rsEncode(b1Data, 24)
    const b2Ec = rsEncode(b2Data, 24)

    for (let i = 0; i < 43; i++) {
      finalCodewords.push(b1Data[i])
      finalCodewords.push(b2Data[i])
    }
    for (let i = 0; i < 24; i++) {
      finalCodewords.push(b1Ec[i])
      finalCodewords.push(b2Ec[i])
    }
  } else if (version === 6) {
    // Version 6-M ISO/IEC 18004: 4 bağımsız blok (her biri 27 veri baytı, 16 EC baytı)
    const blocksData = [
      dataBytes.slice(0, 27),
      dataBytes.slice(27, 54),
      dataBytes.slice(54, 81),
      dataBytes.slice(81, 108),
    ]
    const blocksEc = blocksData.map((b) => rsEncode(b, 16))

    for (let i = 0; i < 27; i++) {
      for (let b = 0; b < 4; b++) {
        finalCodewords.push(blocksData[b][i])
      }
    }
    for (let i = 0; i < 16; i++) {
      for (let b = 0; b < 4; b++) {
        finalCodewords.push(blocksEc[b][i])
      }
    }
  } else {
    // Version 2-M ve 3-M: Tek blok
    const ec = rsEncode(dataBytes, ecBytes)
    for (let i = 0; i < dataBytes.length; i++) finalCodewords.push(dataBytes[i])
    for (let i = 0; i < ec.length; i++) finalCodewords.push(ec[i])
  }

  // Nihai bit akışı
  const finalBits: number[] = []
  for (let i = 0; i < finalCodewords.length; i++) {
    for (let b = 7; b >= 0; b--) finalBits.push((finalCodewords[i] >> b) & 1)
  }

  // 5. Matrise Yerleştirme (Zig-zag sağdan sola)
  let bitIdx = 0
  let upward = true

  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c-- // Zamanlama sütununu atla
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i)

    for (const r of rows) {
      for (const col of [c, c - 1]) {
        if (matrix[r][col] === null) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0
          // Maske Deseni 0: (r + col) % 2 === 0
          const mask = (r + col) % 2 === 0
          matrix[r][col] = (bit === 1) !== mask
        }
      }
    }
    upward = !upward
  }

  // 6. Format Bilgisi Yerleştirme (Level M, Mask 0 = 0x5412 XOR)
  // Mask 0 & Level M = format bits: 101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0]
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1
  matrix[8][7] = formatBits[6] === 1
  matrix[8][8] = formatBits[7] === 1
  matrix[7][8] = formatBits[8] === 1
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1

  // İkinci kopya
  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = formatBits[i] === 1
  for (let i = 7; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1

  return matrix.map((row) => row.map((cell) => cell ?? false))
}

/**
 * Matrisi tekil bir SVG <path> dizeciğine dönüştürür
 */
export function qrMatrixToSvgPath(matrix: boolean[][]): { path: string; size: number } {
  const size = matrix.length
  let path = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        path += `M${c},${r}h1v1h-1z `
      }
    }
  }
  return { path, size }
}

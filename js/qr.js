/**
 * ============================================================================
 * PURE-JS QR CODE GENERATOR (ISO/IEC 18004, Byte Mode, Versions 1-9, ECC-M)
 * Zero external dependencies — renders crisp inline SVG QR codes offline.
 * ============================================================================
 */

(function (global) {
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) {
      GF_EXP[i] = GF_EXP[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(ecLen) {
    let poly = [1];
    for (let i = 0; i < ecLen; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = GF_EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecLen) {
    const gen = rsGeneratorPoly(ecLen);
    const res = new Uint8Array(data.length + ecLen);
    res.set(data);
    for (let i = 0; i < data.length; i++) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j++) {
          res[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return res.slice(data.length);
  }

  // Versions 1..9 at ECC Level M: [totalDataBytes, ecPerBlock, [[count, dataBytesPerBlock], ...], alignmentCoords, remainderBits]
  const VERSIONS_M = {
    1: [16, 10, [[1, 16]], [], 0],
    2: [28, 16, [[1, 28]], [6, 18], 7],
    3: [44, 26, [[1, 44]], [6, 22], 7],
    4: [64, 18, [[2, 32]], [6, 26], 7],
    5: [86, 24, [[2, 43]], [6, 30], 7],
    6: [108, 16, [[4, 27]], [6, 34], 7],
    7: [124, 18, [[4, 31]], [6, 22, 38], 0],
    8: [154, 22, [[2, 38], [2, 39]], [6, 24, 42], 0],
    9: [182, 22, [[3, 36], [2, 37]], [6, 26, 46], 0]
  };

  function encodeUTF8(str) {
    if (typeof TextEncoder !== "undefined") {
      return Array.from(new TextEncoder().encode(str));
    }
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return bytes;
  }

  function selectVersion(byteLen) {
    for (let v = 1; v <= 9; v++) {
      // Header in byte mode for V1..9 is 4 (mode) + 8 (len) = 12 bits
      const capacityBits = VERSIONS_M[v][0] * 8;
      if (12 + byteLen * 8 <= capacityBits) return v;
    }
    return 9;
  }

  function buildDataCodewords(bytes, version) {
    const totalDataBytes = VERSIONS_M[version][0];
    const maxBytes = totalDataBytes - 2; // safe cap for 4+8 bit header
    const payload = bytes.slice(0, maxBytes);

    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    };

    pushBits(0b0100, 4); // Byte mode
    pushBits(payload.length, 8); // Length for V1..9
    for (const b of payload) pushBits(b, 8);

    const totalBits = totalDataBytes * 8;
    const termLen = Math.min(4, totalBits - bits.length);
    pushBits(0, termLen);
    while (bits.length % 8 !== 0) bits.push(0);

    const out = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
      out.push(byte);
    }

    let padToggle = 0;
    while (out.length < totalDataBytes) {
      out.push(padToggle === 0 ? 0xec : 0x11);
      padToggle ^= 1;
    }
    return out;
  }

  function interleaveBlocks(dataCodewords, version) {
    const [, ecPerBlock, groups] = VERSIONS_M[version];
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;

    for (const [count, blockLen] of groups) {
      for (let i = 0; i < count; i++) {
        const slice = dataCodewords.slice(offset, offset + blockLen);
        offset += blockLen;
        dataBlocks.push(slice);
        ecBlocks.push(Array.from(rsEncode(slice, ecPerBlock)));
      }
    }

    const result = [];
    const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
    for (let i = 0; i < maxDataLen; i++) {
      for (const blk of dataBlocks) {
        if (i < blk.length) result.push(blk[i]);
      }
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (const blk of ecBlocks) {
        result.push(blk[i]);
      }
    }
    return result;
  }

  function createMatrix(version) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
    const isFunc = Array.from({ length: size }, () => new Uint8Array(size));

    const setFunc = (r, c, val) => {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        modules[r][c] = val ? 1 : 0;
        isFunc[r][c] = 1;
      }
    };

    const drawFinder = (r0, c0) => {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const r = r0 + dr;
          const c = c0 + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          const inBox = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          setFunc(r, c, inBox && (onBorder || inCenter) ? 1 : 0);
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      setFunc(6, i, i % 2 === 0 ? 1 : 0);
      setFunc(i, 6, i % 2 === 0 ? 1 : 0);
    }

    // Alignment patterns (skip only if overlapping the 3 finder patterns)
    const coords = VERSIONS_M[version][3];
    for (const r of coords) {
      for (const c of coords) {
        const overlapsFinder =
          (r <= 8 && c <= 8) ||
          (r <= 8 && c >= size - 9) ||
          (r >= size - 9 && c <= 8);
        if (overlapsFinder) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const onEdge = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const center = dr === 0 && dc === 0;
            setFunc(r + dr, c + dc, onEdge || center ? 1 : 0);
          }
        }
      }
    }

    // Dark module + reserve format info
    setFunc(size - 8, 8, 1);
    for (let i = 0; i < 9; i++) {
      if (i !== 6) {
        setFunc(8, i, 0);
        setFunc(i, 8, 0);
      }
    }
    for (let i = 0; i < 8; i++) {
      setFunc(8, size - 1 - i, 0);
      if (i < 7) setFunc(size - 1 - i, 8, 0);
    }

    // Reserve version info for v >= 7
    if (version >= 7) {
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 3; j++) {
          setFunc(i, size - 11 + j, 0);
          setFunc(size - 11 + j, i, 0);
        }
      }
    }

    return { size, modules, isFunc };
  }

  function placeData(matrix, codewords, remainderBits) {
    const { size, modules, isFunc } = matrix;
    const totalBits = [];
    for (const cw of codewords) {
      for (let b = 7; b >= 0; b--) totalBits.push((cw >> b) & 1);
    }
    for (let i = 0; i < remainderBits; i++) totalBits.push(0);

    let bitIdx = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let step = 0; step < size; step++) {
        const r = upward ? size - 1 - step : step;
        for (let colOffset = 0; colOffset < 2; colOffset++) {
          const c = right - colOffset;
          if (!isFunc[r][c]) {
            modules[r][c] = bitIdx < totalBits.length ? totalBits[bitIdx++] : 0;
          }
        }
      }
      upward = !upward;
    }
  }

  function applyMask(modules, isFunc, maskId) {
    const size = modules.length;
    const out = modules.map((row) => Int8Array.from(row));
    const maskFn = [
      (r, c) => (r + c) % 2 === 0,
      (r) => r % 2 === 0,
      (r, c) => c % 3 === 0,
      (r, c) => (r + c) % 3 === 0,
      (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
      (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
      (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
      (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
    ][maskId];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunc[r][c] && maskFn(r, c)) {
          out[r][c] ^= 1;
        }
      }
    }
    return out;
  }

  function computeFormatBits(maskId) {
    // ECC Level M = 00
    const data = (0b00 << 3) | maskId;
    let rem = data << 10;
    const gen = 0x537;
    for (let i = 14; i >= 10; i--) {
      if ((rem >> i) & 1) rem ^= gen << (i - 10);
    }
    return ((data << 10) | rem) ^ 0x5412;
  }

  function computeVersionBits(version) {
    let rem = version << 12;
    const gen = 0x1f25;
    for (let i = 17; i >= 12; i--) {
      if ((rem >> i) & 1) rem ^= gen << (i - 12);
    }
    return (version << 12) | rem;
  }

  function drawFormatAndVersion(modules, version, maskId) {
    const size = modules.length;
    const fmt = computeFormatBits(maskId);
    // ISO/IEC 18004 format information: MSB (bit 14) at (8,0)/(size-1,8) down to LSB (bit 0) at (0,8)/(8,size-1)
    for (let i = 0; i <= 5; i++) {
      const bit = (fmt >> (14 - i)) & 1;
      modules[8][i] = bit;
      modules[size - 1 - i][8] = bit;
    }
    modules[8][7] = (fmt >> 8) & 1;
    modules[size - 7][8] = (fmt >> 8) & 1;
    modules[8][8] = (fmt >> 7) & 1;
    modules[8][size - 8] = (fmt >> 7) & 1;
    modules[7][8] = (fmt >> 6) & 1;
    modules[8][size - 7] = (fmt >> 6) & 1;
    for (let i = 0; i <= 5; i++) {
      const bit = (fmt >> (5 - i)) & 1;
      modules[5 - i][8] = bit;
      modules[8][size - 6 + i] = bit;
    }

    if (version >= 7) {
      const vBits = computeVersionBits(version);
      for (let i = 0; i < 18; i++) {
        const bit = (vBits >> i) & 1;
        const a = Math.floor(i / 3);
        const b = i % 3;
        modules[a][size - 11 + b] = bit;
        modules[size - 11 + b][a] = bit;
      }
    }
  }

  function penaltyScore(modules) {
    const size = modules.length;
    let score = 0;

    // 1. Runs of 5+ same color
    for (let r = 0; r < size; r++) {
      let runRow = 1;
      let runCol = 1;
      for (let c = 1; c < size; c++) {
        if (modules[r][c] === modules[r][c - 1]) {
          runRow++;
          if (runRow === 5) score += 3;
          else if (runRow > 5) score += 1;
        } else {
          runRow = 1;
        }
        if (modules[c][r] === modules[c - 1][r]) {
          runCol++;
          if (runCol === 5) score += 3;
          else if (runCol > 5) score += 1;
        } else {
          runCol = 1;
        }
      }
    }

    // 2. 2x2 blocks
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = modules[r][c];
        if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
          score += 3;
        }
      }
    }

    // 3. Dark ratio
    let dark = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) dark += modules[r][c];
    }
    const pct = (dark * 100) / (size * size);
    const k = Math.floor(Math.abs(pct - 50) / 5);
    score += k * 10;

    return score;
  }

  function generateQRMatrix(text) {
    const bytes = encodeUTF8(text || "https://example.com");
    const version = selectVersion(bytes.length);
    const dataCodewords = buildDataCodewords(bytes, version);
    const interleaved = interleaveBlocks(dataCodewords, version);
    const matrix = createMatrix(version);
    placeData(matrix, interleaved, VERSIONS_M[version][4]);

    let bestModules = null;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const candidate = applyMask(matrix.modules, matrix.isFunc, mask);
      drawFormatAndVersion(candidate, version, mask);
      const s = penaltyScore(candidate);
      if (s < bestScore) {
        bestScore = s;
        bestModules = candidate;
      }
    }
    return bestModules;
  }

  function createQRCodeSVG(text, options = {}) {
    const color = options.color || "#1c1917";
    const bg = options.bg || "#ffffff";
    const modules = generateQRMatrix(text);
    const size = modules.length;
    const quiet = 4;
    const viewSize = size + quiet * 2;
    const paths = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (modules[r][c] === 1) {
          paths.push(`M${c + quiet},${r + quiet}h1v1h-1z`);
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges" role="img" aria-label="QR Code">
      <rect width="${viewSize}" height="${viewSize}" fill="${bg}"/>
      <path d="${paths.join("")}" fill="${color}"/>
    </svg>`;
  }

  global.WeddingQR = {
    generateMatrix: generateQRMatrix,
    createSVG: createQRCodeSVG
  };
})(window);

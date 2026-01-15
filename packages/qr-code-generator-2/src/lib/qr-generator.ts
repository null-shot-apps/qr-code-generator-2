/**
 * QR Code Generator - Zero External Dependencies
 * Implements QR Code generation algorithm from scratch
 */

// Error correction levels
export enum ErrorCorrectionLevel {
  L = 0, // ~7% correction
  M = 1, // ~15% correction
  Q = 2, // ~25% correction
  H = 3, // ~30% correction
}

// QR Code mode
enum Mode {
  NUMERIC = 1,
  ALPHANUMERIC = 2,
  BYTE = 4,
}

// Galois Field arithmetic for Reed-Solomon error correction
class GaloisField {
  private exp: number[] = [];
  private log: number[] = [];

  constructor() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.exp[i] = x;
      this.log[x] = i;
      x = x << 1;
      if (x & 0x100) {
        x ^= 0x11d;
      }
    }
  }

  multiply(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.exp[(this.log[a] + this.log[b]) % 255];
  }
}

const GF = new GaloisField();

// Reed-Solomon error correction
function generateErrorCorrection(data: number[], ecLength: number): number[] {
  const generator = getGeneratorPolynomial(ecLength);
  const result = [...data, ...new Array(ecLength).fill(0)];

  for (let i = 0; i < data.length; i++) {
    const coef = result[i];
    if (coef !== 0) {
      for (let j = 0; j < generator.length; j++) {
        result[i + j] ^= GF.multiply(generator[j], coef);
      }
    }
  }

  return result.slice(data.length);
}

function getGeneratorPolynomial(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const newPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      newPoly[j] ^= poly[j];
      newPoly[j + 1] ^= GF.multiply(poly[j], Math.pow(2, i));
    }
    poly = newPoly;
  }
  return poly;
}

// QR Code structure
class QRCode {
  private modules: boolean[][] = [];
  private size: number;
  private version: number;

  constructor(version: number) {
    this.version = version;
    this.size = version * 4 + 17;
    this.modules = Array(this.size)
      .fill(null)
      .map(() => Array(this.size).fill(false));
  }

  getSize(): number {
    return this.size;
  }

  getModule(x: number, y: number): boolean {
    return this.modules[y]?.[x] || false;
  }

  setModule(x: number, y: number, value: boolean): void {
    if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
      this.modules[y][x] = value;
    }
  }

  drawFinderPattern(x: number, y: number): void {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          this.setModule(xx, yy, dist !== 1 && dist !== 5);
        }
      }
    }
  }

  drawAlignmentPattern(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        this.setModule(x + dx, y + dy, dist !== 1);
      }
    }
  }

  drawTimingPatterns(): void {
    for (let i = 8; i < this.size - 8; i++) {
      this.setModule(i, 6, i % 2 === 0);
      this.setModule(6, i, i % 2 === 0);
    }
  }

  drawFormatInfo(ecLevel: ErrorCorrectionLevel, mask: number): void {
    const data = (ecLevel << 3) | mask;
    let bits = data;
    for (let i = 0; i < 10; i++) {
      bits = (bits << 1) ^ ((bits >> 9) * 0x537);
    }
    const formatBits = ((data << 10) | bits) ^ 0x5412;

    // Draw format info around finder patterns
    for (let i = 0; i <= 5; i++) {
      this.setModule(8, i, ((formatBits >> i) & 1) === 1);
    }
    this.setModule(8, 7, ((formatBits >> 6) & 1) === 1);
    this.setModule(8, 8, ((formatBits >> 7) & 1) === 1);
    this.setModule(7, 8, ((formatBits >> 8) & 1) === 1);
    for (let i = 9; i < 15; i++) {
      this.setModule(14 - i, 8, ((formatBits >> i) & 1) === 1);
    }

    for (let i = 0; i < 8; i++) {
      this.setModule(this.size - 1 - i, 8, ((formatBits >> i) & 1) === 1);
    }
    for (let i = 8; i < 15; i++) {
      this.setModule(8, this.size - 15 + i, ((formatBits >> i) & 1) === 1);
    }

    this.setModule(8, this.size - 8, true); // Dark module
  }

  placeData(data: number[]): void {
    let bitIndex = 0;
    let direction = -1;

    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;

      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const y = direction === -1 ? this.size - 1 - vert : vert;

          if (!this.isFunction(x, y)) {
            const bit = bitIndex < data.length * 8 ? ((data[Math.floor(bitIndex / 8)] >> (7 - (bitIndex % 8))) & 1) === 1 : false;
            this.setModule(x, y, bit);
            bitIndex++;
          }
        }
      }
      direction = -direction;
    }
  }

  private isFunction(x: number, y: number): boolean {
    // Check if position is part of finder patterns
    if ((x <= 8 && y <= 8) || (x >= this.size - 8 && y <= 8) || (x <= 8 && y >= this.size - 8)) {
      return true;
    }
    // Check timing patterns
    if (x === 6 || y === 6) {
      return true;
    }
    return false;
  }

  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.isFunction(x, y)) {
          let invert = false;
          switch (mask) {
            case 0:
              invert = (x + y) % 2 === 0;
              break;
            case 1:
              invert = y % 2 === 0;
              break;
            case 2:
              invert = x % 3 === 0;
              break;
            case 3:
              invert = (x + y) % 3 === 0;
              break;
            case 4:
              invert = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
              break;
            case 5:
              invert = ((x * y) % 2) + ((x * y) % 3) === 0;
              break;
            case 6:
              invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
              break;
            case 7:
              invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
              break;
          }
          if (invert) {
            this.setModule(x, y, !this.getModule(x, y));
          }
        }
      }
    }
  }
}

// Encode data
function encodeData(text: string, version: number, ecLevel: ErrorCorrectionLevel): number[] {
  const mode = Mode.BYTE;
  const data: number[] = [];

  // Mode indicator (4 bits)
  addBits(data, mode, 4);

  // Character count indicator
  const charCountBits = version <= 9 ? 8 : 16;
  addBits(data, text.length, charCountBits);

  // Data
  for (let i = 0; i < text.length; i++) {
    addBits(data, text.charCodeAt(i), 8);
  }

  // Terminator
  addBits(data, 0, Math.min(4, getCapacity(version, ecLevel) * 8 - data.length));

  // Pad to byte boundary
  while (data.length % 8 !== 0) {
    data.push(0);
  }

  // Pad bytes
  const bytes: number[] = [];
  for (let i = 0; i < data.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (data[i + j] || 0);
    }
    bytes.push(byte);
  }

  const capacity = getCapacity(version, ecLevel);
  const padBytes = [0xec, 0x11];
  while (bytes.length < capacity) {
    bytes.push(padBytes[bytes.length % 2]);
  }

  return bytes;
}

function addBits(data: number[], value: number, bits: number): void {
  for (let i = bits - 1; i >= 0; i--) {
    data.push((value >> i) & 1);
  }
}

function getCapacity(version: number, ecLevel: ErrorCorrectionLevel): number {
  const capacities = [
    [19, 16, 13, 9],
    [34, 28, 22, 16],
    [55, 44, 34, 26],
    [80, 64, 48, 36],
    [108, 86, 62, 46],
  ];
  return capacities[Math.min(version - 1, 4)]?.[ecLevel] || 19;
}

function getErrorCorrectionLength(version: number, ecLevel: ErrorCorrectionLevel): number {
  const ecLengths = [
    [7, 10, 13, 17],
    [10, 16, 22, 28],
    [15, 26, 36, 44],
    [20, 36, 52, 64],
    [26, 48, 72, 88],
  ];
  return ecLengths[Math.min(version - 1, 4)]?.[ecLevel] || 7;
}

// Main generation function
export function generateQRCode(text: string, ecLevel: ErrorCorrectionLevel = ErrorCorrectionLevel.M): QRCode {
  // Determine version based on data length
  let version = 1;
  while (version <= 5 && text.length > getCapacity(version, ecLevel)) {
    version++;
  }

  const qr = new QRCode(version);

  // Draw function patterns
  qr.drawFinderPattern(3, 3);
  qr.drawFinderPattern(qr.getSize() - 4, 3);
  qr.drawFinderPattern(3, qr.getSize() - 4);
  qr.drawTimingPatterns();

  // Encode data
  const dataBytes = encodeData(text, version, ecLevel);
  const ecLength = getErrorCorrectionLength(version, ecLevel);
  const ecBytes = generateErrorCorrection(dataBytes, ecLength);
  const allBytes = [...dataBytes, ...ecBytes];

  // Place data
  qr.placeData(allBytes);

  // Apply best mask
  const mask = 0; // Using mask 0 for simplicity
  qr.applyMask(mask);
  qr.drawFormatInfo(ecLevel, mask);

  return qr;
}

// Export as SVG
export function toSVG(qr: QRCode, border: number = 4): string {
  const size = qr.getSize();
  const totalSize = size + border * 2;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">`;
  svg += `<rect width="${totalSize}" height="${totalSize}" fill="#ffffff"/>`;
  svg += '<path d="';
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (qr.getModule(x, y)) {
        svg += `M${x + border},${y + border}h1v1h-1z`;
      }
    }
  }
  
  svg += '" fill="#000000"/>';
  svg += '</svg>';
  
  return svg;
}

// Export as PNG (returns data URL)
export function toPNG(qr: QRCode, scale: number = 10, border: number = 4): string {
  const size = qr.getSize();
  const totalSize = (size + border * 2) * scale;
  
  const canvas = document.createElement('canvas');
  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalSize, totalSize);
  
  // Black modules
  ctx.fillStyle = '#000000';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (qr.getModule(x, y)) {
        ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
      }
    }
  }
  
  return canvas.toDataURL('image/png');
}


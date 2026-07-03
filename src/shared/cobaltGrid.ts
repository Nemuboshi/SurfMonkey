const DESCRAMBLE_SECRET = "4wXCKprMMoxnyJ3PocJFs4CYbfnbazNe";

function rotateLeft32(value: number, shift: number): number {
  const normalized = shift % 32;
  return (((value << normalized) >>> 0) | (value >>> (32 - normalized))) >>> 0;
}

class Xoshiro128StarStar {
  private readonly state: Uint32Array;

  constructor(seed: Uint32Array) {
    if (seed.length !== 4) {
      throw new Error(`seed.length !== 4 (seed.length: ${seed.length})`);
    }
    this.state = new Uint32Array(seed);
    if (this.state[0] === 0 && this.state[1] === 0 && this.state[2] === 0 && this.state[3] === 0) {
      this.state[0] = 1;
    }
  }

  next(): number {
    const result = (9 * rotateLeft32((5 * this.state[1]) >>> 0, 7)) >>> 0;
    const t = (this.state[1] << 9) >>> 0;
    this.state[2] = (this.state[2] ^ this.state[0]) >>> 0;
    this.state[3] = (this.state[3] ^ this.state[1]) >>> 0;
    this.state[1] = (this.state[1] ^ this.state[2]) >>> 0;
    this.state[0] = (this.state[0] ^ this.state[3]) >>> 0;
    this.state[2] = (this.state[2] ^ t) >>> 0;
    this.state[3] = rotateLeft32(this.state[3], 11);
    return result;
  }
}

export async function descrambleCobaltGridImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  blockSizeH: number,
  blockSizeV: number,
  key: string,
): Promise<Uint8ClampedArray> {
  const bytesPerElement = 4;
  if (width <= 0 || height <= 0 || blockSizeH <= 0 || blockSizeV <= 0) {
    throw new Error("invalid image geometry");
  }
  if (data.length !== width * height * bytesPerElement) {
    throw new Error("image data length is invalid");
  }

  const rows = Math.ceil(height / blockSizeV);
  const columns = Math.floor(width / blockSizeH);
  const shuffleTable = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, (_, index) => index),
  );

  const seedBytes = new TextEncoder().encode(`${DESCRAMBLE_SECRET}${key}`);
  const digest = await crypto.subtle.digest("SHA-256", seedBytes);
  const random = new Xoshiro128StarStar(new Uint32Array(digest, 0, 4));
  for (let index = 0; index < 100; index += 1) {
    random.next();
  }

  for (let row = 0; row < rows; row += 1) {
    const line = shuffleTable[row];
    for (let index = columns - 1; index >= 1; index -= 1) {
      const picked = random.next() % (index + 1);
      const temp = line[index];
      line[index] = line[picked];
      line[picked] = temp;
    }
  }

  for (let row = 0; row < rows; row += 1) {
    const line = shuffleTable[row];
    const reversed = line.map((_, index) => line.indexOf(index));
    if (reversed.some((value) => value < 0)) {
      throw new Error("failed to reverse shuffle table");
    }
    shuffleTable[row] = reversed;
  }

  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    const row = shuffleTable[Math.floor(y / blockSizeV)] ?? [];
    for (let block = 0; block < columns; block += 1) {
      const sourceBlock = row[block] ?? block;
      const destinationOffset = (y * width + block * blockSizeH) * bytesPerElement;
      const sourceOffset = (y * width + sourceBlock * blockSizeH) * bytesPerElement;
      const copyLength = blockSizeH * bytesPerElement;
      for (let index = 0; index < copyLength; index += 1) {
        out[destinationOffset + index] = data[sourceOffset + index];
      }
    }

    const tailStart = (y * width + columns * blockSizeH) * bytesPerElement;
    const lineEnd = (y * width + width) * bytesPerElement;
    for (let index = tailStart; index < lineEnd; index += 1) {
      out[index] = data[index];
    }
  }

  return out;
}

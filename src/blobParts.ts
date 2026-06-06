export function bytesToBlobPart(bytes: Uint8Array): BlobPart {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function bytesToImageDataArray(bytes: Uint8ClampedArray): ImageDataArray {
  const copy = new Uint8ClampedArray(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

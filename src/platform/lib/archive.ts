function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const u16 = (view: DataView, offset: number, value: number) => view.setUint16(offset, value, true);
const u32 = (view: DataView, offset: number, value: number) => view.setUint32(offset, value, true);

/** Dependency-free ZIP writer using STORE, shared by local-first module exports. */
export function buildZip(entries: { name: string; bytes: Uint8Array }[]): Blob {
  const encoder = new TextEncoder();
  const files = entries.map((entry) => ({ ...entry, nameBytes: encoder.encode(entry.name), crc: crc32(entry.bytes) }));
  const localSize = files.reduce((total, file) => total + 30 + file.nameBytes.length + file.bytes.length, 0);
  const centralSize = files.reduce((total, file) => total + 46 + file.nameBytes.length, 0);
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  let offset = 0;
  const offsets: number[] = [];
  for (const file of files) {
    offsets.push(offset);
    u32(view, offset, 0x04034b50); u16(view, offset + 4, 20); u16(view, offset + 6, 0x0800); u16(view, offset + 8, 0);
    u32(view, offset + 14, file.crc); u32(view, offset + 18, file.bytes.length); u32(view, offset + 22, file.bytes.length); u16(view, offset + 26, file.nameBytes.length);
    output.set(file.nameBytes, offset + 30); output.set(file.bytes, offset + 30 + file.nameBytes.length);
    offset += 30 + file.nameBytes.length + file.bytes.length;
  }
  const centralOffset = offset;
  files.forEach((file, index) => {
    u32(view, offset, 0x02014b50); u16(view, offset + 4, 20); u16(view, offset + 6, 20); u16(view, offset + 8, 0x0800); u16(view, offset + 10, 0);
    u32(view, offset + 16, file.crc); u32(view, offset + 20, file.bytes.length); u32(view, offset + 24, file.bytes.length); u16(view, offset + 28, file.nameBytes.length); u32(view, offset + 42, offsets[index]);
    output.set(file.nameBytes, offset + 46); offset += 46 + file.nameBytes.length;
  });
  u32(view, offset, 0x06054b50); u16(view, offset + 8, files.length); u16(view, offset + 10, files.length); u32(view, offset + 12, offset - centralOffset); u32(view, offset + 16, centralOffset);
  return new Blob([output], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

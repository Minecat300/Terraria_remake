export async function zipImagesAndDownload(bitmapArray, zipFilename) {
  const encoder = new TextEncoder();
  const files = [];
  let offset = 0;
  const centralDirectory = [];

  for (let i = 0; i < bitmapArray.length; i++) {
    const bitmap = bitmapArray[i];

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0);

    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const arrayBuffer = await blob.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    const name = `image${i + 1}.png`;
    const nameBytes = encoder.encode(name);

    const crc = crc32(fileData);
    const size = fileData.length;

    const localHeader = writeLocalFileHeader(nameBytes, crc, size);

    files.push(localHeader);
    files.push(fileData);

    const centralHeader = writeCentralDirectoryHeader(nameBytes, crc, size, offset);

    centralDirectory.push(centralHeader);

    offset += localHeader.length + fileData.length;
  }

  const centralSize = centralDirectory.reduce((sum, c) => sum + c.length, 0);
  const centralOffset = offset;

  const endRecord = new Uint8Array(22);
  let p = 0;
  endRecord.set([0x50, 0x4b, 0x05, 0x06], p); p += 4;       // End of central dir signature
  endRecord.set([0x00, 0x00], p); p += 2;                   // Number of this disk
  endRecord.set([0x00, 0x00], p); p += 2;                   // Disk where central directory starts
  const count = centralDirectory.length;
  endRecord.set(toBytes(count, 2), p); p += 2;               // Number of central directory records on this disk
  endRecord.set(toBytes(count, 2), p); p += 2;               // Total number of central directory records
  endRecord.set(toBytes(centralSize, 4), p); p += 4;         // Size of central directory (bytes)
  endRecord.set(toBytes(centralOffset, 4), p); p += 4;       // Offset of start of central directory
  endRecord.set([0x00, 0x00], p);                            // Comment length

  const blob = new Blob([...files, ...centralDirectory, endRecord], { type: 'application/zip' });
  download(blob, zipFilename, 'application/zip');
}

function writeLocalFileHeader(nameBytes, crc, size) {
  const header = new Uint8Array(30 + nameBytes.length);
  let p = 0;
  header.set([0x50, 0x4b, 0x03, 0x04], p); p += 4;        // Local file header signature
  header.set([0x14, 0x00], p); p += 2;                    // Version needed to extract
  header.set([0x00, 0x00], p); p += 2;                    // General purpose bit flag
  header.set([0x00, 0x00], p); p += 2;                    // Compression method (0 = no compression)
  header.set([0x00, 0x00, 0x00, 0x00], p); p += 4;        // File modification time and date
  header.set(toBytes(crc, 4), p); p += 4;                  // CRC-32
  header.set(toBytes(size, 4), p); p += 4;                 // Compressed size
  header.set(toBytes(size, 4), p); p += 4;                 // Uncompressed size
  header.set(toBytes(nameBytes.length, 2), p); p += 2;    // File name length
  header.set([0x00, 0x00], p); p += 2;                     // Extra field length
  header.set(nameBytes, p); p += nameBytes.length;         // File name
  return header;
}

function writeCentralDirectoryHeader(nameBytes, crc, size, offset) {
  const header = new Uint8Array(46 + nameBytes.length);
  let p = 0;
  header.set([0x50, 0x4b, 0x01, 0x02], p); p += 4;        // Central directory file header signature
  header.set([0x14, 0x00], p); p += 2;                    // Version made by
  header.set([0x14, 0x00], p); p += 2;                    // Version needed to extract
  header.set([0x00, 0x00], p); p += 2;                    // General purpose bit flag
  header.set([0x00, 0x00], p); p += 2;                    // Compression method
  header.set([0x00, 0x00, 0x00, 0x00], p); p += 4;        // File modification time and date
  header.set(toBytes(crc, 4), p); p += 4;                  // CRC-32
  header.set(toBytes(size, 4), p); p += 4;                 // Compressed size
  header.set(toBytes(size, 4), p); p += 4;                 // Uncompressed size
  header.set(toBytes(nameBytes.length, 2), p); p += 2;    // File name length
  header.set([0x00, 0x00], p); p += 2;                     // Extra field length
  header.set([0x00, 0x00], p); p += 2;                     // File comment length
  header.set([0x00, 0x00], p); p += 2;                     // Disk number start
  header.set([0x00, 0x00], p); p += 2;                     // Internal file attributes
  header.set([0x00, 0x00, 0x00, 0x00], p); p += 4;         // External file attributes
  header.set(toBytes(offset, 4), p); p += 4;                // Relative offset of local header
  header.set(nameBytes, p); p += nameBytes.length;         // File name
  return header;
}

function toBytes(num, length) {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = num & 0xff;
    num >>>= 8;
  }
  return bytes;
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ buf[i]) & 0xff];
  }
  return ~crc >>> 0;
}

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();
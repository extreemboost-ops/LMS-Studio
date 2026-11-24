import zlib from "node:zlib";

/**
 * Standard CRC-32 calculation with universal fallback table
 */
export function calculateCrc32(buf: Buffer): number {
  if (typeof (zlib as any).crc32 === "function") {
    return (zlib as any).crc32(buf) >>> 0;
  }

  // Precomputed CRC32 table fallback
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export interface ZipEntryInput {
  name: string;
  data: Buffer | string;
  comment?: string;
  date?: Date;
}

interface ProcessedEntry {
  name: string;
  nameBuffer: Buffer;
  compressedData: Buffer;
  uncompressedSize: number;
  compressedSize: number;
  crc32: number;
  compressionMethod: number; // 8 = Deflated, 0 = Stored
  modTime: number;
  modDate: number;
  localHeaderOffset: number;
}

/**
 * High-performance, zero-external-dependency PKZIP 2.0 Archiver
 */
export class ZipArchiveService {
  private entries: ZipEntryInput[] = [];

  /**
   * Add a file or text asset to the zip archive
   */
  public addFile(name: string, content: Buffer | string): this {
    // Normalize path separators to forward slashes (standard ZIP spec)
    const normalizedName = name.replace(/\\/g, "/").replace(/^\/+/, "");
    this.entries.push({ name: normalizedName, data: content });
    return this;
  }

  /**
   * Add a JSON object serialized as pretty or compact JSON
   */
  public addJson(name: string, obj: unknown, pretty = true): this {
    const jsonStr = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
    return this.addFile(name, jsonStr);
  }

  /**
   * Convert JS Date to MS-DOS date and time integers
   */
  private static toDosDateTime(d: Date = new Date()): { modDate: number; modTime: number } {
    const year = Math.max(1980, d.getFullYear());
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = Math.floor(d.getSeconds() / 2);

    const modDate = ((year - 1980) << 9) | (month << 5) | day;
    const modTime = (hours << 11) | (minutes << 5) | seconds;
    return { modDate, modTime };
  }

  /**
   * Builds and packages the entries into a single valid PKZIP Buffer
   */
  public buildZip(): Buffer {
    const processed: ProcessedEntry[] = [];
    const localChunks: Buffer[] = [];
    let currentOffset = 0;

    for (const entry of this.entries) {
      const uncompressed = Buffer.isBuffer(entry.data)
        ? entry.data
        : Buffer.from(entry.data, "utf-8");

      const uncompressedSize = uncompressed.length;
      const crc = calculateCrc32(uncompressed);

      // Deflate compression
      let compressedData: Buffer;
      let compressionMethod = 8; // Deflate

      if (uncompressedSize === 0) {
        compressedData = Buffer.alloc(0);
        compressionMethod = 0; // Stored
      } else {
        const deflated = zlib.deflateRawSync(uncompressed, { level: 6 });
        // Use stored if deflated didn't save space
        if (deflated.length >= uncompressedSize) {
          compressedData = uncompressed;
          compressionMethod = 0;
        } else {
          compressedData = deflated;
        }
      }

      const { modDate, modTime } = ZipArchiveService.toDosDateTime(entry.date);
      const nameBuffer = Buffer.from(entry.name, "utf-8");

      // 1. Construct Local File Header (30 bytes + name length)
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
      localHeader.writeUInt16LE(20, 4); // Version needed to extract (2.0)
      localHeader.writeUInt16LE(0x0800, 6); // General purpose bit flag (UTF-8)
      localHeader.writeUInt16LE(compressionMethod, 8); // Compression method
      localHeader.writeUInt16LE(modTime, 10); // Last mod file time
      localHeader.writeUInt16LE(modDate, 12); // Last mod file date
      localHeader.writeUInt32LE(crc, 14); // CRC-32
      localHeader.writeUInt32LE(compressedData.length, 18); // Compressed size
      localHeader.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
      localHeader.writeUInt16LE(nameBuffer.length, 26); // File name length
      localHeader.writeUInt16LE(0, 28); // Extra field length

      const localRecord = Buffer.concat([localHeader, nameBuffer, compressedData]);
      localChunks.push(localRecord);

      processed.push({
        name: entry.name,
        nameBuffer,
        compressedData,
        uncompressedSize,
        compressedSize: compressedData.length,
        crc32: crc,
        compressionMethod,
        modTime,
        modDate,
        localHeaderOffset: currentOffset,
      });

      currentOffset += localRecord.length;
    }

    const centralDirectoryOffset = currentOffset;
    const centralChunks: Buffer[] = [];

    // 2. Construct Central Directory File Headers (46 bytes + name length each)
    for (const p of processed) {
      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0); // Central file header signature
      centralHeader.writeUInt16LE(20, 4); // Version made by (2.0)
      centralHeader.writeUInt16LE(20, 6); // Version needed to extract (2.0)
      centralHeader.writeUInt16LE(0x0800, 8); // General purpose bit flag (UTF-8)
      centralHeader.writeUInt16LE(p.compressionMethod, 10); // Compression method
      centralHeader.writeUInt16LE(p.modTime, 12); // Last mod file time
      centralHeader.writeUInt16LE(p.modDate, 14); // Last mod file date
      centralHeader.writeUInt32LE(p.crc32, 16); // CRC-32
      centralHeader.writeUInt32LE(p.compressedSize, 20); // Compressed size
      centralHeader.writeUInt32LE(p.uncompressedSize, 24); // Uncompressed size
      centralHeader.writeUInt16LE(p.nameBuffer.length, 28); // File name length
      centralHeader.writeUInt16LE(0, 30); // Extra field length
      centralHeader.writeUInt16LE(0, 32); // File comment length
      centralHeader.writeUInt16LE(0, 34); // Disk number start
      centralHeader.writeUInt16LE(0, 36); // Internal file attributes
      centralHeader.writeUInt32LE(0, 38); // External file attributes
      centralHeader.writeUInt32LE(p.localHeaderOffset, 42); // Relative offset of local header

      centralChunks.push(Buffer.concat([centralHeader, p.nameBuffer]));
    }

    const centralDirectoryBuffer = Buffer.concat(centralChunks);
    const centralDirectorySize = centralDirectoryBuffer.length;

    // 3. Construct End of Central Directory Record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
    eocd.writeUInt16LE(0, 4); // Number of this disk
    eocd.writeUInt16LE(0, 6); // Disk where central directory starts
    eocd.writeUInt16LE(processed.length, 8); // Number of central directory records on this disk
    eocd.writeUInt16LE(processed.length, 10); // Total number of central directory records
    eocd.writeUInt32LE(centralDirectorySize, 12); // Size of central directory
    eocd.writeUInt32LE(centralDirectoryOffset, 16); // Offset of start of central directory
    eocd.writeUInt16LE(0, 20); // Comment length

    return Buffer.concat([...localChunks, centralDirectoryBuffer, eocd]);
  }

  /**
   * Inspect and read Central Directory entries from a ZIP buffer
   */
  public static readZipEntries(
    zipBuffer: Buffer
  ): Array<{ name: string; uncompressedSize: number; compressedSize: number; crc32: number }> {
    const entries: Array<{
      name: string;
      uncompressedSize: number;
      compressedSize: number;
      crc32: number;
    }> = [];

    // Search for End of Central Directory signature (0x06054b50) from the end
    let eocdOffset = -1;
    for (let i = zipBuffer.length - 22; i >= 0; i--) {
      if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error("Invalid ZIP archive: End of Central Directory signature not found");
    }

    const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
    const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

    let offset = centralDirOffset;
    for (let i = 0; i < totalEntries; i++) {
      if (zipBuffer.readUInt32LE(offset) !== 0x02014b50) {
        break;
      }
      const crc32 = zipBuffer.readUInt32LE(offset + 16);
      const compressedSize = zipBuffer.readUInt32LE(offset + 20);
      const uncompressedSize = zipBuffer.readUInt32LE(offset + 24);
      const nameLength = zipBuffer.readUInt16LE(offset + 28);
      const extraLength = zipBuffer.readUInt16LE(offset + 30);
      const commentLength = zipBuffer.readUInt16LE(offset + 32);

      const name = zipBuffer.toString("utf-8", offset + 46, offset + 46 + nameLength);
      entries.push({ name, uncompressedSize, compressedSize, crc32 });

      offset += 46 + nameLength + extraLength + commentLength;
    }

    return entries;
  }
}

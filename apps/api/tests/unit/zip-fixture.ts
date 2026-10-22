import { deflateRawSync } from 'node:zlib';

export interface ZEntry { name: string; data: Buffer; method?: 0 | 8; declaredSize?: number; sameOffsetAs?: number }
export function makeZip(entries: ZEntry[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  const offsets: number[] = [];
  let pos = 0;
  entries.forEach((e, i) => {
    const method = e.method ?? 8;
    const body = method === 8 ? deflateRawSync(e.data) : e.data;
    const name = Buffer.from(e.name);
    const size = e.declaredSize ?? e.data.length;
    let offset = pos;
    if (e.sameOffsetAs !== undefined) offset = offsets[e.sameOffsetAs];
    else {
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(method, 8);
      local.writeUInt32LE(body.length, 18); local.writeUInt32LE(size, 22); local.writeUInt16LE(name.length, 26);
      parts.push(local, name, body);
      pos += 30 + name.length + body.length;
    }
    offsets.push(offset);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(method, 10);
    c.writeUInt32LE(body.length, 20); c.writeUInt32LE(size, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, name);
    void i;
  });
  const cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(pos, 16);
  return Buffer.concat([...parts, cd, eocd]);
}

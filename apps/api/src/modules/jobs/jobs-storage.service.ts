import { Injectable } from '@nestjs/common';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class JobsStorageService {
  private readonly root = path.resolve(
    process.env.RECRUITMENT_RESUMES_PATH
      || path.join(process.env.SUPPORT_ATTACHMENTS_PATH || path.join(process.cwd(), 'data', 'attachments'), 'recruitment'),
  );

  async save(key: string, buffer: Buffer) {
    const target = this.resolveKey(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer, { flag: 'wx' });
    return key;
  }

  async remove(key: string) {
    await fs.unlink(this.resolveKey(key)).catch(() => undefined);
  }

  stream(key: string) {
    return createReadStream(this.resolveKey(key));
  }

  private resolveKey(key: string) {
    const target = path.resolve(this.root, key);
    if (target !== this.root && !target.startsWith(`${this.root}${path.sep}`)) {
      throw new Error('Invalid recruitment storage key');
    }
    return target;
  }
}

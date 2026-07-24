export abstract class SupportStorageService {
  abstract saveFile(key: string, buffer: Buffer): Promise<string>;
  abstract deleteFile(key: string): Promise<void>;
  abstract getFileStream(key: string): Promise<NodeJS.ReadableStream>;
  abstract fileExists(key: string): Promise<boolean>;
  abstract getFilePath(key: string): string;
}
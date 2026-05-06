import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  version: process.versions.electron,
});

import type { IaStatus } from './ia.types.js';

export class IaDomainService {
  getStatus(): IaStatus {
    return {
      status: 'ok',
      module: 'ia',
      runtime: 'typescript-domain',
      pythonBridge: 'available-as-adapter',
    };
  }
}

export * from './services/index.js';

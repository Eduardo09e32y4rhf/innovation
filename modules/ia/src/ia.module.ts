import { IaDomainService } from './ia.service.js';

export function createIaModule() {
  return {
    name: 'ia',
    service: new IaDomainService(),
  };
}

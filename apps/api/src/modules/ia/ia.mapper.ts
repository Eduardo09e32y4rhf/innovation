import type { IaStatus } from '../../../../../modules/ia/src/ia.types';

export function mapIaStatus(status: IaStatus) {
  return {
    ...status,
    service: 'innovation-api',
  };
}

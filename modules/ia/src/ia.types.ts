export * from './contracts/index.js';

export interface IaStatus {
  status: 'ok';
  module: 'ia';
  runtime: 'typescript-domain';
  pythonBridge: 'available-as-adapter';
}

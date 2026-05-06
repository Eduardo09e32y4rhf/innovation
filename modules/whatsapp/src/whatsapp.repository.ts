export interface WhatsappAdapterRepository {
  readonly legacyPath: 'WHATSAPP';
  readonly mode: 'safe-adapter';
}

export const whatsappAdapterRepository: WhatsappAdapterRepository = {
  legacyPath: 'WHATSAPP',
  mode: 'safe-adapter',
};

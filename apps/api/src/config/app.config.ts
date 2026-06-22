export const appConfig = () => ({
  apiPort: Number(process.env.API_PORT ?? process.env.PORT ?? 3333),
  jwtSecret: process.env.JWT_SECRET ?? process.env.SECRET_KEY ?? 'innovation-rh-connect-local-development-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '60m',
  databaseUrl: process.env.DATABASE_URL,
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8001',
});

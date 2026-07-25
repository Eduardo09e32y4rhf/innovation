import { vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Configura compatibilidade global do Jest para que testes legados funcionem no Vitest
(global as any).jest = vi;

// Load .env.test if exists, otherwise fallback to .env.test.example
const rootDir = path.resolve(__dirname, '../../');
const envTestPath = path.join(rootDir, '.env.test');
const envExamplePath = path.join(rootDir, '.env.test.example');

if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true });
} else if (fs.existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath, override: true });
}

process.env.NODE_ENV = 'test';

// Garante segurança dupla para que nunca conecte no banco de produção
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('5436')) {
  console.warn('⚠️ AVISO: DATABASE_URL não parece apontar para a porta 5436 do banco de teste. Forçando configuração de teste...');
  process.env.DATABASE_URL = 'postgresql://innovation_test:test_password_123@localhost:5436/innovation_test_db?schema=public';
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

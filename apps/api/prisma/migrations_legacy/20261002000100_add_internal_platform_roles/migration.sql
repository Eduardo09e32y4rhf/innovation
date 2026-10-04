-- P1: perfis internos da plataforma. Migracao aditiva e compativel com dados existentes.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CEO';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CONTABIL';

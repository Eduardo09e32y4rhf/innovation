-- RH - R&S: perfil de cliente restrito a recrutamento (sem acesso a funcionarios, folha ou usuarios)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RH_RS';

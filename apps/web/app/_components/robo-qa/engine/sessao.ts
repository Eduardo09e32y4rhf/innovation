/** Nunca atribuir testes a um perfil apenas porque alguma sessão existe. */
export function identidadeConfere(atual: { email: string; perfil: string } | null, esperado: { email: string; perfil: string }): boolean {
  return !!atual && atual.perfil === esperado.perfil && atual.email.trim().toLowerCase() === esperado.email.trim().toLowerCase();
}

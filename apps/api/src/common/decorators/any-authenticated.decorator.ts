import { SetMetadata } from '@nestjs/common';

export const ANY_AUTHENTICATED_KEY = 'anyAuthenticated';

/**
 * Rota "so logado": qualquer usuario autenticado pode chamar (dados do proprio usuario/empresa, ex.: notificacoes, /auth/me).
 * O RolesGuard nega por padrao (SEG-09): rota sem `@Roles`, sem `@AnyAuthenticated()` e sem `@Public()` responde 403.
 */
export const AnyAuthenticated = () => SetMetadata(ANY_AUTHENTICATED_KEY, true);

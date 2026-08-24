/**
 * Credenciais e parâmetros de conexão com o sistema SSW.
 */
export interface SswCredentials {
  domain?: string;      // Domínio / Empresa SSW (opcional)
  username: string;     // Usuário/CPF
  password: string;     // Senha
  baseUrl?: string;     // URL base (ex: https://ssw.inf.br)
  defaultUnid?: string; // Filial padrão (ex: 'VGA')
}

/**
 * Estado interno da sessão SSW no backend.
 * NUNCA deve ser transmitido para o cliente React.
 */
export interface SswSessionState {
  isAuthenticated: boolean;
  cookies: string[];
  authenticatedUser?: string;
  domain?: string;
  unid?: string;
  lastAuthenticatedAt?: string; // ISO 8601
  expiresAt?: string;           // ISO 8601
}

/**
 * Perfil de sessão para suportar múltiplos operadores/filiais no futuro.
 */
export interface SswSessionProfile {
  profileId: string;
  name: string;
  credentials: SswCredentials;
  state: SswSessionState;
}

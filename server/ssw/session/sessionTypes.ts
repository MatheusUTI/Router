/**
 * Credenciais e parâmetros de conexão com o sistema SSW.
 * Modelagem explícita de acordo com o protocolo comprovado do SSW.
 * useri != usuario:
 * - useri: identificador em f2 e cookie useri
 * - usuario: login operacional em f3
 */
export interface SswCredentials {
  empresa: string;      // Sigla/domínio da empresa (f1, sigla_emp, ssw_dom)
  useri: string;        // Identificador useri (f2)
  usuario: string;      // Login operacional (f3)
  senha: string;        // Senha operacional (f4)
  unidade?: string;     // Filial / Unidade operacional (f2 no 455, f4 na fila 156, ex: 'VGA')
  baseUrl?: string;     // URL base do SSW (default: 'https://sistema.ssw.inf.br')

  // Aliases de compatibilidade
  domain?: string;
  username?: string;
  password?: string;
  defaultUnid?: string;
}

/**
 * Estado interno da sessão SSW no backend.
 * NUNCA deve ser transmitido para o cliente React.
 */
export interface SswSessionState {
  isAuthenticated: boolean;
  cookies: string[];
  authenticatedUser?: string;
  authenticatedUseri?: string;
  authenticatedEmpresa?: string;
  authenticatedUnid?: string;
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


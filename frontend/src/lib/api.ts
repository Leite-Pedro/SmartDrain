/**
 * Endereço da API, em um lugar só.
 *
 * Antes cada tela trazia "http://localhost:5000" escrito à mão — dez ocorrências
 * em seis arquivos, metade com localhost e metade com 127.0.0.1. Para apontar a
 * dashboard para a API de outra máquina era preciso caçar todas.
 *
 * Agora vem de NEXT_PUBLIC_API_URL, definida em frontend/.env.local. O prefixo
 * NEXT_PUBLIC_ é exigido pelo Next para que a variável chegue ao navegador: as
 * chamadas partem do cliente, não do servidor.
 *
 * O padrão continua sendo a máquina local, então quem roda API e dashboard no
 * mesmo computador não precisa configurar nada.
 */
export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

// ---------------------------------------------------------------------------
// Sessão de quem administra pela dashboard.
//
// As rotas de /api/usuarios exigem "Authorization: Bearer <token>" desde que o
// app do funcionário ganhou login — e a dashboard continuou mandando requisição
// pelada, o que devolvia "Faça login para continuar." em todo cadastro.
//
// O token é o mesmo que /api/login devolve para o app, e vale 12 h. Fica no
// localStorage para não pedir senha a cada F5, com uma cópia em memória porque
// navegador em aba anônima pode recusar o storage — nesse caso a sessão dura
// enquanto a aba estiver aberta, em vez de não funcionar.
// ---------------------------------------------------------------------------
const CHAVE_TOKEN = "smartdrain_token";

let tokenEmMemoria: string | null = null;

export function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN) ?? tokenEmMemoria;
  } catch {
    return tokenEmMemoria;
  }
}

export function guardarToken(token: string | null) {
  tokenEmMemoria = token;
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // Sem storage: segue só com a cópia em memória.
  }
}

/** Cabeçalho de autorização, ou objeto vazio quando não há sessão. */
export function autorizacao(): Record<string, string> {
  const token = lerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

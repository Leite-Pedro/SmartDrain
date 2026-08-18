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

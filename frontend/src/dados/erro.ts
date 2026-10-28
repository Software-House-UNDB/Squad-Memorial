/** Resposta HTTP de erro (o status ajuda a tela a escolher a mensagem). */
export class ErroHttp extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

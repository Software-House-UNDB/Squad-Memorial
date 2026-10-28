// Os testes unitários rodam no Node; o projeto não instala @types/node, então só o que eles usam.
declare module 'node:fs' {
  export function readFileSync(caminho: string | URL, codificacao: 'utf8'): string;
}

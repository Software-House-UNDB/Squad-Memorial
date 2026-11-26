// Padrão das mensagens (Conventional Commits): "tipo(escopo opcional): descrição", em português.
// A CI confere só o título do PR (.github/workflows/commitlint.yml), que vira a mensagem do squash merge.
// Tipos: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
// Ex.: "feat(check-in): confirma o e-mail com código" · "fix: totem não voltava ao início"
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0], // português: nomes próprios e siglas no começo da frase são normais
    'header-max-length': [2, 'always', 100],
  },
};

// Testes de mutação (npm run test:mutacao): o Stryker altera o código (troca < por <=, apaga um if...) e confere se
// algum teste unitário falha. Mutante que sobrevive = trecho que os testes não protegem de verdade.
// Roda nas regras puras, que é onde estão os testes unitários; as telas são cobertas pelo e2e.
// CI: .github/workflows/mutacao.yml (semanal e manual), com o relatório HTML como artefato.
export default {
  testRunner: 'vitest',
  mutate: [
    'src/dados/regras.ts',
    'src/dados/validacao.ts',
    'src/dados/redes.ts',
    'src/dados/termo.ts',
    'src/config/sala.ts',
    'src/config/observabilidade.ts',
  ],
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  // Abaixo de `break` a CI reprova. Comece só medindo e suba o valor conforme os testes melhorarem.
  thresholds: { high: 80, low: 60, break: 50 },
  coverageAnalysis: 'perTest',
  tempDirName: '.stryker-tmp',
};

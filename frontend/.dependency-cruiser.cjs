/**
 * Contratos de arquitetura do frontend (npm run lint:arquitetura). Cada regra quebrada reprova a CI.
 *
 *   telas ──► componentes ──► dados ──► config
 *     │            │            │
 *     └────────────┴────────────┴──► quiosque (palco, inatividade, guardas)
 *   checkin (página do celular) ──► componentes, dados, config   (nunca telas nem quiosque)
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'sem-ciclos',
      comment: 'Imports circulares quebram a ordem de inicialização e escondem acoplamento.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'dados-sem-interface',
      comment: 'dados/ (API, regras, tipos) não conhece telas nem componentes: as regras ficam testáveis sem React DOM.',
      severity: 'error',
      from: { path: '^src/dados/' },
      to: { path: '^src/(telas|componentes|checkin)/' },
    },
    {
      name: 'componentes-sem-telas',
      comment: 'componentes/ são peças reutilizáveis: não dependem das telas nem do check-in.',
      severity: 'error',
      from: { path: '^src/componentes/' },
      to: { path: '^src/(telas|checkin)/' },
    },
    {
      name: 'checkin-fora-do-quiosque',
      comment: 'O check-in roda no celular do visitante: sem palco, guardas de quiosque, inatividade nem telas do totem.',
      severity: 'error',
      from: { path: '^src/checkin/' },
      to: { path: '^src/(telas|quiosque)/' },
    },
    {
      name: 'totem-sem-checkin',
      comment: 'O totem só mostra o QR Code; o formulário do check-in não entra no bundle do totem.',
      severity: 'error',
      from: { path: '^src/(telas|quiosque|componentes)/' },
      to: { path: '^src/checkin/' },
    },
    {
      name: 'quiosque-base',
      comment: 'quiosque/ é a base do totem: não depende das telas.',
      severity: 'error',
      from: { path: '^src/quiosque/' },
      to: { path: '^src/telas/' },
    },
    {
      name: 'sem-arquivo-orfao',
      comment: 'Arquivo que ninguém importa (o Knip também confere).',
      severity: 'error',
      from: { orphan: true, pathNot: ['\\.test\\.ts$', '\\.d\\.ts$', '(^|/)main\\.tsx$', '\\.css$'] },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    exclude: { path: '\\.(png|jpg|svg|woff2?)$' },
  },
};

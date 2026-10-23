/**
 * ACERVO DEMONSTRATIVO (fixture do teste de formato, acervo.test.ts)
 * ---------------------------------------------------------------------------
 * O app NÃO usa este arquivo: o acervo vem da API (GET /api/totem/). O mesmo
 * conteúdo é carregado no banco por `python manage.py carregar_exemplo`.
 *
 * Tudo aqui é conteúdo de demonstração (demo: true): títulos, anos, textos e
 * relacionamentos existem só para exercitar as telas. NADA disto é fato
 * histórico da UNDB. Substituir pelo acervo oficial mantendo o formato de
 * `tipos.ts` (o ideal é carregar um JSON exportado do acervo).
 *
 * Única informação verificada: Maria Izabel Rodrigues, fundadora da UNDB
 * (fonte pública: ABMES). A biografia e o retrato dela continuam pendentes.
 * ---------------------------------------------------------------------------
 */
import type { Acervo, Depoimento, Documento, Foto, Marco, Periodo, Pessoa, TomPlaca } from './tipos';

const DEMO = { descricao: 'Conteúdo demonstrativo · substituir pelo acervo oficial' };

const periodos: Periodo[] = [
  { id: 'p-1980', inicio: 1980, fim: 1989, titulo: 'Os primeiros anos', descricao: 'Texto demonstrativo do período: duas ou três frases de contexto sobre a década, escritas a partir da pesquisa no acervo.', fotoId: 'f-p-1980', demo: true, fonte: DEMO },
  { id: 'p-1990', inicio: 1990, fim: 1999, titulo: 'Os anos de expansão', descricao: 'Texto demonstrativo do período: duas ou três frases que dão contexto antes dos marcos, sem repetir o que cada cartão já conta.', fotoId: 'f-p-1990', demo: true, fonte: DEMO },
  { id: 'p-2000', inicio: 2000, fim: 2009, titulo: 'Novos cursos e espaços', descricao: 'Texto demonstrativo do período. O texto definitivo deve sair da pesquisa no acervo e ser validado pela instituição.', fotoId: 'f-p-2000', demo: true, fonte: DEMO },
  { id: 'p-2010', inicio: 2010, fim: 2019, titulo: 'Um campus em obras', descricao: 'Texto demonstrativo do período, com o contexto geral da década em linguagem simples e direta.', fotoId: 'f-p-2010', demo: true, fonte: DEMO },
  { id: 'p-2020', inicio: 2020, fim: 2029, titulo: 'Novos tempos', descricao: 'Texto demonstrativo do período mais recente. Este período continua aberto e recebe novos marcos.', fotoId: 'f-p-2020', demo: true, fonte: DEMO },
];

interface MarcoBase extends Omit<Marco, 'fotoIds' | 'demo' | 'fonte'> {
  nFotos: number;
}

const marcosBase: MarcoBase[] = [
  { id: 'm-1985', periodoId: 'p-1980', ano: 1985, tipo: 'predio', titulo: 'Primeiras salas de aula', resumo: 'O começo das atividades em poucas salas.', lede: 'As primeiras turmas ocupavam um espaço pequeno.', narrativa: ['Texto demonstrativo do acontecimento, em até três frases: o que mudou, para quem e por que importa. O texto definitivo vem da pesquisa no acervo.'], documentoIds: [], pessoaIds: ['pe-02'], nFotos: 4 },
  { id: 'm-1988', periodoId: 'p-1980', ano: 1988, tipo: 'foto', titulo: 'Primeira biblioteca', resumo: 'Um acervo inicial para estudo e pesquisa.', lede: 'Livros doados e comprados formaram o primeiro acervo.', narrativa: ['Texto demonstrativo do acontecimento, com a informação essencial em linguagem simples.'], documentoIds: [], pessoaIds: [], nFotos: 3 },
  { id: 'm-1991', periodoId: 'p-1990', ano: 1991, tipo: 'pessoa', titulo: 'Primeira turma formada', resumo: 'Colação no auditório provisório.', lede: 'A primeira colação de grau reuniu famílias e professores.', narrativa: ['Texto demonstrativo do acontecimento: quem estava lá, onde foi e o que significou para a comunidade acadêmica.'], documentoIds: [], pessoaIds: ['pe-04', 'pe-03'], depoimentoId: 'dp-1', nFotos: 8 },
  { id: 'm-1994', periodoId: 'p-1990', ano: 1994, tipo: 'predio', titulo: 'Novo prédio administrativo', resumo: 'A secretaria deixa as salas de aula.', lede: 'A administração ganhou um prédio próprio.', narrativa: ['Texto demonstrativo do acontecimento, com o que mudou na rotina de alunos e funcionários.'], documentoIds: [], pessoaIds: [], nFotos: 4 },
  { id: 'm-1998', periodoId: 'p-1990', ano: 1998, tipo: 'predio', conquista: true, titulo: 'Inauguração do novo bloco', resumo: 'Salas, laboratórios e biblioteca maior.', lede: 'O campus ganhou salas, laboratórios e uma biblioteca maior.', narrativa: ['Texto demonstrativo do acontecimento, em até três frases: o que mudou, para quem e por que importa.', 'Um segundo parágrafo demonstrativo aparece em "Ler mais", para mostrar como textos longos são tratados sem rolar a página.'], documentoIds: ['d-1998'], pessoaIds: ['pe-02', 'pe-06'], depoimentoId: 'dp-2', nFotos: 6 },
  { id: 'm-1999', periodoId: 'p-1990', ano: 1999, tipo: 'foto', titulo: 'Biblioteca ampliada', resumo: 'Novo acervo e sala de estudos.', lede: 'A biblioteca dobrou de tamanho.', narrativa: ['Texto demonstrativo do acontecimento.'], documentoIds: [], pessoaIds: [], nFotos: 6 },
  { id: 'm-2002', periodoId: 'p-2000', ano: 2002, tipo: 'documento', conquista: true, titulo: 'Autorização de novos cursos', resumo: 'A oferta de graduação se amplia.', lede: 'Novos cursos passaram a ser oferecidos.', narrativa: ['Texto demonstrativo do acontecimento, citando o documento que registra a autorização.'], documentoIds: ['d-2002'], pessoaIds: ['pe-05'], nFotos: 2 },
  { id: 'm-2004', periodoId: 'p-2000', ano: 2004, tipo: 'pessoa', titulo: 'Primeira formatura no novo auditório', resumo: 'Cerimônia registrada em fotos e no livro de atas.', lede: 'O auditório recebeu sua primeira colação.', narrativa: ['Texto demonstrativo do acontecimento.'], documentoIds: [], pessoaIds: ['pe-08'], depoimentoId: 'dp-3', nFotos: 14 },
  { id: 'm-2008', periodoId: 'p-2000', ano: 2008, tipo: 'predio', titulo: 'Laboratórios renovados', resumo: 'Equipamentos novos para as aulas práticas.', lede: 'Os laboratórios foram reformados e equipados.', narrativa: ['Texto demonstrativo do acontecimento.'], documentoIds: ['d-2008'], pessoaIds: [], nFotos: 5 },
  { id: 'm-2012', periodoId: 'p-2010', ano: 2012, tipo: 'predio', titulo: 'Novo centro de convivência', resumo: 'Um espaço de encontro para a comunidade.', lede: 'O campus ganhou um lugar para conversar e descansar.', narrativa: ['Texto demonstrativo do acontecimento.'], documentoIds: [], pessoaIds: ['pe-07'], nFotos: 5 },
  { id: 'm-2016', periodoId: 'p-2010', ano: 2016, tipo: 'documento', conquista: true, titulo: 'Reconhecimento de curso', resumo: 'Registro oficial de qualidade de um curso.', lede: 'Um curso recebeu reconhecimento oficial.', narrativa: ['Texto demonstrativo do acontecimento, com referência ao documento oficial.'], documentoIds: ['d-2016'], pessoaIds: ['pe-05'], nFotos: 3 },
  { id: 'm-2021', periodoId: 'p-2020', ano: 2021, tipo: 'foto', titulo: 'Aulas e eventos em novo formato', resumo: 'A comunidade se adapta a novas rotinas.', lede: 'Aulas e eventos ganharam novos formatos.', narrativa: ['Texto demonstrativo do acontecimento.'], documentoIds: [], pessoaIds: [], depoimentoId: 'dp-4', nFotos: 4 },
  { id: 'm-2024', periodoId: 'p-2020', ano: 2024, tipo: 'predio', titulo: 'Novo espaço de pesquisa', resumo: 'Um lugar dedicado a projetos e pesquisa.', lede: 'Projetos de pesquisa ganharam espaço próprio.', narrativa: ['Texto demonstrativo do acontecimento.'], documentoIds: [], pessoaIds: [], nFotos: 3 },
];

const tons: TomPlaca[] = [3, 1, 4, 2, 5];

const fotos: Foto[] = [];

// fotos de capa de cada período
periodos.forEach((p, i) => {
  fotos.push({
    id: `f-p-${p.inicio}`, tom: tons[(i + 2) % 5], periodoId: p.id, ano: p.inicio,
    data: `Década de ${p.inicio}`, legenda: `Fotografia demonstrativa do período ${p.inicio}–${p.fim}.`,
    alt: `Fotografia demonstrativa do período ${p.inicio} a ${p.fim}`, demo: true, fonte: DEMO,
  });
});

const marcos: Marco[] = marcosBase.map(({ nFotos, ...m }, mi) => {
  const fotoIds: string[] = [];
  for (let i = 1; i <= nFotos; i++) {
    const id = `f-${m.id}-${i}`;
    fotoIds.push(id);
    fotos.push({
      id, tom: tons[(mi + i) % 5], periodoId: m.periodoId, marcoId: m.id, ano: m.ano,
      data: String(m.ano),
      legenda: `${m.titulo}: fotografia ${i} de ${nFotos}. Legenda demonstrativa com o que e quem aparece.`,
      alt: `${m.titulo}, fotografia demonstrativa ${i}`,
      pessoaIds: i === 1 ? m.pessoaIds : undefined,
      demo: true, fonte: DEMO,
    });
  }
  return { ...m, fotoIds, demo: true, fonte: DEMO };
});

const documentos: Documento[] = [
  {
    id: 'd-1998', marcoId: 'm-1998', titulo: 'Ata de inauguração do novo bloco', data: '1998 (a confirmar)', ano: 1998,
    tipo: 'Ata institucional', codigoAcervo: 'Código a definir',
    paginas: [
      { src: 'demo/documento-ata-p1.svg', alt: 'Página 1 da ata demonstrativa' },
      { src: 'demo/documento-ata-p2.svg', alt: 'Página 2 da ata demonstrativa' },
    ],
    transcricao: [
      'Transcrição demonstrativa. Neste espaço entra o texto integral do documento, transcrito a partir da digitalização, para leitura confortável de longe.',
      'Cada parágrafo da transcrição corresponde a um trecho do original. Nomes, datas e números devem ser conferidos com o documento físico.',
    ],
    demo: true, fonte: DEMO,
  },
  {
    id: 'd-2002', marcoId: 'm-2002', titulo: 'Ofício de autorização de cursos', data: '2002 (a confirmar)', ano: 2002,
    tipo: 'Ofício', codigoAcervo: 'Código a definir',
    paginas: [{ src: 'demo/documento-oficio-p1.svg', alt: 'Página única do ofício demonstrativo' }],
    demo: true, fonte: DEMO,
  },
  {
    id: 'd-2008', marcoId: 'm-2008', titulo: 'Projeto de reforma dos laboratórios', data: '2008 (a confirmar)', ano: 2008,
    tipo: 'Projeto', codigoAcervo: 'Código a definir',
    // Ainda não digitalizado: demonstra o estado "documento indisponível".
    paginas: [],
    demo: true, fonte: DEMO,
  },
  {
    id: 'd-2016', marcoId: 'm-2016', titulo: 'Portaria de reconhecimento de curso', data: '2016 (a confirmar)', ano: 2016,
    tipo: 'Portaria', codigoAcervo: 'Código a definir',
    paginas: [
      { src: 'demo/documento-portaria-p1.svg', alt: 'Página 1 da portaria demonstrativa' },
      // Arquivo propositalmente ausente: demonstra o estado de falha de carregamento.
      { src: 'demo/arquivo-ausente.svg', alt: 'Página 2 da portaria demonstrativa' },
    ],
    demo: true, fonte: DEMO,
  },
];

const pessoas: Pessoa[] = [
  {
    id: 'pe-01', nome: 'Maria Izabel Rodrigues', papel: 'Fundadora da UNDB', verificado: true,
    biografia: ['Biografia a ser escrita com a família e a instituição a partir do acervo, em até 90 palavras.'],
    marcoIds: [], fotoIds: [],
    demo: false, fonte: { descricao: 'Nome e papel: ABMES (nota pública). Biografia e retrato pendentes.', url: 'https://abmes.org.br/noticias/detalhe/5214/abmes-lamenta-falecimento-de-maria-izabel-rodrigues-fundadora-da-undb' },
  },
  { id: 'pe-02', nome: 'Nome a confirmar', papel: 'Primeira direção acadêmica', retratoId: 'f-m-1985-1', autorizacaoImagem: true, biografia: ['Biografia demonstrativa em até 90 palavras, escrita a partir do acervo e validada com a pessoa ou a família.'], marcoIds: ['m-1985', 'm-1998'], fotoIds: ['f-m-1985-1', 'f-m-1998-2'], demo: true, fonte: DEMO },
  { id: 'pe-03', nome: 'Nome a confirmar', papel: 'Professora fundadora', retratoId: 'f-m-1991-1', autorizacaoImagem: true, biografia: ['Biografia demonstrativa.'], marcoIds: ['m-1991'], fotoIds: ['f-m-1991-1'], demo: true, fonte: DEMO },
  { id: 'pe-04', nome: 'Nome a confirmar', papel: 'Ex-aluno · turma pioneira', biografia: ['Biografia demonstrativa. Sem retrato autorizado, o camafeu fica vazio.'], marcoIds: ['m-1991'], fotoIds: [], demo: true, fonte: DEMO },
  { id: 'pe-05', nome: 'Nome a confirmar', papel: 'Coordenação de curso', retratoId: 'f-m-2002-1', autorizacaoImagem: true, biografia: ['Biografia demonstrativa.'], marcoIds: ['m-2002', 'm-2016'], fotoIds: ['f-m-2002-1'], demo: true, fonte: DEMO },
  { id: 'pe-06', nome: 'Nome a confirmar', papel: 'Colaboradora pioneira', retratoId: 'f-m-1998-3', autorizacaoImagem: true, biografia: ['Biografia demonstrativa.'], marcoIds: ['m-1998'], fotoIds: ['f-m-1998-3'], demo: true, fonte: DEMO },
  { id: 'pe-07', nome: 'Nome a confirmar', papel: 'Professor homenageado', biografia: ['Biografia demonstrativa.'], marcoIds: ['m-2012'], fotoIds: [], demo: true, fonte: DEMO },
  { id: 'pe-08', nome: 'Nome a confirmar', papel: 'Ex-aluna · turma de 2000', retratoId: 'f-m-2004-1', autorizacaoImagem: true, biografia: ['Biografia demonstrativa.'], marcoIds: ['m-2004'], fotoIds: ['f-m-2004-1'], demo: true, fonte: DEMO },
];

const depoimentos: Depoimento[] = [
  { id: 'dp-1', marcoId: 'm-1991', texto: 'Depoimento demonstrativo de quem estava na primeira colação, com no máximo duas linhas.', autor: 'Nome a confirmar', vinculo: 'Turma de 1991', autorizado: true, demo: true, fonte: DEMO },
  { id: 'dp-2', marcoId: 'm-1998', texto: 'Depoimento curto de quem viveu o momento.', autor: 'Nome a confirmar', vinculo: 'Turma de 1998', autorizado: true, demo: true, fonte: DEMO },
  { id: 'dp-3', marcoId: 'm-2004', texto: 'Depoimento demonstrativo sobre a primeira formatura no auditório novo.', autor: 'Nome a confirmar', vinculo: 'Turma de 2004', autorizado: true, demo: true, fonte: DEMO },
  { id: 'dp-4', marcoId: 'm-2021', texto: 'Depoimento demonstrativo sobre como a comunidade se adaptou às novas rotinas.', autor: 'Nome a confirmar', vinculo: 'Professora', autorizado: true, demo: true, fonte: DEMO },
  { id: 'dp-5', texto: 'Depoimento demonstrativo sem marco associado: uma lembrança do dia a dia no campus.', autor: 'Nome a confirmar', vinculo: 'Colaborador desde 1995', autorizado: true, demo: true, fonte: DEMO },
  // Sem autorização registrada: não deve aparecer em lugar nenhum.
  { id: 'dp-6', texto: 'Depoimento sem autorização (não exibido).', autor: 'Nome a confirmar', vinculo: '—', autorizado: false, demo: true, fonte: DEMO },
];

export const acervoDemo: Acervo = { periodos, marcos, fotos, documentos, pessoas, depoimentos };
/**
 * O livro: a capa por cima e a tela atual por baixo, com o gesto de 480ms.
 * - fechado: só a capa (proteção de tela).
 * - abrindo: Sumário por baixo, capa girando sobre a lombada até rotateY(-104deg).
 * - aberto: só a tela atual.
 * - fechando: a capa volta de -104deg a 0 por cima da tela atual; depois tudo é zerado.
 */
import { useEffect, useRef, useState } from 'react';
import { quiosque } from '../config/quiosque';
import { conteudoDemonstrativo } from '../dados/acervo';
import { useNavegacao } from '../navegacao/Navegacao';
import type { Rota } from '../navegacao/rotas';
import { AvisoInatividade } from '../quiosque/AvisoInatividade';
import { LimiteDeErro } from '../quiosque/LimiteDeErro';
import { criarVerificadorDeRecarga, pedirTelaCheia } from '../quiosque/guardas';
import { Capa } from './capa/Capa';
import { Sumario } from './sumario/Sumario';
import { TelaLinhaDoTempo } from './linha-do-tempo/TelaLinhaDoTempo';
import { TelaMarco } from './marco/TelaMarco';
import { TelaGaleria } from './galeria/TelaGaleria';
import { TelaPessoas } from './pessoas/TelaPessoas';
import { TelaDocumento } from './documento/TelaDocumento';
import { TelaConquistas } from './conquistas/TelaConquistas';
import { TelaMemorias } from './memorias/TelaMemorias';
import './livro.css';

function TelaDaRota({ rota }: { rota: Rota }) {
  switch (rota.tela) {
    case 'sumario': return <Sumario />;
    case 'linha-do-tempo': return <TelaLinhaDoTempo periodoInicial={rota.periodoId} />;
    case 'marco': return <TelaMarco marcoId={rota.marcoId} />;
    case 'galeria': return <TelaGaleria />;
    case 'pessoas': return <TelaPessoas />;
    case 'documento': return <TelaDocumento documentoId={rota.documentoId} />;
    case 'conquistas': return <TelaConquistas />;
    case 'memorias': return <TelaMemorias />;
  }
}

const deveRecarregar = criarVerificadorDeRecarga();

export function Livro() {
  const { livro, atual, abrirLivro, fecharLivro } = useNavegacao();
  // a capa monta já girada quando vai fechar, e no quadro seguinte volta a 0
  const [capaFechada, setCapaFechada] = useState(true);
  const raf = useRef<number>(0);
  const paginaRef = useRef<HTMLDivElement>(null);

  // enquanto a capa gira, a página por baixo não recebe toques nem foco
  useEffect(() => {
    if (paginaRef.current) paginaRef.current.inert = livro !== 'aberto';
  });

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (livro === 'abrindo') {
      setCapaFechada(true);
      raf.current = requestAnimationFrame(() => (raf.current = requestAnimationFrame(() => setCapaFechada(false))));
    } else if (livro === 'fechando') {
      setCapaFechada(false);
      raf.current = requestAnimationFrame(() => (raf.current = requestAnimationFrame(() => setCapaFechada(true))));
    } else {
      setCapaFechada(livro === 'fechado');
    }
    return () => cancelAnimationFrame(raf.current);
  }, [livro]);

  // recarga diária: só com o livro fechado
  useEffect(() => {
    if (livro !== 'fechado') return;
    const t = window.setInterval(() => { if (deveRecarregar()) location.reload(); }, 60_000);
    return () => window.clearInterval(t);
  }, [livro]);

  const abrir = () => {
    void pedirTelaCheia();
    abrirLivro();
  };

  const mostrarCapa = livro !== 'aberto';
  const mostrarTela = livro !== 'fechado' && atual;

  return (
    <div className={`livro livro--${livro}`}>
      {mostrarTela && (
        <div className="livro-pagina" ref={paginaRef} aria-hidden={livro !== 'aberto'}>
          <LimiteDeErro chave={String(atual.chave)} aoVoltarCapa={fecharLivro}>
            <TelaDaRota key={atual.chave} rota={atual.rota} />
          </LimiteDeErro>
        </div>
      )}
      {mostrarCapa && (
        <div className={['livro-capa', capaFechada ? 'is-fechada' : 'is-aberta'].filter(Boolean).join(' ')}>
          <Capa aoAbrir={abrir} ativa={livro === 'fechado'} />
        </div>
      )}
      {quiosque.modoDemonstracao && conteudoDemonstrativo() && livro !== 'fechado' && <span className="etiqueta-global">Conteúdo demonstrativo</span>}
      <AvisoInatividade />
    </div>
  );
}
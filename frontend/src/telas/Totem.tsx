/**
 * O totem de uma sala. Cada totem conhece só a própria sala: as salas 1 a 4 mostram História,
 * Fotos e Vídeos (SalaConteudo); a sala 5 mostra a busca de ex-alunos (SalaFechamento).
 * Inatividade, Voltar do Android e troca de conteúdo trabalham sobre o mesmo estado (estado.ts).
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DadosProvider, useDados } from '../dados/Dados';
import { salaPadrao } from '../dados/salas';
import { useBotaoVoltar } from '../navegacao/voltar';
import { AvisoInatividade } from '../quiosque/AvisoInatividade';
import { InatividadeProvider } from '../quiosque/Inatividade';
import { Moldura } from './Moldura';
import { emInicio as estaNoInicio, INICIAL, voltar, type EstadoTotem } from './estado';
import { SalaConteudo } from './SalaConteudo';
import { SalaFechamento } from './SalaFechamento';
import '../componentes/componentes.css';
import './totem.css';
import './salas.css';

export function Totem({ numero }: { numero: number }) {
  return (
    <DadosProvider sala={numero}>
      <TotemSala numero={numero} />
    </DadosProvider>
  );
}

function TotemSala({ numero }: { numero: number }) {
  const { dados, conexao, informarInicio } = useDados();
  const [estado, setEstado] = useState<EstadoTotem>(INICIAL);
  // muda a cada volta ao início: remonta as listas e zera as rolagens internas
  const [geracao, setGeracao] = useState(0);
  const noInicio = estaNoInicio(estado);

  const mudar = useCallback((p: Partial<EstadoTotem>) => setEstado((s) => ({ ...s, ...p })), []);
  const resetar = useCallback(() => {
    setEstado(INICIAL);
    setGeracao((g) => g + 1);
  }, []);

  useEffect(() => informarInicio(noInicio), [noInicio, informarInicio]);
  useBotaoVoltar(() => setEstado(voltar));

  let tela: ReactNode;
  if (!dados) {
    tela = (
      <Moldura sala={salaPadrao(numero)} dica={null}>
        <Espera offline={conexao === 'offline'} />
      </Moldura>
    );
  } else if (dados.sala.tipo === 'fechamento') {
    tela = <SalaFechamento key={geracao} estado={estado} mudar={mudar} dados={dados} conexao={conexao} />;
  } else {
    tela = <SalaConteudo key={geracao} estado={estado} mudar={mudar} dados={dados} />;
  }

  return (
    <InatividadeProvider ativo={!noInicio} aoEsgotar={resetar}>
      {tela}
      <AvisoInatividade />
    </InatividadeProvider>
  );
}

function Espera({ offline }: { offline: boolean }) {
  return (
    <div className="tt-espera" role="status">
      <span className="tt-espera__pontos" aria-hidden="true"><i /><i /><i /></span>
      <h2>{offline ? 'Conectando ao servidor do memorial' : 'Abrindo a sala'}</h2>
      <p>{offline ? 'Nova tentativa a cada 10 segundos.' : 'Um instante.'}</p>
    </div>
  );
}

import logoBranco from './assets/undb-logo-branco.png';
import { Estado } from './componentes/estado/Estado';
import { DadosProvider, useDados } from './dados/Dados';
import { NavegacaoProvider } from './navegacao/Navegacao';
import { InatividadeProvider } from './quiosque/Inatividade';
import { Palco } from './quiosque/Palco';
import { Livro } from './telas/Livro';

/** Primeira abertura sem nenhuma cópia guardada: espera o servidor responder. */
function Carregando() {
  const { conexao } = useDados();
  return (
    <div className="t-carga">
      <img src={logoBranco} alt="UNDB Centro Universitário" />
      <Estado
        tipo="carregando"
        escuro
        titulo={conexao === 'offline' ? 'Conectando ao servidor do memorial' : 'Abrindo o memorial'}
        texto={conexao === 'offline' ? 'Nova tentativa a cada 10 segundos.' : 'Um instante.'}
      />
    </div>
  );
}

/** O livro é remontado a cada versão nova do acervo, aplicada só com ele fechado. */
function Conteudo() {
  const { versao } = useDados();
  if (versao === null) return <Carregando />;
  return (
    <InatividadeProvider>
      <Livro key={versao} />
    </InatividadeProvider>
  );
}

export function App() {
  return (
    <Palco>
      <NavegacaoProvider>
        <DadosProvider>
          <Conteudo />
        </DadosProvider>
      </NavegacaoProvider>
    </Palco>
  );
}
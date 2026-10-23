/**
 * Recuperação de falhas de renderização.
 * Mostra o estado de erro do Design System com "Tentar de novo" e "Voltar à capa".
 * Depois de N falhas seguidas (config), recarrega o app inteiro.
 */
import { Component, type ReactNode } from 'react';
import { quiosque } from '../config/quiosque';
import { Estado } from '../componentes/estado/Estado';
import { Botao } from '../componentes/botoes/Botao';
import { registrarErro } from './guardas';

interface Props { children: ReactNode; aoVoltarCapa: () => void; chave: string }
interface S { erro: boolean }

let falhasSeguidas = 0;

export class LimiteDeErro extends Component<Props, S> {
  state: S = { erro: false };

  static getDerivedStateFromError(): S {
    return { erro: true };
  }

  componentDidCatch(error: Error) {
    registrarErro(`render: ${error.message}`);
    falhasSeguidas += 1;
    if (falhasSeguidas >= quiosque.falhasAntesDeRecarregar) {
      window.setTimeout(() => location.reload(), 1500);
    }
  }

  componentDidUpdate(anterior: Props) {
    if (anterior.chave !== this.props.chave && this.state.erro) this.setState({ erro: false });
    if (!this.state.erro) falhasSeguidas = 0;
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="tela-erro-geral">
        <Estado
          tipo="erro"
          titulo="Esta página não abriu"
          texto="Algo deu errado ao montar a tela. Tente de novo ou volte à capa."
          acoes={
            <>
              <Botao variante="pri" icone="recarregar" onClick={() => this.setState({ erro: false })}>Tentar de novo</Botao>
              <Botao variante="sec" onClick={this.props.aoVoltarCapa}>Voltar à capa</Botao>
            </>
          }
        />
      </div>
    );
  }
}
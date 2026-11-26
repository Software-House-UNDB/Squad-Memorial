/**
 * Aviso da aba Vídeos enquanto os vídeos não ficam prontos (chave VIDEOS_EM_CONSTRUCAO em
 * config/recursos.ts). Ocupa o mesmo espaço da aba e usa a cor do espaço (--rc).
 */
import { Icone } from '../componentes/Icone';

export function VideosEmConstrucao() {
  return (
    <section className="tt-embreve entra" aria-label="Vídeos em produção">
      <span className="tt-embreve__icone" aria-hidden="true"><Icone nome="video" tamanho={64} /></span>
      <div className="tt-embreve__rot">EM BREVE</div>
      <h2 className="tt-embreve__tit serif">Vídeos em produção</h2>
      <span className="tt-embreve__fio" aria-hidden="true" />
      <p>Estamos reunindo depoimentos e registros em vídeo deste espaço. Volte em breve.</p>
    </section>
  );
}

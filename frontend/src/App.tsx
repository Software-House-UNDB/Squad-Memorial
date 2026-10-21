import { WifiOff } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Brasao, Fundo } from "./components/Ornamentos";
import { ProtecaoTela } from "./components/ProtecaoTela";
import { Topo } from "./components/Topo";
import { KioskProvider, useBloqueiosQuiosque } from "./hooks/useKiosk";
import { TotemProvider, useTotem } from "./hooks/useTotem";
import { Fotos } from "./screens/Fotos";
import { Historia } from "./screens/Historia";
import { Inicio } from "./screens/Inicio";
import { Videos } from "./screens/Videos";

function TelaInterna({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="tela">
      <Topo />
      {/* key: cada seção começa rolada para o topo */}
      <main className="tela__rolagem" key={pathname}>{children}</main>
    </div>
  );
}

function Carregando() {
  const { status } = useTotem();
  return (
    <div className="carregando">
      <Brasao tamanho={84} className="carregando__brasao" />
      <p>{status === "offline" ? "Conectando ao servidor do memorial…" : "Carregando o memorial…"}</p>
    </div>
  );
}

function Totem() {
  useBloqueiosQuiosque();
  const { data, status, temAtualizacao, aplicarAtualizacao } = useTotem();
  const navegar = useNavigate();
  const [sessao, setSessao] = useState(0);
  const [descanso, setDescanso] = useState(false);

  const { needRefresh: [appNovo], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // procura nova versão do app a cada hora
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
  });

  // "ocioso" = ninguém tocou desde o último timeout de inatividade
  const [ocioso, setOcioso] = useState(false);
  useEffect(() => {
    if (!ocioso) return;
    const acordar = () => setOcioso(false);
    window.addEventListener("pointerdown", acordar, { passive: true });
    return () => window.removeEventListener("pointerdown", acordar);
  }, [ocioso]);

  // Conteúdo novo e nova versão do app só entram com o totem parado,
  // sem interromper quem está usando. Se chegarem durante o ócio, entram na hora.
  useEffect(() => {
    if (!ocioso) return;
    if (appNovo) void updateServiceWorker(true);
    else if (temAtualizacao) aplicarAtualizacao();
  }, [ocioso, appNovo, temAtualizacao, updateServiceWorker, aplicarAtualizacao]);

  const aoFicarOcioso = useCallback(() => {
    navegar("/", { replace: true });
    setSessao((s) => s + 1); // remonta as telas: fecha lightbox/vídeo, zera filtros
    setOcioso(true);
    if (data?.config.descanso_ativo !== false) setDescanso(true);
  }, [navegar, data?.config.descanso_ativo]);

  return (
    <KioskProvider segundos={data?.config.segundos_inatividade ?? 90} aoFicarOcioso={aoFicarOcioso}>
      <Fundo />
      {!data ? (
        <Carregando />
      ) : (
        <Routes key={sessao}>
          <Route path="/" element={<Inicio />} />
          <Route path="/historia" element={<TelaInterna><Historia /></TelaInterna>} />
          <Route path="/fotos" element={<TelaInterna><Fotos /></TelaInterna>} />
          <Route path="/videos" element={<TelaInterna><Videos /></TelaInterna>} />
          <Route path="*" element={<Inicio />} />
        </Routes>
      )}
      {descanso && data && <ProtecaoTela aoTocar={() => setDescanso(false)} />}
      {status === "offline" && data && (
        <div className="selo-offline" title="Sem conexão com o servidor: exibindo conteúdo salvo">
          <WifiOff size={16} aria-hidden /> offline
        </div>
      )}
    </KioskProvider>
  );
}

export default function App() {
  return (
    <TotemProvider>
      <Totem />
    </TotemProvider>
  );
}

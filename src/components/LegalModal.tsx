import { useEffect, type FC } from 'react';
import { X, ShieldCheck, FileText, CheckCircle2, Lock, Sparkles, Heart } from 'lucide-react';

export type LegalTab = 'privacy' | 'terms';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalModal: FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#382C26]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E8E0D8] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-xl relative max-h-[88vh] flex flex-col text-[#382C26] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar no Canto */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#8C786E] hover:text-[#382C26] hover:bg-[#FAF6F0] transition-colors cursor-pointer"
          title="Fechar"
        >
          <X size={20} />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#FFE8E0] text-[#C25E3E] flex items-center justify-center font-bold text-xl border border-[#FFB59A]/40 shadow-xs">
            {initialTab === 'privacy' ? <ShieldCheck size={22} className="text-[#C25E3E]" /> : <FileText size={22} className="text-[#776156]" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#382C26]">
              {initialTab === 'privacy' ? 'Política de Privacidade' : 'Termos e Condições'}
            </h2>
            <p className="text-xs text-[#8C786E]">
              {initialTab === 'privacy'
                ? 'Transparência total: respeito aos seus dados e privacidade'
                : 'Regras de convivência e uso do jogo'}
            </p>
          </div>
        </div>

        {/* Conteúdo com Scroll Suave */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-5 text-sm text-[#776156] leading-relaxed">
          {initialTab === 'privacy' ? (
            <>
              <div className="bg-[#FAF6F0] border border-[#E8E0D8] rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle2 size={20} className="text-[#C25E3E] shrink-0 mt-0.5" />
                <div className="text-xs text-[#382C26]">
                  <strong className="block text-sm font-bold mb-0.5 text-[#382C26]">
                    Zero Rastreamento e Sem Anúncios
                  </strong>
                  Não coletamos seus dados pessoais, não utilizamos cookies de terceiros e não monitoramos sua atividade na internet.
                </div>
              </div>

              <div>
                <h3 className="font-bold text-[#382C26] flex items-center gap-2 mb-1.5">
                  <Lock size={15} className="text-[#C25E3E]" />
                  1. Armazenamento Local no seu Navegador
                </h3>
                <p className="text-xs text-[#776156]">
                  Guardamos apenas o seu <strong>apelido escolhido</strong> e a preferência de <strong>efeitos sonoros</strong> no <code className="bg-[#FAF6F0] border border-[#E8E0D8] text-[#382C26] px-1.5 py-0.5 rounded text-[11px] font-sans">localStorage</code> do seu navegador, exclusivamente para que você não precise redigitá-los toda vez que abrir o jogo.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#382C26] flex items-center gap-2 mb-1.5">
                  <ShieldCheck size={15} className="text-[#C25E3E]" />
                  2. Salas de Jogo Efêmeras e Seguras
                </h3>
                <p className="text-xs text-[#776156]">
                  As partidas acontecem através de canais criptografados via protocolo <strong>WebSockets TLS</strong>. Nenhum histórico de perguntas, palpites ou conversas de chat fica registrado permanentemente: tudo é destruído da memória assim que os jogadores encerram a partida.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#382C26] flex items-center gap-2 mb-1.5">
                  <Sparkles size={15} className="text-[#C25E3E]" />
                  3. Modo de Baralho Personalizado com Fotos
                </h3>
                <p className="text-xs text-[#776156]">
                  Ao criar um baralho com fotos personalizadas (amigos, família ou colegas), as imagens são cortadas e processadas <strong>localmente na sua máquina</strong> e transmitidas em tempo real diretamente para a sala de jogo, sem serem armazenadas em servidores de terceiros.
                </p>
              </div>

              <div className="pt-2 border-t border-[#E8E0D8] text-xs text-[#8C786E] flex items-center justify-between">
                <span>Última atualização: Novembro de 2026</span>
                <span className="flex items-center gap-1 text-[#776156] font-medium">
                  <Heart size={13} className="text-[#C25E3E] fill-[#C25E3E]" /> 100% Independente
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#FAF6F0] border border-[#E8E0D8] rounded-2xl p-4 flex items-start gap-3">
                <FileText size={20} className="text-[#C25E3E] shrink-0 mt-0.5" />
                <div className="text-xs text-[#382C26]">
                  <strong className="block text-sm font-bold mb-0.5 text-[#382C26]">
                    Jogo Livre e Gratuito
                  </strong>
                  O Tá na Cara! foi desenvolvido para proporcionar momentos leves de diversão entre amigos e família de forma descontraída e acessível.
                </div>
              </div>

              <div>
                <h3 className="font-bold text-[#382C26] mb-1.5">
                  1. Finalidade do Jogo
                </h3>
                <p className="text-xs text-[#776156]">
                  A plataforma é estritamente recreativa e educacional, criada para duas pessoas jogarem simultaneamente à distância sem custos ou anúncios invasivos.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#382C26] mb-1.5">
                  2. Convivência e Conduta
                </h3>
                <p className="text-xs text-[#776156]">
                  Ao utilizar o bate-papo rápido e personalizar nomes de salas ou baralhos de cartas, comprometa-se a manter um ambiente respeitoso, evitando conteúdo ofensivo, discriminatório ou ilícito.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#382C26] mb-1.5">
                  3. Direitos e Inspiração
                </h3>
                <p className="text-xs text-[#776156]">
                  Este projeto é uma obra independente e uma homenagem carinhosa à mecânica clássica de jogos de dedução de tabuleiro ("Guess Who?"). Não possui afiliação oficial, patrocínio ou vínculo comercial com fabricantes detentoras de marcas registradas de brinquedos ou jogos físicos.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#382C26] mb-1.5">
                  4. Isenção e Disponibilidade
                </h3>
                <p className="text-xs text-[#776156]">
                  O jogo é fornecido "no estado em que se encontra" (as is), sem garantias expressas de disponibilidade ininterrupta. Esforçamo-nos para manter a estabilidade da rede em tempo real.
                </p>
              </div>

              <div className="pt-2 border-t border-[#E8E0D8] text-xs text-[#8C786E] flex items-center justify-between">
                <span>Termos em vigor desde Novembro de 2026</span>
                <span className="text-[#776156] font-medium">Uso Não-Comercial</span>
              </div>
            </>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="mt-6 pt-4 border-t border-[#E8E0D8] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#382C26] hover:bg-[#2A211C] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-none"
          >
            Entendido, Voltar ao Jogo
          </button>
        </div>
      </div>
    </div>
  );
};

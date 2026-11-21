import { useState, type FC } from 'react';
import { Users, RefreshCw, ChevronUp, ChevronDown, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ATALHOS_DE_TAMANHO, type AtalhoDeTamanho } from '../../constants/deck';

export type RedesignProposal = 'a' | 'b' | 'c' | 'original';
export type RedesignTurnState = 'my_turn' | 'opponent_turn' | 'waiting_reply' | 'answered_yes' | 'answered_no';

interface MatchDesignToolbarProps {
  currentProposal: RedesignProposal;
  cardCount: AtalhoDeTamanho;
  turnState: RedesignTurnState;
  onSelectProposal: (proposal: RedesignProposal) => void;
  onSelectCardCount: (count: AtalhoDeTamanho) => void;
  onSelectTurnState: (state: RedesignTurnState) => void;
  onReset: () => void;
}

export const MatchDesignToolbar: FC<MatchDesignToolbarProps> = ({
  currentProposal,
  cardCount,
  turnState,
  onSelectProposal,
  onSelectCardCount,
  onSelectTurnState,
  onReset,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label="Controles de protótipo de design"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 max-w-[96vw]"
    >
      <div className="bg-[#382C26]/95 backdrop-blur-md text-white border border-white/15 rounded-2xl shadow-2xl p-2 sm:px-3 sm:py-2 flex flex-col gap-2">
        {/* Linha Principal: Propostas + Botão de Recolher */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#C25E3E] animate-pulse" />
            <span className="font-extrabold tracking-wide uppercase text-[10px] text-[#FFE8E0] hidden sm:inline">
              Sandbox UI
            </span>
          </div>

          {/* Abas das Propostas */}
          <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => onSelectProposal('a')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentProposal === 'a'
                  ? 'bg-[#C25E3E] text-white shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Proposta A <span className="text-[10px] opacity-75 hidden md:inline">(Cockpit)</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectProposal('b')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentProposal === 'b'
                  ? 'bg-[#C25E3E] text-white shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Proposta B <span className="text-[10px] opacity-75 hidden md:inline">(Termo)</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectProposal('c')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentProposal === 'c'
                  ? 'bg-[#C25E3E] text-white shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Proposta C <span className="text-[10px] opacity-75 hidden md:inline">(Stream)</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectProposal('original')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentProposal === 'original'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Original
            </button>
          </div>

          {/* Botão de Toggle Expandir / Recolher */}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Expandir opções de teste' : 'Recolher opções'}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white cursor-pointer transition-colors"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Linha Secundária de Controles (Recolhível): Tamanho de Baralho + Simulação de Estados de Turno */}
        {!collapsed && (
          <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            {/* Seletor de Baralho */}
            <div className="flex items-center gap-1.5">
              <span className="text-white/60 font-semibold flex items-center gap-1">
                <Users size={12} />
                <span>Baralho:</span>
              </span>
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg">
                {ATALHOS_DE_TAMANHO.map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => onSelectCardCount(cnt)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                      cardCount === cnt
                        ? 'bg-white text-[#382C26]'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de Estados de Turno */}
            <div className="flex items-center gap-1.5">
              <span className="text-white/60 font-semibold flex items-center gap-1">
                <Clock size={12} />
                <span className="hidden sm:inline">Turno:</span>
              </span>
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => onSelectTurnState('my_turn')}
                  className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    turnState === 'my_turn' ? 'bg-[#2E7D32] text-white' : 'text-white/70 hover:text-white'
                  }`}
                  title="Sua vez de perguntar"
                >
                  Sua vez
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTurnState('opponent_turn')}
                  className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    turnState === 'opponent_turn' ? 'bg-[#C25E3E] text-white' : 'text-white/70 hover:text-white'
                  }`}
                  title="Vez do oponente perguntar"
                >
                  Oponente
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTurnState('waiting_reply')}
                  className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    turnState === 'waiting_reply' ? 'bg-amber-600 text-white' : 'text-white/70 hover:text-white'
                  }`}
                  title="Aguardando o oponente responder"
                >
                  Aguardando
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTurnState('answered_yes')}
                  className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    turnState === 'answered_yes' ? 'bg-emerald-600 text-white' : 'text-white/70 hover:text-white'
                  }`}
                  title="Pergunta respondida: SIM"
                >
                  <CheckCircle2 size={11} className="inline mr-0.5" />
                  SIM
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTurnState('answered_no')}
                  className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    turnState === 'answered_no' ? 'bg-rose-700 text-white' : 'text-white/70 hover:text-white'
                  }`}
                  title="Pergunta respondida: NÃO"
                >
                  <XCircle size={11} className="inline mr-0.5" />
                  NÃO
                </button>
              </div>
            </div>

            {/* Botão de Reset */}
            <button
              type="button"
              onClick={onReset}
              title="Restaurar estado do jogo"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
            >
              <RefreshCw size={11} />
              <span className="hidden sm:inline">Resetar</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

import type { FC } from 'react';
import type { CardStatus, Question } from '../types/game';
import { RotateCcw, History } from 'lucide-react';
import { sounds } from '../utils/sound';

interface RightSidebarProps {
  onUndo: () => void;
  canUndo: boolean;
  targetCharacter?: any;
  onConfirmTargetGuess?: any;
  onCancelTarget?: any;
  cardStatuses: Record<string, CardStatus>;
  totalCards: number;
  questionHistory: Question[];
  opponentName: string;
}

export const RightSidebar: FC<RightSidebarProps> = ({
  onUndo,
  canUndo,
  cardStatuses,
  totalCards,
  questionHistory,
  opponentName: _opponentName,
}) => {
  const counts = Object.values(cardStatuses).reduce(
    (acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    },
    { normal: 0, suspect: 0, discard: 0, target: 0 } as Record<CardStatus, number>
  );

  const activeCount = totalCards - counts.discard;

  const handleUndoClick = () => {
    if (!canUndo) return;
    sounds.playClick();
    onUndo();
  };

  return (
    <aside className="w-full lg:w-72 bg-white border-2 border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col gap-3.5 sm:gap-4 shadow-sm">
      {/* Botão de Destaque 'Desfazer' (Requisito F.b) */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col gap-2">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          Ações Rápidas
        </span>
        <button
          onClick={handleUndoClick}
          disabled={!canUndo}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-wider shadow-tactile active:translate-y-0.5 transition-all cursor-pointer"
        >
          <RotateCcw size={16} className="text-sky-400" />
          <span>Desfazer Última Ação</span>
        </button>
      </div>

      {/* Estatísticas do Tabuleiro */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2.5">
          Status das Cartas
        </span>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-400 block font-semibold">Ativos</span>
            <span className="text-sm font-black text-emerald-700">{activeCount}</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-400 block font-semibold">Suspeitos</span>
            <span className="text-sm font-black text-amber-700">{counts.suspect}</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-400 block font-semibold">Descartes</span>
            <span className="text-sm font-black text-rose-700">{counts.discard}</span>
          </div>
        </div>
      </div>

      {/* Histórico de Perguntas */}
      <div className="flex-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col min-h-[160px] overflow-hidden">
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
          <History size={13} />
          <span>Histórico da Partida</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
          {questionHistory.length === 0 ? (
            <span className="text-slate-400 italic block text-center py-6 text-[11px]">
              Nenhuma pergunta feita ainda.
            </span>
          ) : (
            questionHistory.map((q) => (
              <div key={q.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] shadow-sm">
                <div className="flex items-center justify-between text-slate-500 font-bold mb-0.5">
                  <span className="text-slate-800">{q.senderName}:</span>
                  {q.answer !== null && q.answer !== undefined && (
                    <span
                      className={`font-black px-1.5 py-0.5 rounded text-[10px] ${
                        q.answer ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {q.answer ? 'SIM' : 'NÃO'}
                    </span>
                  )}
                </div>
                <div className="text-slate-700 font-medium">"{q.text}"</div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};

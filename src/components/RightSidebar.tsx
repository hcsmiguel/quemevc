import type { FC } from 'react';
import type { Character, CardStatus, Question } from '../types/game';
import { RotateCcw, Target, Trophy, History } from 'lucide-react';
import { sounds } from '../utils/sound';
import { Avatar } from './Avatar';

interface RightSidebarProps {
  onUndo: () => void;
  canUndo: boolean;
  targetCharacter: Character | null;
  onConfirmTargetGuess: (character: Character) => void;
  onCancelTarget: () => void;
  cardStatuses: Record<string, CardStatus>;
  totalCards: number;
  questionHistory: Question[];
  opponentName: string;
}

export const RightSidebar: FC<RightSidebarProps> = ({
  onUndo,
  canUndo,
  targetCharacter,
  onConfirmTargetGuess,
  onCancelTarget,
  cardStatuses,
  totalCards,
  questionHistory,
  opponentName,
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
    <aside className="w-full lg:w-72 bg-white border-2 border-slate-200 rounded-3xl p-4 flex flex-col gap-4 shadow-sm">
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

      {/* Caixa de Confirmação 'É o Cara!' (Requisito E.c) */}
      {targetCharacter && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center animate-in zoom-in-95">
          <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mb-2 shadow-tactile-sm">
            <Target size={24} className="text-amber-700" />
          </div>
          <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider">
            Você Escolheu o Alvo!
          </span>
          <div className="my-2">
            <Avatar character={targetCharacter} size={64} className="ring-2 ring-amber-400 mx-auto" />
            <h4 className="text-base font-black text-slate-900 mt-1">{targetCharacter.name}</h4>
          </div>

          <p className="text-[11px] text-amber-900/80 mb-3 leading-snug">
            Todas as outras cartas foram viradas. Tem certeza de que {opponentName} é{' '}
            <strong className="text-slate-900 font-extrabold">{targetCharacter.name}</strong>?
          </p>

          <div className="w-full space-y-2">
            <button
              onClick={() => onConfirmTargetGuess(targetCharacter)}
              className="w-full py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#d97706] transition-all active:translate-y-0.5 flex items-center justify-center gap-1.5"
            >
              <Trophy size={16} />
              Confirmar Resposta
            </button>
            <button
              onClick={onCancelTarget}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition-colors"
            >
              Cancelar Chute
            </button>
          </div>
        </div>
      )}

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

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
    <aside className="w-full lg:w-72 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-4 shadow-xl backdrop-blur-md">
      {/* Botão de Destaque 'Desfazer' (Requisito F.b) */}
      <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
          Ações Rápidas
        </span>
        <button
          onClick={handleUndoClick}
          disabled={!canUndo}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white font-extrabold text-xs uppercase tracking-wider border border-slate-700 transition-all active:scale-95 shadow-md"
        >
          <RotateCcw size={16} className="text-indigo-400" />
          <span>Desfazer</span>
        </button>
      </div>

      {/* Caixa de Confirmação 'É o Cara!' (Requisito E.c) */}
      {targetCharacter && (
        <div className="bg-gradient-to-b from-amber-950/90 to-slate-950 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95">
          <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-2 border border-amber-500/40">
            <Target size={24} />
          </div>
          <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
            Você Escolheu o Alvo!
          </span>
          <div className="my-2">
            <Avatar character={targetCharacter} size={64} className="ring-2 ring-amber-400 mx-auto" />
            <h4 className="text-base font-black text-white mt-1">{targetCharacter.name}</h4>
          </div>

          <p className="text-[11px] text-amber-200/80 mb-3 leading-snug">
            Todas as outras cartas foram viradas. Tem certeza de que {opponentName} é{' '}
            <strong className="text-white">{targetCharacter.name}</strong>?
          </p>

          <div className="w-full space-y-2">
            <button
              onClick={() => onConfirmTargetGuess(targetCharacter)}
              className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Trophy size={16} />
              Confirmar Resposta
            </button>
            <button
              onClick={onCancelTarget}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs transition-colors"
            >
              Cancelar Chute
            </button>
          </div>
        </div>
      )}

      {/* Estatísticas do Tabuleiro */}
      <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2.5">
          Status das Cartas
        </span>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold">Ativos</span>
            <span className="text-sm font-black text-emerald-400">{activeCount}</span>
          </div>
          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold">Suspeitos</span>
            <span className="text-sm font-black text-amber-400">{counts.suspect}</span>
          </div>
          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-semibold">Descartes</span>
            <span className="text-sm font-black text-red-400">{counts.discard}</span>
          </div>
        </div>
      </div>

      {/* Histórico de Perguntas */}
      <div className="flex-1 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 flex flex-col min-h-[160px] overflow-hidden">
        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
          <History size={13} />
          <span>Histórico da Partida</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
          {questionHistory.length === 0 ? (
            <span className="text-slate-500 italic block text-center py-6 text-[11px]">
              Nenhuma pergunta feita ainda.
            </span>
          ) : (
            questionHistory.map((q) => (
              <div key={q.id} className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-[11px]">
                <div className="flex items-center justify-between text-slate-400 font-bold mb-0.5">
                  <span>{q.senderName}:</span>
                  {q.answer !== null && q.answer !== undefined && (
                    <span
                      className={`font-black px-1.5 py-0.5 rounded ${
                        q.answer ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                      }`}
                    >
                      {q.answer ? 'SIM' : 'NÃO'}
                    </span>
                  )}
                </div>
                <div className="text-slate-300">"{q.text}"</div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};

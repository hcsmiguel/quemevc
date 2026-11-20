import type { FC } from 'react';
import type { Character, CardStatus, Question } from '../../types/game';
import { Card } from '../Card';
import { SecretCardBadge } from '../SecretCardBadge';
import { QuestionControl } from '../QuestionControl';
import { RotateCcw, History } from 'lucide-react';
import { getBoardGridClasses } from '../../utils/cardDisplay';

interface MatchDesignOriginalProps {
  deck: Character[];
  cardStatuses: Record<string, CardStatus>;
  secretCharacter: Character;
  questionHistory: Question[];
  currentQuestion: Question | null;
  isMyTurn: boolean;
  timeLeft: number;
  totalTime: number;
  opponentName: string;
  undoDisabled: boolean;
  onCardClick: (char: Character) => void;
  onUndo: () => void;
  onAskQuestion: (text: string) => void;
  onPassTurn: () => void;
  onOpenGuessModal: () => void;
}

export const MatchDesignOriginal: FC<MatchDesignOriginalProps> = ({
  deck,
  cardStatuses,
  secretCharacter,
  questionHistory,
  currentQuestion,
  isMyTurn,
  timeLeft,
  totalTime,
  opponentName,
  undoDisabled,
  onCardClick,
  onUndo,
  onAskQuestion,
  onPassTurn,
  onOpenGuessModal,
}) => {
  const activeCount = deck.filter((c) => cardStatuses[c.id] !== 'discard').length;
  const discardCount = deck.length - activeCount;

  return (
    <div className="w-full flex justify-center animate-in fade-in duration-200">
      <main className="flex-1 w-full max-w-[1400px] flex flex-col gap-3 sm:gap-4 relative pb-16 min-w-0">
        {/* LINHA 2 (FIXA / STICKY): Painel de Turno + Você é + Contadores + Desfazer */}
        <div className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-xs pt-1 pb-2.5 border-b border-[#E8E0D8]/60 flex flex-col gap-2 shadow-2xs">
          <div className="w-full flex items-center justify-between gap-2">
            <div className="shrink-0">
              <SecretCardBadge character={secretCharacter} />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white border border-[#E8E0D8] rounded-xl sm:rounded-2xl p-1 sm:px-2.5 sm:py-1 shadow-2xs">
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#E8F5E9] text-[#2E7D32] text-[11px] sm:text-xs font-bold"
                  title="Personagens ainda em jogo no tabuleiro"
                >
                  <span className="w-2 h-2 rounded-full bg-[#2E7D32] shrink-0" />
                  <span>{activeCount}</span>
                  <span className="font-semibold text-[10px] text-[#2E7D32]">em jogo</span>
                </div>
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#FAF6F0] text-[#8C786E] text-[11px] sm:text-xs font-bold"
                  title="Personagens eliminados / descartados"
                >
                  <span className="w-2 h-2 rounded-full bg-[#8C786E] shrink-0" />
                  <span>{discardCount}</span>
                  <span className="font-semibold text-[10px] text-[#8C786E]">descartadas</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onUndo}
                disabled={undoDisabled}
                title={undoDisabled ? 'Nenhuma ação recente para desfazer' : 'Desfazer última alteração'}
                className="flex items-center gap-1.5 py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-xl sm:rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#382C26] hover:bg-[#2A211C] text-white shrink-0 shadow-none"
              >
                <RotateCcw size={13} className="text-[#FFE8E0]" />
                <span className="hidden sm:inline">Desfazer</span>
              </button>
            </div>
          </div>

          <QuestionControl
            isMyTurn={isMyTurn}
            opponentName={opponentName}
            currentQuestion={currentQuestion}
            timeLeft={timeLeft}
            totalTime={totalTime}
            onAskQuestion={onAskQuestion}
            onPassTurn={onPassTurn}
            onOpenGuessModal={onOpenGuessModal}
          />
        </div>

        {/* Tabuleiro com Rolagem Vertical e Grade Original */}
        <div className="bg-[#FAF6F0] border border-[#E8E0D8] rounded-2xl sm:rounded-3xl p-2 sm:p-4 shadow-xs">
          <div
            className={`grid gap-2 sm:gap-2.5 md:gap-3 cards-board-grid ${getBoardGridClasses(
              deck.length
            )}`}
          >
            {deck.map((char) => (
              <Card
                key={char.id}
                character={char}
                status={cardStatuses[char.id] || 'normal'}
                onCardClick={onCardClick}
              />
            ))}
          </div>
        </div>

        {/* Histórico da Partida Original */}
        <div className="w-full bg-white border border-[#E8E0D8] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E8E0D8]">
            <div className="flex items-center gap-2">
              <History size={16} className="text-[#C25E3E]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#382C26] uppercase tracking-wider">
                Histórico da Partida
              </h3>
            </div>
            <span className="text-[11px] font-bold text-[#8C786E]">
              {questionHistory.length} {questionHistory.length === 1 ? 'pergunta' : 'perguntas'}
            </span>
          </div>

          {questionHistory.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#8C786E] italic">
              Nenhuma pergunta feita ainda nesta partida.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {questionHistory.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="bg-[#FAF6F0] border border-[#E8E0D8] rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#8C786E] font-bold">
                    <span className="text-[#382C26] font-bold">{q.senderName}:</span>
                    {q.answer !== null && q.answer !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          q.answer
                            ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                            : 'bg-[#FFE8E0] text-[#C25E3E] border border-[#FFB59A]'
                        }`}
                      >
                        {q.answer ? 'SIM' : 'NÃO'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#382C26] font-medium leading-relaxed">
                    "{q.text}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

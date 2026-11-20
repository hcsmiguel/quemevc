import { useState, type FC } from 'react';
import type { Character, CardStatus, Question } from '../../types/game';
import { Card } from '../Card';
import { TurnTimer } from '../TurnTimer';
import {
  RotateCcw,
  Trophy,
  Send,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

interface MatchDesignCProps {
  deck: Character[];
  cardStatuses: Record<string, CardStatus>;
  secretCharacter: Character;
  questionHistory: Question[];
  currentQuestion: Question | null;
  isMyTurn: boolean;
  timeLeft: number;
  totalTime: number;
  opponentName: string;
  playerName: string;
  roomCode: string;
  undoDisabled: boolean;
  onCardClick: (char: Character) => void;
  onUndo: () => void;
  onAskQuestion: (text: string) => void;
  onPassTurn: () => void;
  onOpenGuessModal: () => void;
}

export const MatchDesignC: FC<MatchDesignCProps> = ({
  deck,
  cardStatuses,
  secretCharacter,
  questionHistory,
  currentQuestion: _currentQuestion,
  isMyTurn,
  timeLeft,
  totalTime,
  opponentName,
  playerName,
  roomCode,
  undoDisabled,
  onCardClick,
  onUndo,
  onAskQuestion,
  onPassTurn: _onPassTurn,
  onOpenGuessModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [peekSecret, setPeekSecret] = useState(true);

  // Contadores
  const activeCount = deck.filter((c) => cardStatuses[c.id] !== 'discard').length;
  const discardCount = deck.length - activeCount;

  const handleSend = () => {
    if (!inputText.trim()) return;
    sounds.playQuestion();
    onAskQuestion(inputText.trim());
    setInputText('');
  };

  const getGridCols = (count: number) => {
    if (count <= 15) return 'grid-cols-3 sm:grid-cols-5';
    if (count <= 30) return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5';
    if (count <= 60) return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-7';
    return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8';
  };

  return (
    <div className="w-full max-w-[1680px] mx-auto px-2 sm:px-4 py-2 flex flex-col gap-3 min-h-[calc(100vh-80px)]">
      {/* Header Compacto com Indicador de Sala */}
      <div className="flex items-center justify-between text-xs text-[#8C786E] px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#382C26]">Mesa de Dedução</span>
          <span>•</span>
          <span>Sala: {roomCode} ({deck.length} cartas)</span>
        </div>
        <div className="flex items-center gap-2">
          <TurnTimer timeLeft={timeLeft} totalTime={totalTime} isOpponent={!isMyTurn} />
        </div>
      </div>

      {/* Grid Principal: 60% Mesa de Cartas à Esquerda | 40% Stream de Investigação à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">
        {/* ========================================================= */}
        {/* LADO ESQUERDO (~60%): A Mesa de Cartas com Minidock */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-3">
          {/* Tabuleiro com acabamento de mesa de madeira/feltro claro */}
          <div className="bg-[#FAF6F0] border-2 border-[#E8E0D8] rounded-3xl p-3 sm:p-4 shadow-sm relative">
            <div className={`grid gap-2 sm:gap-3 ${getGridCols(deck.length)}`}>
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

          {/* Minidock Inferior: Carta Secreta Tátil + Desfazer + Contadores */}
          <div className="bg-white border border-[#E8E0D8] rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            {/* Carta Secreta Tátil (com efeito de envelope/dobra) */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#FAF6F0] border border-[#E8E0D8] flex items-center justify-center relative overflow-hidden shadow-2xs">
                {peekSecret && secretCharacter.imageUrl ? (
                  <img
                    src={secretCharacter.imageUrl}
                    alt={secretCharacter.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Shield size={18} className="text-[#C25E3E]" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[#8C786E] flex items-center gap-1">
                  <span>Sua Identidade</span>
                  <button
                    type="button"
                    onClick={() => setPeekSecret((prev) => !prev)}
                    className="text-[#C25E3E] hover:underline cursor-pointer"
                  >
                    ({peekSecret ? 'Ocultar' : 'Espiar'})
                  </button>
                </span>
                <span className="text-xs sm:text-sm font-black text-[#382C26]">
                  {peekSecret ? secretCharacter.name : '••••••••'}
                </span>
              </div>
            </div>

            {/* Contadores & Botão Desfazer */}
            <div className="flex items-center gap-2">
              <div className="text-xs font-bold text-[#8C786E] flex items-center gap-1.5 bg-[#FAF6F0] px-3 py-1.5 rounded-xl border border-[#E8E0D8]">
                <span className="text-[#2E7D32]">● {activeCount}</span>
                <span>/</span>
                <span className="text-[#8C786E]">○ {discardCount}</span>
              </div>
              <button
                type="button"
                onClick={onUndo}
                disabled={undoDisabled}
                className="flex items-center gap-1 py-1.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#382C26] hover:bg-[#2A211C] text-white"
              >
                <RotateCcw size={12} className="text-[#FFE8E0]" />
                <span className="hidden sm:inline">Desfazer</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LADO DIREITO (~40%): Stream de Investigação Conversacional */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-3 sticky top-2">
          <div className="bg-white border border-[#E8E0D8] rounded-3xl p-4 shadow-xs flex flex-col gap-3 h-[calc(100vh-120px)] min-h-[500px]">
            {/* Header do Stream */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D8]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FFE8E0] text-[#C25E3E] flex items-center justify-center">
                  <MessageSquare size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#382C26] uppercase tracking-wider">
                    Stream de Investigação
                  </h3>
                  <p className="text-[10px] text-[#8C786E]">Diálogo de dedução em tempo real</p>
                </div>
              </div>

              {/* Botão de Palpite no topo do stream */}
              <button
                type="button"
                onClick={onOpenGuessModal}
                disabled={!isMyTurn}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  isMyTurn
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                    : 'bg-[#FAF6F0] text-[#8C786E] border border-[#E8E0D8] opacity-50 cursor-not-allowed'
                }`}
              >
                <Trophy size={13} />
                <span>Palpite</span>
              </button>
            </div>

            {/* Balões Conversacionais com Scroll Suave */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
              {questionHistory.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#8C786E] italic">
                  O stream está aguardando a primeira pergunta...
                </div>
              ) : (
                questionHistory.map((q, idx) => {
                  const isMine = q.senderName === playerName;
                  return (
                    <div
                      key={q.id || idx}
                      className={`flex flex-col gap-1 max-w-[90%] ${
                        isMine ? 'self-end items-end' : 'self-start items-start'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-[#8C786E]">
                        {q.senderName}
                      </span>
                      <div
                        className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                          isMine
                            ? 'bg-[#FFE8E0]/40 border-[#FFB59A]/60 text-[#382C26] rounded-tr-none'
                            : 'bg-[#FAF6F0] border-[#E8E0D8] text-[#382C26] rounded-tl-none'
                        }`}
                      >
                        <p className="font-semibold">"{q.text}"</p>
                        {q.answer !== null && q.answer !== undefined && (
                          <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-[#8C786E] font-medium">Resposta:</span>
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                q.answer
                                  ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                                  : 'bg-[#FFE8E0] text-[#C25E3E] border border-[#FFB59A]'
                              }`}
                            >
                              {q.answer ? 'SIM ✅' : 'NÃO ❌'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input na Base do Stream */}
            <div className="pt-2 border-t border-[#E8E0D8]">
              {isMyTurn ? (
                <div className="relative flex items-center bg-[#FAF6F0] border border-[#E8E0D8] rounded-xl focus-within:border-[#C25E3E] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#C25E3E]/10 transition-all h-10 pl-3 pr-1.5 shadow-2xs">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Faça sua pergunta de dedução..."
                    className="flex-1 h-full bg-transparent text-[#382C26] placeholder-[#8C786E] text-xs font-medium focus:outline-none pr-1.5"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    title={inputText.trim() ? 'Enviar pergunta (Enter)' : 'Digite uma pergunta para enviar'}
                    aria-label="Enviar pergunta"
                    className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      inputText.trim()
                        ? 'bg-[#C25E3E] hover:bg-[#A94E31] active:scale-95 text-white shadow-xs'
                        : 'bg-transparent text-[#B5A59D] cursor-not-allowed opacity-40'
                    }`}
                  >
                    <Send size={13} className={inputText.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''} />
                  </button>
                </div>
              ) : (
                <div className="h-10 bg-[#FAF6F0] rounded-xl border border-[#E8E0D8] flex items-center px-3 text-xs text-[#8C786E] italic">
                  Vez de {opponentName} perguntar...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

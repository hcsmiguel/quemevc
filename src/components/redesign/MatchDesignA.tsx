import { useState, type FC } from 'react';
import type { Character, CardStatus, Question } from '../../types/game';
import { Card } from '../Card';
import { SecretCardBadge } from '../SecretCardBadge';
import { TurnTimer } from '../TurnTimer';
import {
  RotateCcw,
  Trophy,
  Send,
  History,
  Shield,
  Clock,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

interface MatchDesignAProps {
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

export const MatchDesignA: FC<MatchDesignAProps> = ({
  deck,
  cardStatuses,
  secretCharacter,
  questionHistory,
  currentQuestion,
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
  onPassTurn,
  onOpenGuessModal,
}) => {
  const [inputText, setInputText] = useState('');

  // Contadores
  const activeCount = deck.filter((c) => cardStatuses[c.id] !== 'discard').length;
  const discardCount = deck.length - activeCount;

  const handleSend = () => {
    if (!inputText.trim()) return;
    sounds.playQuestion();
    onAskQuestion(inputText.trim());
    setInputText('');
  };

  // Grade responsiva otimizada da Proposta A: 6 colunas para 30 cartas (em vez de 10)
  const getGridCols = (count: number) => {
    if (count <= 15) return 'grid-cols-3 sm:grid-cols-5';
    if (count <= 30) return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
    if (count <= 60) return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8';
    return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9';
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 py-2 flex flex-col gap-3 min-h-[calc(100vh-80px)]">
      {/* Sub-header de Partida: Código da sala + Placar */}
      <div className="flex items-center justify-between text-xs text-[#8C786E] px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#382C26]">Sala: {roomCode}</span>
          <span>•</span>
          <span className="font-semibold">{deck.length} Caras</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-[#E8E0D8] shadow-2xs font-bold text-[#382C26]">
          <span>{playerName}</span>
          <span className="text-[#C25E3E] font-extrabold text-[10px]">VS</span>
          <span>{opponentName}</span>
        </div>
      </div>

      {/* Grid Principal de 2 Colunas no Desktop (~72% Tabuleiro à Esquerda | ~28% Painel Sticky à Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start flex-1">
        {/* ========================================================= */}
        {/* COLUNA ESQUERDA: Tabuleiro Amplo + Barra de Perguntas na Base */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-3">
          {/* Barra de Status do Tabuleiro: Contadores + Desfazer */}
          <div className="bg-white border border-[#E8E0D8] rounded-2xl p-2.5 sm:px-4 sm:py-2.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#E8F5E9] text-[#2E7D32] text-xs font-bold"
                title="Personagens ainda em jogo"
              >
                <span className="w-2 h-2 rounded-full bg-[#2E7D32] shrink-0" />
                <span>{activeCount}</span>
                <span className="font-semibold text-[11px] text-[#2E7D32]">em jogo</span>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FAF6F0] text-[#8C786E] text-xs font-bold"
                title="Personagens eliminados"
              >
                <span className="w-2 h-2 rounded-full bg-[#8C786E] shrink-0" />
                <span>{discardCount}</span>
                <span className="font-semibold text-[11px] text-[#8C786E]">descartadas</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onUndo}
              disabled={undoDisabled}
              title={undoDisabled ? 'Nenhuma ação recente para desfazer' : 'Desfazer última alteração'}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#382C26] hover:bg-[#2A211C] text-white shadow-none"
            >
              <RotateCcw size={13} className="text-[#FFE8E0]" />
              <span className="hidden sm:inline">Desfazer</span>
            </button>
          </div>

          {/* O Tabuleiro de Cartas: Espaço Expandido, Proporção 1:1, Nomes Grandes */}
          <div className="bg-[#FAF6F0] border border-[#E8E0D8] rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs">
            <div className={`grid gap-2.5 sm:gap-3 ${getGridCols(deck.length)}`}>
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

          {/* Barra de Pergunta na Base do Tabuleiro: Ampla, Ergonômica e Confortável */}
          <div className="bg-white border border-[#E8E0D8] rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col gap-2.5">
            {/* Header de Status da Ação */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isMyTurn ? 'bg-[#C25E3E] animate-pulse' : 'bg-[#8C786E]'
                  }`}
                />
                <span className="text-xs sm:text-sm font-bold text-[#382C26]">
                  {isMyTurn ? (
                    currentQuestion && currentQuestion.answer !== null ? (
                      <span>Pergunta respondida! Descarte as cartas e passe a vez.</span>
                    ) : (
                      <span>Sua vez de formular uma pergunta para <strong>{opponentName}</strong></span>
                    )
                  ) : (
                    <span>Aguardando a pergunta de <strong>{opponentName}</strong>...</span>
                  )}
                </span>
              </div>

              {/* Tag com a última resposta se houver */}
              {currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#8C786E] font-medium hidden sm:inline">Resposta:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                      currentQuestion.answer
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                        : 'bg-[#FFE8E0] text-[#C25E3E] border border-[#FFB59A]'
                    }`}
                  >
                    {currentQuestion.answer ? 'SIM' : 'NÃO'}
                  </span>
                </div>
              )}
            </div>

            {/* Input e Botão Enviar Integrado (Sugestão C) */}
            {isMyTurn && (!currentQuestion || currentQuestion.answer === null) ? (
              <div className="relative w-full flex items-center bg-[#FAF6F0] border border-[#E8E0D8] rounded-xl focus-within:border-[#C25E3E] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#C25E3E]/10 transition-all h-11 pl-3.5 pr-1.5 shadow-2xs">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Faça uma pergunta de SIM ou NÃO (ex: Usa óculos? Tem cabelo preto?)"
                  className="flex-1 h-full bg-transparent text-[#382C26] placeholder-[#8C786E] text-xs sm:text-sm font-medium focus:outline-none pr-2"
                />
                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    aria-label="Limpar texto"
                    className="p-1 mr-1 text-[#8C786E] hover:text-[#382C26] text-xs cursor-pointer rounded hover:bg-black/5"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  title={inputText.trim() ? 'Enviar pergunta (Enter)' : 'Digite uma pergunta para enviar'}
                  aria-label="Enviar pergunta"
                  className={`h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    inputText.trim()
                      ? 'bg-[#C25E3E] hover:bg-[#A94E31] active:scale-95 text-white shadow-xs'
                      : 'bg-transparent text-[#B5A59D] cursor-not-allowed opacity-40'
                  }`}
                >
                  <Send size={15} className={inputText.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''} />
                </button>
              </div>
            ) : isMyTurn && currentQuestion && currentQuestion.answer !== null ? (
              <div className="flex items-center justify-between bg-[#FAF6F0] rounded-xl p-3 border border-[#E8E0D8]">
                <div className="text-xs text-[#382C26]">
                  "{currentQuestion.text}" • <strong>{currentQuestion.answer ? 'SIM' : 'NÃO'}</strong>
                </div>
                <button
                  type="button"
                  onClick={onPassTurn}
                  className="px-4 py-2 rounded-xl bg-[#382C26] hover:bg-[#2A211C] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Passar a Vez</span>
                </button>
              </div>
            ) : (
              <div className="h-11 bg-[#FAF6F0] rounded-xl border border-[#E8E0D8] flex items-center px-4 text-xs text-[#8C786E] italic">
                Oponente está pensando na próxima pergunta...
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUNA DIREITA (STICKY): Identidade Secreta + Timer + Histórico Permanente */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-3 sticky top-2">
          {/* Card 1: Sua Identidade Secreta */}
          <div className="bg-white border border-[#E8E0D8] rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FFE8E0] text-[#C25E3E] flex items-center justify-center shrink-0 border border-[#FFB59A]/40">
                <Shield size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-[#8C786E] font-bold">
                  Sua Carta Secreta
                </span>
                <span className="text-sm font-black text-[#382C26]">{secretCharacter.name}</span>
              </div>
            </div>
            <SecretCardBadge character={secretCharacter} />
          </div>

          {/* Card 2: Turno & Ação Nobre de Palpite */}
          <div className="bg-white border border-[#E8E0D8] rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#C25E3E]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#382C26]">
                  {isMyTurn ? 'Seu Turno' : `Turno de ${opponentName}`}
                </span>
              </div>
              <TurnTimer timeLeft={timeLeft} totalTime={totalTime} isOpponent={!isMyTurn} />
            </div>

            {/* Botão de Palpite Destacado */}
            <button
              type="button"
              onClick={onOpenGuessModal}
              disabled={!isMyTurn}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isMyTurn
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm hover:shadow'
                  : 'bg-[#FAF6F0] text-[#8C786E] border border-[#E8E0D8] opacity-50 cursor-not-allowed'
              }`}
            >
              <Trophy size={15} />
              <span>Arriscar Palpite Final</span>
            </button>
          </div>

          {/* Card 3: Histórico de Deduções Permanente (Com Scroll Interno Independente) */}
          <div className="bg-white border border-[#E8E0D8] rounded-2xl p-4 shadow-2xs flex flex-col gap-2.5 flex-1 min-h-[320px] max-h-[calc(100vh-280px)] overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E0D8]">
              <div className="flex items-center gap-2">
                <History size={15} className="text-[#C25E3E]" />
                <h3 className="text-xs font-bold text-[#382C26] uppercase tracking-wider">
                  Histórico de Deduções
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#8C786E] bg-[#FAF6F0] px-2 py-0.5 rounded-full border border-[#E8E0D8]">
                {questionHistory.length}
              </span>
            </div>

            {/* Lista com Scroll Interno: O jogador vê todas as pistas sem rolar a página */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
              {questionHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8C786E] italic">
                  Nenhuma pergunta formulada ainda.
                </div>
              ) : (
                questionHistory.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="bg-[#FAF6F0] border border-[#E8E0D8] rounded-xl p-2.5 flex flex-col gap-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#382C26]">{q.senderName}</span>
                      {q.answer !== null && q.answer !== undefined ? (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                            q.answer
                              ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                              : 'bg-[#FFE8E0] text-[#C25E3E] border border-[#FFB59A]'
                          }`}
                        >
                          {q.answer ? 'SIM' : 'NÃO'}
                        </span>
                      ) : (
                        <span className="text-[#8C786E] italic text-[10px]">Aguardando...</span>
                      )}
                    </div>
                    <p className="text-xs text-[#382C26] font-medium leading-snug">
                      "{q.text}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

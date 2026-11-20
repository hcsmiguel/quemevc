import { useState, useEffect, type FC } from 'react';
import type { Character, CardStatus, Question } from '../../types/game';
import { Card } from '../Card';
import { SecretCardBadge } from '../SecretCardBadge';
import { TurnTimer } from '../TurnTimer';
import {
  Trophy,
  Send,
  History,
  X,
  ArrowRight,
  PhoneCall,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { getBoardGridClasses } from '../../utils/cardDisplay';

interface MatchDesignBProps {
  deck: Character[];
  cardStatuses: Record<string, CardStatus>;
  secretCharacter?: Character;
  questionHistory: Question[];
  currentQuestion: Question | null;
  isMyTurn: boolean;
  timeLeft: number;
  totalTime: number;
  opponentName: string;
  playerName: string;
  roomCode: string;
  undoDisabled: boolean;
  isCallMode?: boolean;
  onCardClick: (char: Character) => void;
  onUndo: () => void;
  onAskQuestion: (text: string) => void;
  onPassTurn: () => void;
  onOpenGuessModal: () => void;
}

export const MatchDesignB: FC<MatchDesignBProps> = ({
  deck,
  cardStatuses,
  secretCharacter,
  questionHistory,
  currentQuestion,
  isMyTurn,
  timeLeft,
  totalTime,
  opponentName,
  playerName: _playerName,
  roomCode: _roomCode,
  undoDisabled,
  isCallMode = false,
  onCardClick,
  onUndo,
  onAskQuestion,
  onPassTurn,
  onOpenGuessModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  // Fechar gaveta com a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && historyDrawerOpen) {
        setHistoryDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyDrawerOpen]);

  // Contadores
  const activeCount = deck.filter((c) => cardStatuses[c.id] !== 'discard').length;
  const discardCount = deck.length - activeCount;

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    sounds.playQuestion();
    onAskQuestion(text);
    setInputText('');
  };

  return (
    <div className="w-full max-w-[1320px] mx-auto px-2 sm:px-4 py-1 sm:py-2 flex flex-col gap-3 pb-28 animate-in fade-in duration-200">
      {/* 1. FLOATING TOP HUD: Barra sutil translúcida */}
      <div className="sticky top-1 sm:top-2 z-30 bg-[#FBF8F3]/95 backdrop-blur-md border border-[#E2DACD] rounded-[8px] p-2 sm:px-4 sm:py-2.5 shadow-2xs flex items-center justify-between gap-2 transition-all">
        {/* Identidade Secreta (Chip Compacto) */}
        <div className="flex items-center shrink-0">
          {secretCharacter && <SecretCardBadge character={secretCharacter} />}
        </div>

        {/* Turno Central com Timer */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 bg-[#F6F2EA] border border-[#E2DACD] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[6px]">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isMyTurn ? 'bg-[#B4532F] animate-pulse' : 'bg-[#6F655C]'
              }`}
            />
            <span className="text-xs font-medium text-[#2B2420] hidden sm:inline truncate max-w-[150px]">
              {isMyTurn ? 'Sua Vez' : `Vez de ${opponentName}`}
            </span>
          </div>
          <TurnTimer timeLeft={timeLeft} totalTime={totalTime} isOpponent={!isMyTurn} />
        </div>

        {/* Botão de Histórico Deslizante com Badge */}
        <button
          type="button"
          onClick={() => setHistoryDrawerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[6px] bg-[#F6F2EA] hover:bg-[#E2DACD]/40 border border-[#E2DACD] text-[#2B2420] font-medium text-xs transition-colors cursor-pointer shrink-0"
          title="Ver histórico de perguntas desta partida"
        >
          <History size={13} className="text-[#B4532F]" />
          <span className="hidden sm:inline">Histórico</span>
          <span className="text-xs text-[#6F655C] font-mono">
            ({questionHistory.length})
          </span>
        </button>
      </div>

      {/* 2. BARRA DE STATUS DO TABULEIRO: Contadores em 1 linha + Desfazer em link */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-[#6F655C] font-sans">
          <strong className="text-[#2B2420] font-semibold">{activeCount}</strong> em jogo · <strong className="text-[#6F655C] font-normal">{discardCount}</strong> descartadas
        </span>

        <button
          type="button"
          onClick={onUndo}
          disabled={undoDisabled}
          title={undoDisabled ? 'Nenhuma ação recente para desfazer' : 'Desfazer último descarte'}
          className="text-xs font-medium text-[#6F655C] hover:text-[#2B2420] underline underline-offset-4 disabled:opacity-40 disabled:no-underline transition-colors cursor-pointer"
        >
          Desfazer descarte
        </button>
      </div>

      {/* 3. O TABULEIRO HERO: Direto na Mesa de Jogo */}
      <div className="w-full py-1">
        <div className={`grid gap-2 sm:gap-3 cards-board-grid ${getBoardGridClasses(deck.length)}`}>
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

      {/* 4. BARRA DE AÇÃO INFERIOR FIXA */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-[#FBF8F3]/95 backdrop-blur-md border border-[#E2DACD] rounded-[10px] p-2 sm:p-2.5 shadow-lg flex items-center gap-2 transition-all">
        {/* Caso A: MODO CALL */}
        {isCallMode ? (
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#FFE8E0] text-[#C25E3E] flex items-center justify-center shrink-0 border border-[#FFB59A]/50">
                <PhoneCall size={15} />
              </div>
              <div className="min-w-0 text-xs">
                <div className="font-bold text-[#382C26] truncate">
                  {isMyTurn ? `Sua vez de perguntar para ${opponentName} por voz` : `Vez de ${opponentName} perguntar por voz`}
                </div>
                <div className="text-[10px] text-[#8C786E]">Modo Call • Responda apenas com SIM ou NÃO</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isMyTurn && (
                <>
                  <button
                    type="button"
                    onClick={onOpenGuessModal}
                    className="h-10 px-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#FFE8E0] hover:bg-[#FFD2C4] text-[#C25E3E] border border-[#FFB59A] transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trophy size={14} />
                    <span className="hidden sm:inline">Palpite</span>
                  </button>
                  <button
                    type="button"
                    onClick={onPassTurn}
                    className="h-10 px-3.5 rounded-xl bg-[#382C26] hover:bg-[#2A211C] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Passar Vez</span>
                    <ArrowRight size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : !isMyTurn ? (
          /* Caso B: MODO PADRÃO - Vez do Oponente */
          <div className="w-full flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8C786E] shrink-0 animate-pulse" />
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[#382C26] truncate block">
                  Vez de <strong className="text-[#C25E3E]">{opponentName}</strong> perguntar
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#8C786E] truncate block">
                  Aguarde a pergunta para responder com SIM ou NÃO
                </span>
              </div>
            </div>

            {currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs bg-[#FAF6F0] px-2.5 py-1 rounded-xl border border-[#E8E0D8]">
                <span className="text-[#8C786E]">Última:</span>
                <span
                  className={`font-black px-1.5 py-0.5 rounded text-[10px] uppercase ${
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
        ) : currentQuestion && (currentQuestion.answer === null || currentQuestion.answer === undefined) ? (
          /* Caso C: MODO PADRÃO - É meu turno e aguardo resposta do oponente */
          <div className="w-full flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-ping" />
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[#382C26] truncate block">
                  "{currentQuestion.text}"
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#8C786E] truncate block">
                  Aguardando resposta de <strong className="text-[#382C26]">{opponentName}</strong>...
                </span>
              </div>
            </div>
            <div className="shrink-0 text-xs text-[#8C786E] font-medium hidden sm:block italic">
              Respondendo...
            </div>
          </div>
        ) : currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined ? (
          /* Caso D: MODO PADRÃO - Pergunta acabou de ser respondida */
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`px-2.5 py-1 rounded-xl font-black text-xs shrink-0 uppercase tracking-wider ${
                  currentQuestion.answer
                    ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                    : 'bg-[#FFE8E0] text-[#C25E3E] border border-[#FFB59A]'
                }`}
              >
                {currentQuestion.answer ? 'SIM' : 'NÃO'}
              </span>
              <div className="min-w-0 text-xs">
                <div className="font-bold text-[#382C26] truncate">
                  {opponentName} {currentQuestion.answer ? 'confirmou' : 'negou'} para "{currentQuestion.text}"
                </div>
                <div className="text-[10px] text-[#8C786E] truncate">Descarte as cartas e passe a vez</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenGuessModal}
                className="h-10 px-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#FFE8E0] hover:bg-[#FFD2C4] text-[#C25E3E] border border-[#FFB59A] transition-all cursor-pointer flex items-center gap-1"
              >
                <Trophy size={14} />
                <span className="hidden sm:inline">Palpite</span>
              </button>
              <button
                type="button"
                onClick={onPassTurn}
                className="h-10 px-3.5 rounded-xl bg-[#382C26] hover:bg-[#2A211C] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Passar Vez</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ) : (
          /* Caso E: MODO PADRÃO - Minha vez de formular uma pergunta (Sugestão C: Enviar Integrado ao Input) */
          <>
            <button
              type="button"
              onClick={onOpenGuessModal}
              title="Arriscar palpite de quem é o personagem"
              className="h-10 px-3 rounded-[6px] font-sans font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 bg-transparent hover:bg-[#F2ECE1] text-[#2B2420] border border-[#2B2420]"
            >
              <Trophy size={13} className="text-[#B4532F]" />
              <span className="hidden sm:inline">Palpite</span>
            </button>

            {/* Input integrado estilo mensageiro com botão Enviar embutido na direita */}
            <div className="relative flex-1 flex items-center bg-[#F6F2EA] border border-[#E2DACD] rounded-[6px] focus-within:border-[#2B2420] focus-within:bg-white transition-all h-10 pl-3.5 pr-1 shadow-2xs">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Faça uma pergunta de SIM ou NÃO (ex: Usa óculos? Tem barba?)..."
                className="flex-1 h-full bg-transparent text-[#2B2420] placeholder-[#A39A90] font-sans text-xs sm:text-sm font-normal focus:outline-none pr-2"
              />

              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  aria-label="Limpar texto"
                  className="p-1 mr-1 text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer rounded-[4px]"
                >
                  <X size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={handleSend}
                disabled={!inputText.trim()}
                title={inputText.trim() ? 'Enviar pergunta (Enter)' : 'Digite uma pergunta para enviar'}
                aria-label="Enviar pergunta"
                className={`h-8 px-3 rounded-[4px] flex items-center justify-center transition-all cursor-pointer shrink-0 font-sans font-medium text-xs gap-1 ${
                  inputText.trim()
                    ? 'bg-[#B4532F] hover:bg-[#984323] text-white shadow-none'
                    : 'bg-transparent text-[#A39A90] cursor-not-allowed opacity-40'
                }`}
              >
                <span>Enviar</span>
                <Send size={12} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 5. GAVETA LATERAL DESLIZANTE DE HISTÓRICO (Slide-over Drawer) */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Escurecido Suave */}
          <div
            className="fixed inset-0 bg-[#382C26]/30 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setHistoryDrawerOpen(false)}
          />

          {/* Painel da Gaveta */}
          <div className="relative w-full max-w-md bg-[#FBF8F3] h-full shadow-2xl border-l border-[#E2DACD] p-5 flex flex-col gap-4 z-10 animate-in slide-in-from-right duration-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DACD]">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#B4532F]" />
                <h2 className="font-serif text-lg text-[#2B2420] font-normal">
                  Histórico da Partida
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-1 rounded-[4px] text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
              {questionHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#6F655C] italic">
                  Nenhuma pergunta feita ainda nesta partida.
                </div>
              ) : (
                questionHistory.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="bg-[#F6F2EA] border border-[#E2DACD] rounded-[6px] p-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-xs text-[#6F655C]">
                      <span className="font-medium text-[#2B2420]">{q.senderName}</span>
                      {q.answer !== null && q.answer !== undefined ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            q.answer
                              ? 'bg-[#E8F5E9] text-[#2E7D32]'
                              : 'bg-[#F8EBEA] text-[#8C2E2A]'
                          }`}
                        >
                          {q.answer ? 'SIM' : 'NÃO'}
                        </span>
                      ) : (
                        <span className="text-[#B4532F] text-[10px]">Aguardando resposta...</span>
                      )}
                    </div>
                    <p className="text-xs text-[#2B2420] font-normal leading-relaxed">
                      "{q.text}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

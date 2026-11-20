import { useState, type FC } from 'react';
import type { Question } from '../types/game';
import { Send, Trophy, ArrowRight, PhoneCall, X } from 'lucide-react';
import { sounds } from '../utils/sound';
import { TurnTimer } from './TurnTimer';

interface QuestionControlProps {
  isMyTurn: boolean;
  opponentName: string;
  currentQuestion: Question | null;
  timeLeft?: number;
  totalTime?: number;
  isCallMode?: boolean;
  onAskQuestion: (text: string, traitKey?: any, traitValue?: any) => void;
  onPassTurn: () => void;
  onOpenGuessModal: () => void;
}

export const QuestionControl: FC<QuestionControlProps> = ({
  isMyTurn,
  opponentName,
  currentQuestion,
  timeLeft = 60,
  totalTime = 60,
  isCallMode = false,
  onAskQuestion,
  onPassTurn,
  onOpenGuessModal,
}) => {
  const [customText, setCustomText] = useState<string>('');

  const handleSend = () => {
    const questionText = customText.trim();
    if (!questionText) return;

    sounds.playQuestion();
    onAskQuestion(questionText);
    setCustomText('');
  };

  // 1. MODO CALL (Chamada de Voz / Presencial)
  if (isCallMode) {
    if (!isMyTurn) {
      return (
        <div className="bg-white border border-[#E8E0D8] rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#FAF6F0] text-[#8C786E] border border-[#E8E0D8] flex items-center justify-center shrink-0">
              <PhoneCall size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#382C26] truncate">
                Vez de <strong className="text-[#C25E3E] font-bold">{opponentName}</strong> perguntar por voz
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#8C786E] truncate">
                Modo Call ativo • Responda apenas com sim ou não
              </div>
            </div>
          </div>
          <TurnTimer timeLeft={timeLeft} totalTime={totalTime} isOpponent={true} />
        </div>
      );
    }

    return (
      <div className="bg-white border border-[#E8E0D8] rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#FFE8E0] text-[#C25E3E] border border-[#FFB59A] flex items-center justify-center shrink-0">
            <PhoneCall size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-[#382C26] truncate">
              Sua vez de perguntar para <strong className="text-[#C25E3E] font-bold">{opponentName}</strong>
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#8C786E] truncate">
              Faça sua pergunta por voz e passe a vez
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <TurnTimer timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
          <button
            type="button"
            onClick={onOpenGuessModal}
            className="h-10 px-3.5 rounded-xl bg-[#FFE8E0] hover:bg-[#FFD2C4] text-[#C25E3E] border border-[#FFB59A] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Trophy size={14} />
            <span>Palpite</span>
          </button>
          <button
            type="button"
            onClick={onPassTurn}
            className="h-10 px-3.5 rounded-xl bg-[#382C26] hover:bg-[#2A211C] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Passar Vez</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // 2. MODO TRADICIONAL - Vez do Oponente Perguntar
  if (!isMyTurn) {
    return (
      <div className="bg-white border border-[#E8E0D8] rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-[#8C786E] shrink-0 animate-pulse" />
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-[#382C26] truncate">
              Vez de <strong className="text-[#C25E3E] font-bold">{opponentName}</strong> perguntar
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#8C786E] truncate">
              Aguarde a pergunta para responder com SIM ou NÃO
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined && (
            <div className="hidden sm:flex text-[11px] bg-[#FAF6F0] px-2.5 py-1 rounded-xl border border-[#E8E0D8] text-[#776156] items-center gap-1.5">
              <span>Última:</span>
              <span className="font-bold text-[#382C26] truncate max-w-[120px]">"{currentQuestion.text}"</span>
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  currentQuestion.answer
                    ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                    : 'bg-[#FFE8E0] text-[#C25E3E] border border-[#FFB59A]'
                }`}
              >
                {currentQuestion.answer ? 'SIM' : 'NÃO'}
              </span>
            </div>
          )}
          <TurnTimer timeLeft={timeLeft} totalTime={totalTime} isOpponent={true} />
        </div>
      </div>
    );
  }

  // 3. MODO TRADICIONAL - É meu turno e aguardo resposta do oponente
  if (currentQuestion && (currentQuestion.answer === null || currentQuestion.answer === undefined)) {
    return (
      <div className="bg-white border border-[#E8E0D8] rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-[#C25E3E] shrink-0 animate-ping" />
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-[#382C26] truncate">
              "{currentQuestion.text}"
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#8C786E] truncate">
              Aguardando resposta de <strong className="text-[#382C26]">{opponentName}</strong>...
            </div>
          </div>
        </div>
        <TurnTimer timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
      </div>
    );
  }

  // 4. MODO TRADICIONAL - Pergunta acabou de ser respondida (SIM / NÃO)
  if (currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined) {
    return (
      <div className="bg-white border border-[#E8E0D8] rounded-2xl p-2 sm:px-3.5 sm:py-2 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`px-2.5 py-1 rounded-xl font-bold text-xs shrink-0 uppercase tracking-wider ${
              currentQuestion.answer
                ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                : 'bg-[#FFE8E0] text-[#C25E3E] border border-[#FFB59A]'
            }`}
          >
            {currentQuestion.answer ? 'SIM' : 'NÃO'}
          </span>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-[#382C26] truncate">
              {currentQuestion.answer
                ? `${opponentName} confirmou para "${currentQuestion.text}"`
                : `${opponentName} negou para "${currentQuestion.text}"`}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#8C786E] truncate">
              Descarte as cartas que não batem e passe a vez
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <TurnTimer timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
          <button
            type="button"
            onClick={onOpenGuessModal}
            className="h-10 px-3.5 rounded-xl bg-[#FFE8E0] hover:bg-[#FFD2C4] text-[#C25E3E] border border-[#FFB59A] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Trophy size={14} />
            <span>Palpite</span>
          </button>
          <button
            type="button"
            onClick={onPassTurn}
            className="h-10 px-3.5 rounded-xl bg-[#382C26] hover:bg-[#2A211C] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Passar Vez</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // 5. MODO TRADICIONAL - Minha vez de fazer uma pergunta
  return (
    <div className="bg-white border border-[#E8E0D8] rounded-2xl p-2 sm:px-3 sm:py-2.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
      {/* Título conciso + Timer */}
      <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#C25E3E] shrink-0" />
          <div className="text-xs sm:text-sm font-bold text-[#382C26] truncate">
            Sua vez de perguntar para <strong className="text-[#C25E3E] font-bold">{opponentName}</strong>
          </div>
        </div>
        <div className="sm:hidden">
          <TurnTimer timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
        </div>
      </div>

      {/* Formulário de Pergunta: Campo com Enviar Integrado + Botão Palpite */}
      <div className="flex items-center gap-2 flex-1 sm:max-w-xl">
        <div className="relative flex-1 flex items-center bg-[#FAF6F0] border border-[#E8E0D8] rounded-xl focus-within:border-[#C25E3E] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#C25E3E]/10 transition-all h-10 pl-3 pr-1.5 shadow-2xs">
          <input
            type="text"
            placeholder="Pergunte algo de sim ou não..."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 h-full bg-transparent text-[#382C26] placeholder-[#8C786E] text-xs font-medium focus:outline-none pr-1.5"
          />
          {customText && (
            <button
              type="button"
              onClick={() => setCustomText('')}
              aria-label="Limpar texto"
              className="p-1 mr-1 text-[#8C786E] hover:text-[#382C26] text-xs cursor-pointer rounded hover:bg-black/5 transition-colors"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={!customText.trim()}
            title={customText.trim() ? 'Enviar pergunta (Enter)' : 'Digite uma pergunta para enviar'}
            aria-label="Enviar pergunta"
            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              customText.trim()
                ? 'bg-[#C25E3E] hover:bg-[#A94E31] active:scale-95 text-white shadow-xs'
                : 'bg-transparent text-[#B5A59D] cursor-not-allowed opacity-40'
            }`}
          >
            <Send size={13} className={customText.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''} />
          </button>
        </div>

        <div className="hidden sm:block">
          <TurnTimer timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
        </div>

        <button
          type="button"
          onClick={onOpenGuessModal}
          className="h-10 px-3 rounded-xl bg-[#FFE8E0] hover:bg-[#FFD2C4] text-[#C25E3E] border border-[#FFB59A] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
        >
          <Trophy size={14} />
          <span className="hidden md:inline">Palpite</span>
        </button>
      </div>
    </div>
  );
};

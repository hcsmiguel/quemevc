import { useState, type FC } from 'react';
import type { Question } from '../types/game';
import { Send, Trophy, ArrowRight, Clock, MessageSquareQuote, Headphones } from 'lucide-react';
import { sounds } from '../utils/sound';

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

const TurnTimerBadge: FC<{ timeLeft: number; totalTime?: number; isOpponent?: boolean }> = ({
  timeLeft,
  totalTime = 60,
  isOpponent = false,
}) => {
  const isUrgent = timeLeft <= 10;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const pct = Math.min(100, Math.max(0, (timeLeft / totalTime) * 100));

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-sans font-black tabular-nums tracking-tight transition-all shrink-0 shadow-sm ${
        isUrgent
          ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse ring-2 ring-rose-200'
          : isOpponent
          ? 'bg-slate-100 text-slate-700 border-slate-200'
          : 'bg-sky-50 text-sky-800 border-sky-200'
      }`}
      title={isUrgent ? 'Tempo quase esgotado!' : 'Tempo restante deste turno'}
    >
      <Clock size={14} className={isUrgent ? 'text-rose-600 animate-spin' : isOpponent ? 'text-slate-500' : 'text-sky-600'} />
      <span className="font-black tracking-tight">{formatted}</span>
      <div className="w-8 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden md:block">
        <div
          className={`h-full transition-all duration-1000 ${
            isUrgent ? 'bg-rose-500' : isOpponent ? 'bg-slate-500' : 'bg-sky-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

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

  // 1. MODO CALL (Chamada de Voz / Presencial)
  if (isCallMode) {
    if (!isMyTurn) {
      return (
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-2.5 sm:p-3.5 flex items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
              <Headphones size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-black text-purple-600 tracking-wider">
                Vez de {opponentName} • Modo Call
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                Aguardando pergunta de <strong className="text-purple-700">{opponentName}</strong>...
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Responda SIM ou NÃO falando em voz alta!
              </div>
            </div>
          </div>
          <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={true} />
        </div>
      );
    }

    return (
      <div className="bg-purple-50/90 border-2 border-purple-300 rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-tactile-sm shrink-0">
            <Headphones size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black text-purple-900 uppercase tracking-wider">
                Seu Turno • Modo Call
              </span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
              Faça sua pergunta para <strong className="text-purple-700">{opponentName}</strong>!
            </div>
            <div className="text-[10px] sm:text-[11px] text-purple-700 font-semibold">
              Pergunta de SIM ou NÃO (descarte cartas e passe a vez).
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />

          <button
            type="button"
            onClick={onOpenGuessModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_2px_0_#d97706] transition-all active:translate-y-0.5 cursor-pointer"
          >
            <Trophy size={14} />
            <span>Palpite</span>
          </button>

          <button
            type="button"
            onClick={onPassTurn}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_2px_0_#059669] transition-all active:translate-y-0.5 cursor-pointer"
          >
            <span>Passar Vez</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    const questionText = customText.trim();
    if (!questionText) return;

    sounds.playQuestion();
    onAskQuestion(questionText);
    setCustomText('');
  };

  // 2. MODO TRADICIONAL - Vez do Oponente
  if (!isMyTurn) {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-2.5 sm:p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
              Vez do Oponente
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Aguardando pergunta de <strong className="text-rose-600">{opponentName}</strong>...
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
              Responda SIM ou NÃO no modal quando ela perguntar.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined && (
            <div className="text-[11px] bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 flex items-center gap-1.5">
              <span>Última:</span>
              <span className="font-bold text-slate-900 truncate max-w-[100px]">"{currentQuestion.text}"</span>
              <span
                className={`font-black px-1.5 py-0.5 rounded text-[10px] ${
                  currentQuestion.answer
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {currentQuestion.answer ? 'SIM' : 'NÃO'}
              </span>
            </div>
          )}
          <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={true} />
        </div>
      </div>
    );
  }

  // 3. MODO TRADICIONAL - É meu turno e aguardo resposta
  if (currentQuestion && (currentQuestion.answer === null || currentQuestion.answer === undefined)) {
    return (
      <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-2.5 sm:p-3.5 flex items-center justify-between shadow-sm animate-pulse gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <MessageSquareQuote size={22} className="text-amber-700 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-black text-amber-900 uppercase tracking-wide block">
              Pergunta Enviada!
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate block">
              "{currentQuestion.text}"
            </span>
            <span className="text-[10px] sm:text-[11px] text-amber-800 font-semibold">
              Aguardando {opponentName} responder...
            </span>
          </div>
        </div>
        <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
      </div>
    );
  }

  // 4. MODO TRADICIONAL - Pergunta acabou de ser respondida
  if (currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined) {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-base sm:text-lg shadow-tactile-sm shrink-0 ${
              currentQuestion.answer
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
            }`}
          >
            {currentQuestion.answer ? 'SIM' : 'NÃO'}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-slate-500 truncate">
              {opponentName} respondeu para "{currentQuestion.text}":
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-900">
              {currentQuestion.answer
                ? '✅ SIM! O personagem TEM essa característica.'
                : '❌ NÃO! O personagem NÃO tem essa característica.'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-amber-700 font-bold">
              Descarte as cartas no tabuleiro e finalize seu turno.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
          <button
            type="button"
            onClick={onOpenGuessModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_2px_0_#d97706] transition-all active:translate-y-0.5 cursor-pointer"
          >
            <Trophy size={14} />
            <span>Palpite</span>
          </button>
          <button
            type="button"
            onClick={onPassTurn}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_2px_0_#059669] transition-all active:translate-y-0.5 cursor-pointer"
          >
            <span>Passar Vez</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // 5. MODO TRADICIONAL - Fazer uma nova pergunta
  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-900 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="truncate">Sua vez de perguntar para <strong className="text-sky-700">{opponentName}</strong>!</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
            Deve ser uma pergunta de SIM ou NÃO.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
          <button
            type="button"
            onClick={onOpenGuessModal}
            className="flex items-center gap-1 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] sm:text-xs uppercase tracking-wider shadow-[0_2px_0_#d97706] transition-all active:translate-y-0.5 cursor-pointer"
          >
            <Trophy size={13} />
            <span className="hidden sm:inline">Palpite</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Digite sua pergunta (ex: 'Tem barba?', 'Usa chapéu?')..."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold rounded-xl pl-3 pr-7 py-2.5 focus:outline-none focus:bg-white focus:border-sky-400 transition-all"
          />
          {customText && (
            <button
              onClick={() => setCustomText('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!customText.trim()}
          className="shrink-0 flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-[0_2px_0_#0284c7] transition-all active:translate-y-0.5 cursor-pointer"
        >
          <Send size={13} />
          <span>Enviar</span>
        </button>
      </div>
    </div>
  );
};

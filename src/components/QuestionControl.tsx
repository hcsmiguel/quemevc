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
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-sans font-black tabular-nums tracking-tight transition-all shrink-0 shadow-sm ${
        isUrgent
          ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse ring-2 ring-rose-200'
          : isOpponent
          ? 'bg-slate-100 text-slate-700 border-slate-200'
          : 'bg-sky-50 text-sky-800 border-sky-200'
      }`}
      title={isUrgent ? 'Tempo quase esgotado!' : 'Tempo restante deste turno'}
    >
      <Clock size={15} className={isUrgent ? 'text-rose-600 animate-spin' : isOpponent ? 'text-slate-500' : 'text-sky-600'} />
      <span className="font-black tracking-tight">{formatted}</span>
      <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
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

  // NOVO: Modo Call (Jogando por Voz / Presencial)
  if (isCallMode) {
    if (!isMyTurn) {
      return (
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-tactile-sm">
              <Headphones size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-purple-600 tracking-wider">
                Vez de {opponentName} • Modo Call (Voz)
              </div>
              <div className="text-sm font-bold text-slate-900">
                Aguardando <strong className="text-purple-700">{opponentName}</strong> falar a pergunta na chamada...
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Responda SIM ou NÃO falando em voz alta!
              </div>
            </div>
          </div>
          <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={true} />
        </div>
      );
    }

    return (
      <div className="bg-purple-50/90 border-2 border-purple-300 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-tactile-sm shrink-0">
            <Headphones size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black text-purple-900 uppercase tracking-wider">
                Seu Turno • Modo Call (Voz)
              </span>
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">
              Faça sua pergunta falando na chamada/pessoalmente para <strong className="text-purple-700">{opponentName}</strong>!
            </div>
            <div className="text-[11px] text-purple-700 font-semibold mt-0.5">
              👉 Ouça a resposta em voz alta, marque ou descarte as cartas no tabuleiro e finalize seu turno.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
          <button
            type="button"
            onClick={onOpenGuessModal}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#d97706] transition-all active:translate-y-0.5 cursor-pointer"
          >
            <Trophy size={15} />
            Arriscar Chute
          </button>
          <button
            type="button"
            onClick={onPassTurn}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#059669] transition-all active:translate-y-0.5 cursor-pointer"
          >
            Finalizar Turno
            <ArrowRight size={16} />
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

  // 1. Não é meu turno (Vez do Oponente)
  if (!isMyTurn) {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shadow-tactile-sm">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              Vez do Oponente
            </div>
            <div className="text-sm font-bold text-slate-900">
              Aguardando <strong className="text-rose-600">{opponentName}</strong> fazer uma pergunta...
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined && (
            <div className="text-xs bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 flex items-center gap-2">
              <span>Última pergunta:</span>
              <span className="font-bold text-slate-900">"{currentQuestion.text}"</span>
              <span>➔</span>
              <span
                className={`font-black px-2 py-0.5 rounded-lg text-xs ${
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

  // 2. É meu turno e enviei uma pergunta que aguarda resposta
  if (currentQuestion && (currentQuestion.answer === null || currentQuestion.answer === undefined)) {
    return (
      <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse">
        <div className="flex items-center gap-3">
          <MessageSquareQuote size={26} className="text-amber-700 shrink-0" />
          <div>
            <span className="text-xs font-black text-amber-900 uppercase tracking-wide block">
              Pergunta Enviada!
            </span>
            <span className="text-sm font-extrabold text-slate-900">
              "{currentQuestion.text}"
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-amber-800 font-semibold bg-white px-3.5 py-1.5 rounded-xl border border-amber-200">
            Aguardando {opponentName} responder <strong className="text-emerald-700">SIM</strong> ou <strong className="text-rose-700">NÃO</strong>...
          </div>
          <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
        </div>
      </div>
    );
  }

  // 3. É meu turno e a pergunta acabou de ser respondida
  if (currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined) {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-tactile-sm shrink-0 ${
              currentQuestion.answer
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
            }`}
          >
            {currentQuestion.answer ? 'SIM' : 'NÃO'}
          </div>
          <div>
            <div className="text-xs text-slate-500">
              Resposta de <strong className="text-rose-600">{opponentName}</strong> para "{currentQuestion.text}":
            </div>
            <div className="text-sm font-black text-slate-900 mt-0.5">
              {currentQuestion.answer
                ? '✅ SIM! O personagem secreto dela TEM essa característica.'
                : '❌ NÃO! O personagem secreto dela NÃO tem essa característica.'}
            </div>
            <div className="text-[11px] text-amber-700 font-semibold mt-1">
              👉 Marque ou descarte as cartas no seu tabuleiro e clique em "Finalizar Turno".
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
          <button
            onClick={onOpenGuessModal}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#d97706] transition-all active:translate-y-0.5"
          >
            <Trophy size={15} />
            Arriscar Chute
          </button>
          <button
            onClick={onPassTurn}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#059669] transition-all active:translate-y-0.5"
          >
            Finalizar Turno
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 4. É meu turno e preciso fazer uma pergunta
  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sky-800 font-black text-xs uppercase tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          Seu Turno! Faça uma pergunta (A resposta dela será SIM ou NÃO)
        </div>
        <div className="flex items-center gap-2.5">
          <TurnTimerBadge timeLeft={timeLeft} totalTime={totalTime} isOpponent={false} />
          <button
            onClick={onOpenGuessModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#d97706] transition-all active:translate-y-0.5"
          >
            <Trophy size={14} />
            Já sei quem é!
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 items-center">
        {/* Campo de Pergunta Personalizada Livre */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Digite sua pergunta (ex: 'Tem barba?', 'Usa chapéu?', 'É loiro?')..."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-3 focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
          />
          {customText && (
            <button
              onClick={() => setCustomText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Botão Enviar Pergunta */}
        <button
          onClick={handleSend}
          disabled={!customText.trim()}
          className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-5 rounded-xl shadow-[0_3px_0_#0284c7] transition-all active:translate-y-0.5 cursor-pointer"
        >
          <Send size={14} />
          <span>Perguntar</span>
        </button>
      </div>
    </div>
  );
};

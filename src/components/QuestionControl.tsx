import { useState, type FC } from 'react';
import { PREDEFINED_QUESTIONS } from '../utils/characters';
import type { Question } from '../types/game';
import { Send, Trophy, ArrowRight, Clock, MessageSquareQuote } from 'lucide-react';
import { sounds } from '../utils/sound';

interface QuestionControlProps {
  isMyTurn: boolean;
  opponentName: string;
  currentQuestion: Question | null;
  onAskQuestion: (text: string, traitKey?: any, traitValue?: any) => void;
  onPassTurn: () => void;
  onOpenGuessModal: () => void;
}

export const QuestionControl: FC<QuestionControlProps> = ({
  isMyTurn,
  opponentName,
  currentQuestion,
  onAskQuestion,
  onPassTurn,
  onOpenGuessModal,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');

  const handleSend = () => {
    let questionText = customText.trim();
    let traitKey: any;
    let traitValue: any;

    if (selectedPreset) {
      const preset = PREDEFINED_QUESTIONS.find(q => q.text === selectedPreset);
      if (preset) {
        questionText = preset.text;
        traitKey = preset.traitKey;
        traitValue = preset.traitValue;
      }
    }

    if (!questionText) return;

    sounds.playQuestion();
    onAskQuestion(questionText, traitKey, traitValue);
    setCustomText('');
    setSelectedPreset('');
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
        <div className="text-xs text-amber-800 font-semibold bg-white px-3.5 py-1.5 rounded-xl border border-amber-200">
          Aguardando {opponentName} responder <strong className="text-emerald-700">SIM</strong> ou <strong className="text-rose-700">NÃO</strong>...
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
        <button
          onClick={onOpenGuessModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#d97706] transition-all active:translate-y-0.5"
        >
          <Trophy size={14} />
          Já sei quem é!
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        {/* Campo de Pergunta Personalizada Livre */}
        <div className="md:col-span-7">
          <div className="relative">
            <input
              type="text"
              placeholder="Digite sua pergunta (ex: 'Tem barba?', 'Usa chapéu?')..."
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                setSelectedPreset('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2.5 focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
            />
            {customText && (
              <button
                onClick={() => setCustomText('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Ou Seletor de Perguntas Prontas */}
        <div className="md:col-span-3">
          <select
            value={selectedPreset}
            onChange={(e) => {
              setSelectedPreset(e.target.value);
              setCustomText('');
            }}
            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-2.5 py-2.5 focus:outline-none focus:bg-white focus:border-sky-400"
          >
            <option value="">-- Ou pergunta rápida --</option>
            {PREDEFINED_QUESTIONS.map((q, idx) => (
              <option key={idx} value={q.text}>
                {q.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botão Enviar Pergunta */}
        <div className="md:col-span-2">
          <button
            onClick={handleSend}
            disabled={!selectedPreset && !customText.trim()}
            className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-3 rounded-xl shadow-[0_3px_0_#0284c7] transition-all active:translate-y-0.5 cursor-pointer"
          >
            <Send size={14} />
            Perguntar
          </button>
        </div>
      </div>
    </div>
  );
};

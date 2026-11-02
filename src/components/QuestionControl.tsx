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
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700/80 flex items-center justify-center text-slate-400 animate-pulse">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
              Vez do Oponente
            </div>
            <div className="text-sm font-bold text-white">
              Aguardando <strong className="text-pink-400">{opponentName}</strong> fazer uma pergunta...
            </div>
          </div>
        </div>

        {currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined && (
          <div className="text-xs bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-700 text-slate-300 flex items-center gap-2">
            <span>Última pergunta:</span>
            <span className="font-semibold text-amber-300">"{currentQuestion.text}"</span>
            <span>➔</span>
            <span
              className={`font-black px-2 py-0.5 rounded-lg text-xs ${
                currentQuestion.answer
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-red-950 text-red-400 border border-red-800'
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
      <div className="bg-slate-800/90 border-2 border-amber-500/60 rounded-2xl p-4 flex items-center justify-between shadow-xl animate-pulse">
        <div className="flex items-center gap-3">
          <MessageSquareQuote size={26} className="text-amber-400 shrink-0" />
          <div>
            <span className="text-xs font-black text-amber-400 uppercase tracking-wide block">
              Pergunta Enviada!
            </span>
            <span className="text-sm font-bold text-white">
              "{currentQuestion.text}"
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-semibold bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
          Aguardando {opponentName} responder <strong className="text-emerald-400">SIM</strong> ou <strong className="text-red-400">NÃO</strong>...
        </div>
      </div>
    );
  }

  // 3. É meu turno e a pergunta acabou de ser respondida
  if (currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined) {
    return (
      <div className="bg-slate-800/95 border-2 border-emerald-500/60 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0 ${
              currentQuestion.answer
                ? 'bg-emerald-600 text-white shadow-emerald-600/40 ring-2 ring-emerald-400'
                : 'bg-red-600 text-white shadow-red-600/40 ring-2 ring-red-400'
            }`}
          >
            {currentQuestion.answer ? 'SIM' : 'NÃO'}
          </div>
          <div>
            <div className="text-xs text-slate-400">
              Resposta de <strong className="text-pink-400">{opponentName}</strong> para "{currentQuestion.text}":
            </div>
            <div className="text-sm font-black text-white mt-0.5">
              {currentQuestion.answer
                ? '✅ SIM! O personagem secreto dela TEM essa característica.'
                : '❌ NÃO! O personagem secreto dela NÃO tem essa característica.'}
            </div>
            <div className="text-[11px] text-amber-300 font-semibold mt-1">
              👉 Marque ou descarte as cartas no seu tabuleiro e clique em "Finalizar Turno".
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={onOpenGuessModal}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95"
          >
            <Trophy size={15} />
            Arriscar Chute
          </button>
          <button
            onClick={onPassTurn}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/30 transition-all active:scale-95"
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
    <div className="bg-slate-800/90 border-2 border-indigo-500/60 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          Seu Turno! Faça uma pergunta (A resposta dela será SIM ou NÃO)
        </div>
        <button
          onClick={onOpenGuessModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all"
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
              placeholder="Digite sua pergunta (ex: 'Tem barba?', 'Parece o Faustão?')..."
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                setSelectedPreset('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-3.5 pr-8 py-2.5 focus:outline-none focus:border-indigo-400"
            />
            {customText && (
              <button
                onClick={() => setCustomText('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white text-xs"
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
            className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-indigo-400"
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
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider py-2.5 px-3 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Send size={14} />
            Perguntar
          </button>
        </div>
      </div>
    </div>
  );
};

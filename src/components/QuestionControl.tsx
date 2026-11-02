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

  // 1. Não é meu turno
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
              Aguardando {opponentName} fazer uma pergunta...
            </div>
          </div>
        </div>

        {currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined && (
          <div className="text-xs bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300">
            Última pergunta: <span className="font-semibold text-amber-300">"{currentQuestion.text}"</span> ➔{' '}
            <span className={`font-black ${currentQuestion.answer ? 'text-emerald-400' : 'text-red-400'}`}>
              {currentQuestion.answer ? 'SIM' : 'NÃO'}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 2. É meu turno e fiz uma pergunta que ainda está aguardando resposta
  if (currentQuestion && (currentQuestion.answer === null || currentQuestion.answer === undefined)) {
    return (
      <div className="bg-slate-800/90 border-2 border-amber-500/60 rounded-2xl p-4 flex items-center justify-between shadow-xl animate-pulse">
        <div className="flex items-center gap-3">
          <MessageSquareQuote size={24} className="text-amber-400" />
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wide block">
              Pergunta Enviada!
            </span>
            <span className="text-sm font-semibold text-white">
              "{currentQuestion.text}"
            </span>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-medium bg-slate-900/80 px-3 py-1 rounded-lg">
          Aguardando {opponentName} responder...
        </span>
      </div>
    );
  }

  // 3. É meu turno e a pergunta acabou de ser respondida
  if (currentQuestion && currentQuestion.answer !== null && currentQuestion.answer !== undefined) {
    return (
      <div className="bg-slate-800/95 border-2 border-emerald-500/60 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xl shadow ${
              currentQuestion.answer
                ? 'bg-emerald-600 text-white shadow-emerald-600/40'
                : 'bg-red-600 text-white shadow-red-600/40'
            }`}
          >
            {currentQuestion.answer ? 'SIM' : 'NÃO'}
          </div>
          <div>
            <div className="text-xs text-slate-400">
              Resposta de <span className="text-white font-bold">{opponentName}</span> para "{currentQuestion.text}":
            </div>
            <div className="text-sm font-extrabold text-white mt-0.5">
              {currentQuestion.answer
                ? '✅ Sim! O personagem tem essa característica.'
                : '❌ Não! Elimine os personagens que têm essa característica.'}
            </div>
            <div className="text-[11px] text-amber-300 font-medium mt-1">
              👉 Agora clique nas cartas para eliminá-las e clique em "Finalizar Turno".
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={onOpenGuessModal}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <Trophy size={16} />
            Arriscar Palpite
          </button>
          <button
            onClick={onPassTurn}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            Finalizar Turno
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  // 4. É meu turno e preciso fazer uma pergunta
  return (
    <div className="bg-slate-800/90 border-2 border-indigo-500/60 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-sm uppercase tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          Seu Turno! Faça uma pergunta
        </div>
        <button
          onClick={onOpenGuessModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all"
        >
          <Trophy size={15} />
          Já sei quem é! (Palpite)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        {/* Seletor de Perguntas Prontas */}
        <div className="md:col-span-6">
          <select
            value={selectedPreset}
            onChange={(e) => {
              setSelectedPreset(e.target.value);
              setCustomText('');
            }}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400"
          >
            <option value="">-- Escolha uma pergunta rápida --</option>
            {PREDEFINED_QUESTIONS.map((q, idx) => (
              <option key={idx} value={q.text}>
                {q.label} ("{q.text}")
              </option>
            ))}
          </select>
        </div>

        {/* Ou Campo de Pergunta Livre */}
        <div className="md:col-span-4">
          <input
            type="text"
            placeholder="Ou digite sua pergunta..."
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              setSelectedPreset('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* Botão Enviar Pergunta */}
        <div className="md:col-span-2">
          <button
            onClick={handleSend}
            disabled={!selectedPreset && !customText.trim()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Send size={16} />
            Perguntar
          </button>
        </div>
      </div>
    </div>
  );
};

import type { FC } from 'react';
import type { Question, Character } from '../types/game';
import { sounds } from '../utils/sound';
import { Check, X, HelpCircle } from 'lucide-react';
import { Avatar } from './Avatar';

interface QuestionAnswerModalProps {
  question: Question;
  mySecretCharacter: Character;
  onAnswer: (answer: boolean) => void;
}

export const QuestionAnswerModal: FC<QuestionAnswerModalProps> = ({
  question,
  mySecretCharacter,
  onAnswer,
}) => {
  const handleAnswer = (ans: boolean) => {
    sounds.playAnswer(ans);
    onAnswer(ans);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/40">
          <HelpCircle size={32} />
        </div>

        <h3 className="text-xl font-black text-white mb-1">
          Pergunta de {question.senderName}!
        </h3>
        <p className="text-sm text-slate-400 mb-5">
          Responda com base no seu personagem secreto.
        </p>

        {/* Pergunta em destaque */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 mb-5 shadow-inner">
          <span className="text-lg font-bold text-amber-300">
            "{question.text}"
          </span>
        </div>

        {/* Lembrete de quem você é */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-6 flex items-center gap-3 text-left">
          <Avatar character={mySecretCharacter} size={46} />
          <div>
            <span className="text-xs text-indigo-400 font-semibold block">Seu Personagem:</span>
            <span className="text-sm font-bold text-white">{mySecretCharacter.name}</span>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {mySecretCharacter.traits.glasses ? '👓 Tem óculos' : 'Sem óculos'} •{' '}
              {mySecretCharacter.traits.hat ? '🧢 Tem chapéu' : 'Sem chapéu'} •{' '}
              {mySecretCharacter.traits.beard ? '🧔 Tem barba' : 'Sem barba'}
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleAnswer(false)}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-lg shadow-lg shadow-red-600/30 transition-all"
          >
            <X size={24} />
            NÃO
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-lg shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Check size={24} />
            SIM
          </button>
        </div>
      </div>
    </div>
  );
};

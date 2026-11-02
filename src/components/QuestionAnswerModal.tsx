import { useState, useEffect, type FC } from 'react';
import type { Question, Character } from '../types/game';
import { sounds } from '../utils/sound';
import { Check, X, HelpCircle, Clock } from 'lucide-react';
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
  const [countdown, setCountdown] = useState(30);

  const handleAnswer = (ans: boolean) => {
    sounds.playAnswer(ans);
    onAnswer(ans);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          let autoAns = false;
          if (question.traitKey && mySecretCharacter.traits) {
            autoAns = Boolean(mySecretCharacter.traits[question.traitKey]);
          }
          handleAnswer(autoAns);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [question, mySecretCharacter]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-tactile-sm">
          <HelpCircle size={30} className="text-amber-700" />
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs font-sans font-black tabular-nums tracking-tight text-amber-900 bg-amber-100/80 border border-amber-300 px-3 py-1 rounded-xl mb-3 mx-auto w-fit">
          <Clock size={13} className={countdown <= 5 ? 'text-rose-600 animate-spin' : 'text-amber-700'} />
          <span>Tempo para responder: {countdown}s</span>
        </div>

        <h3 className="text-xl font-extrabold text-slate-900 mb-1">
          Pergunta de {question.senderName}!
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Responda com base no seu personagem secreto:
        </p>

        {/* Pergunta em destaque */}
        <div className="bg-amber-50/80 border-2 border-amber-200 rounded-2xl p-4 mb-5 shadow-sm">
          <span className="text-lg font-bold text-amber-950">
            "{question.text}"
          </span>
        </div>

        {/* Lembrete de quem você é */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-6 flex items-center gap-3 text-left">
          <Avatar character={mySecretCharacter} size={48} />
          <div>
            <span className="text-[10px] uppercase font-bold text-sky-700 block">Seu Personagem:</span>
            <span className="text-sm font-extrabold text-slate-900">{mySecretCharacter.name}</span>
            {mySecretCharacter.traits && (
              <div className="text-[11px] text-slate-500 mt-0.5">
                {mySecretCharacter.traits.glasses ? '👓 Tem óculos' : 'Sem óculos'} •{' '}
                {mySecretCharacter.traits.hat ? '🧢 Tem chapéu' : 'Sem chapéu'} •{' '}
                {mySecretCharacter.traits.beard ? '🧔 Tem barba' : 'Sem barba'}
              </div>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleAnswer(false)}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-lg shadow-[0_4px_0_#e11d48] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            <X size={22} />
            NÃO
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-lg shadow-[0_4px_0_#059669] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            <Check size={22} />
            SIM
          </button>
        </div>
      </div>
    </div>
  );
};

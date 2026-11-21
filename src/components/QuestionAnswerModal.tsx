import { useState, useEffect, type FC } from 'react';
import type { Question, Character } from '../types/game';
import { sounds } from '../utils/sound';
import { Clock } from 'lucide-react';
import { Avatar } from './Avatar';
import { Button } from './ui/Button';

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
    <div className="fixed inset-0 z-50 bg-[#2B2420]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] max-w-md w-full p-6 text-center shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-center gap-1.5 text-xs font-sans tabular-nums text-[#6F655C] mb-3">
          <Clock size={12} className={countdown <= 5 ? 'text-[#8C2E2A] animate-spin' : 'text-[#6F655C]'} />
          <span>Responder em {countdown}s</span>
        </div>

        <h3 className="font-serif text-2xl font-normal text-[#2B2420] mb-1">
          Pergunta de {question.senderName}
        </h3>
        <p className="text-xs text-[#6F655C] font-sans mb-4">
          Responda com base no seu personagem secreto:
        </p>

        {/* Pergunta em destaque */}
        <div className="bg-[#F6F2EA] border border-[#E2DACD] rounded-[8px] p-4 mb-5">
          <span className="font-serif text-xl text-[#2B2420] block">
            "{question.text}"
          </span>
        </div>

        {/* Lembrete de quem você é */}
        <div className="bg-[#F6F2EA] border border-[#E2DACD] rounded-[6px] p-3 mb-6 flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-white border border-[#E2DACD] shrink-0">
            <Avatar character={mySecretCharacter} size={48} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#6F655C] block">Seu personagem secreto:</span>
            <span className="text-sm font-sans font-medium text-[#2B2420] truncate block">{mySecretCharacter.name}</span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => handleAnswer(false)}
          >
            Não
          </Button>
          <Button
            size="lg"
            variant="primary"
            onClick={() => handleAnswer(true)}
          >
            Sim
          </Button>
        </div>
      </div>
    </div>
  );
};

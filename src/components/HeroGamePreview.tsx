import React, { useState, useEffect } from 'react';
import { HelpCircle, Check, RotateCcw } from 'lucide-react';
import { sounds } from '../utils/sound';

interface PreviewCharacter {
  id: string;
  name: string;
  imageUrl: string;
  hasBeard: boolean;
  hasHat: boolean;
}

const PREVIEW_CHARACTERS: PreviewCharacter[] = [
  { id: 'hugo', name: 'Hugo', imageUrl: '/standard-faces/Hugo.jpg', hasBeard: true, hasHat: true },
  { id: 'ana', name: 'Ana', imageUrl: '/standard-faces/Ana.jpg', hasBeard: false, hasHat: false },
  { id: 'bruno', name: 'Bruno', imageUrl: '/standard-faces/Bruno.jpg', hasBeard: true, hasHat: false },
  { id: 'carla', name: 'Carla', imageUrl: '/standard-faces/Carla.jpg', hasBeard: false, hasHat: false },
  { id: 'davi', name: 'Davi', imageUrl: '/standard-faces/Davi.jpg', hasBeard: false, hasHat: true },
  { id: 'felipe', name: 'Felipe', imageUrl: '/standard-faces/Felipe.jpg', hasBeard: true, hasHat: false },
];

interface SimulationStep {
  question: string;
  answer: string;
  isYes: boolean;
  discardedIds: string[];
}

const SIMULATION_STEPS: SimulationStep[] = [
  {
    question: 'Tem barba ou bigode?',
    answer: 'NÃO',
    isYes: false,
    discardedIds: ['hugo', 'bruno', 'felipe'],
  },
  {
    question: 'Usa chapéu ou boné?',
    answer: 'SIM',
    isYes: true,
    discardedIds: ['hugo', 'bruno', 'felipe', 'ana', 'carla'],
  },
  {
    question: 'O seu personagem é o Davi?',
    answer: 'SIM, ACERTOU!',
    isYes: true,
    discardedIds: ['hugo', 'bruno', 'felipe', 'ana', 'carla'],
  },
];

export const HeroGamePreview: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [discarded, setDiscarded] = useState<Record<string, boolean>>({
    hugo: true,
    bruno: true,
    felipe: true,
  });
  const [isManual, setIsManual] = useState(false);

  // Ciclo automático da simulação (apenas se o usuário não estiver interagindo manualmente)
  useEffect(() => {
    if (isManual) return;

    const timer = setInterval(() => {
      setStepIndex((prev) => {
        const next = (prev + 1) % (SIMULATION_STEPS.length + 1);
        if (next === SIMULATION_STEPS.length) {
          // Reset completo
          setDiscarded({});
          return next;
        }
        const currentStep = SIMULATION_STEPS[next];
        const newDiscarded: Record<string, boolean> = {};
        currentStep.discardedIds.forEach((id) => {
          newDiscarded[id] = true;
        });
        setDiscarded(newDiscarded);
        sounds.playFlip();
        return next;
      });
    }, 3800);

    return () => clearInterval(timer);
  }, [isManual]);

  const currentStep =
    stepIndex < SIMULATION_STEPS.length
      ? SIMULATION_STEPS[stepIndex]
      : {
          question: 'Iniciando nova rodada...',
          answer: 'VEZ DELE',
          isYes: true,
          discardedIds: [],
        };

  const handleCardClick = (id: string) => {
    setIsManual(true);
    sounds.playFlip();
    setDiscarded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleResetManual = () => {
    sounds.playClick();
    setIsManual(false);
    setStepIndex(0);
    setDiscarded({ hugo: true, bruno: true, felipe: true });
  };

  return (
    <div className="w-full max-w-[390px] bg-white border border-[#E2DACD] rounded-2xl p-4 sm:p-5 shadow-xs transition-all select-none">
      {/* Cabeçalho da Simulação: Pergunta e Resposta */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#E2DACD]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-[#F6F2EA] flex items-center justify-center text-[#B4532F] shrink-0">
            <HelpCircle size={12} />
          </div>
          <span className="text-xs font-serif font-bold text-[#2B2420] truncate">
            "{currentStep.question}"
          </span>
        </div>

        <span
          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 transition-colors ${
            currentStep.isYes
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-[#FDF5F2] text-[#B4532F] border-[#F3D7CD]'
          }`}
        >
          {currentStep.answer}
        </span>
      </div>

      {/* Grid 3x2 com as Cartas Físicas da Simulação */}
      <div className="grid grid-cols-3 gap-2.5">
        {PREVIEW_CHARACTERS.map((char) => {
          const isOff = discarded[char.id];
          const isWinner = char.id === 'davi' && stepIndex === 2;

          return (
            <button
              type="button"
              key={char.id}
              onClick={() => handleCardClick(char.id)}
              className={`group flex flex-col items-center p-1.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                isWinner
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200 scale-105 shadow-sm'
                  : isOff
                  ? 'bg-[#F6F2EA]/60 border-[#E2DACD]/60 opacity-40 scale-[0.96] grayscale'
                  : 'bg-[#FBF8F3] border-[#E2DACD] hover:border-[#B4532F]/50 shadow-2xs hover:scale-[1.02]'
              }`}
            >
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-white mb-1.5 relative">
                <img
                  src={char.imageUrl}
                  alt={char.name}
                  className="w-full h-full object-cover"
                />
                {isOff && (
                  <div className="absolute inset-0 bg-[#2B2420]/15 flex items-center justify-center">
                    <span className="text-white text-xs font-bold drop-shadow-xs">✕</span>
                  </div>
                )}
                {isWinner && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </div>
              <span
                className={`text-[11px] font-sans font-bold truncate max-w-full ${
                  isOff ? 'text-[#8C827A]' : 'text-[#2B2420]'
                }`}
              >
                {char.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rodapé com Dica de Interatividade */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E2DACD]/70 text-[11px] text-[#6F655C]">
        <span>Clique em qualquer cara para testar</span>
        {isManual && (
          <button
            type="button"
            onClick={handleResetManual}
            className="flex items-center gap-1 text-[#B4532F] font-bold hover:underline cursor-pointer"
          >
            <RotateCcw size={11} />
            <span>Voltar simulação</span>
          </button>
        )}
      </div>
    </div>
  );
};

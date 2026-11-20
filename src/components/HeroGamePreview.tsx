import React, { useState, useEffect } from 'react';
import { HelpCircle, Check } from 'lucide-react';
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
  winnerId?: string;
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
    winnerId: 'davi',
  },
];

export const HeroGamePreview: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);

  // Ciclo 100% automático e contínuo da demonstração
  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => {
        const next = (prev + 1) % (SIMULATION_STEPS.length + 1);
        if (next < SIMULATION_STEPS.length) {
          sounds.playFlip();
        }
        return next;
      });
    }, 3400);

    return () => clearInterval(timer);
  }, []);

  const isResetting = stepIndex === SIMULATION_STEPS.length;
  const currentStep = isResetting
    ? {
        question: 'Preparando nova rodada...',
        answer: 'NOVO JOGO',
        isYes: true,
        discardedIds: [],
        winnerId: undefined,
      }
    : SIMULATION_STEPS[stepIndex];

  const discardedSet = new Set(currentStep.discardedIds);

  return (
    <div
      aria-label="Demonstração do jogo"
      className="w-full max-w-[390px] bg-white border border-[#E2DACD] rounded-2xl p-4 sm:p-5 shadow-xs transition-all pointer-events-none select-none"
    >
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

      {/* Grid 3x2 com as Cartas Demonstrativas */}
      <div className="grid grid-cols-3 gap-2.5">
        {PREVIEW_CHARACTERS.map((char) => {
          const isOff = discardedSet.has(char.id);
          const isWinner = currentStep.winnerId === char.id;

          return (
            <div
              key={char.id}
              className={`flex flex-col items-center p-1.5 rounded-xl border transition-all duration-300 ${
                isWinner
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300 scale-105 shadow-sm'
                  : isOff
                  ? 'bg-[#F6F2EA]/60 border-[#E2DACD]/60 opacity-35 scale-[0.96] grayscale'
                  : 'bg-[#FBF8F3] border-[#E2DACD] shadow-2xs'
              }`}
            >
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-white mb-1.5 relative border border-[#E2DACD]/60">
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
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

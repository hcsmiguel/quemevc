import { useState, useEffect, type FC } from 'react';
import type { Character } from '../types/game';
import { Avatar } from './Avatar';
import { sounds } from '../utils/sound';
import { Button } from './ui/Button';

interface SecretSelectionModalProps {
  cards: Character[];
  opponentName: string;
  opponentReady: boolean;
  onConfirmSelection: (character: Character) => void;
}

export const SecretSelectionModal: FC<SecretSelectionModalProps> = ({
  cards,
  opponentName,
  opponentReady,
  onConfirmSelection,
}) => {
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleSelect = (char: Character) => {
    if (isReady) return;
    sounds.playClick();
    setSelectedChar(char);
  };

  const handleRandom = () => {
    if (isReady || cards.length === 0) return;
    sounds.playClick();
    const randomChar = cards[Math.floor(Math.random() * cards.length)];
    setSelectedChar(randomChar);
  };

  const handleConfirm = () => {
    if (!selectedChar || isReady) return;
    sounds.playAnswer(true);
    setIsReady(true);
    onConfirmSelection(selectedChar);
  };

  // Teclado: Navegação e atalhos acessíveis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        handleRandom();
      } else if (e.key === 'Enter' && selectedChar && !isReady) {
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChar, isReady]);

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2420]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="secret-modal-title"
        className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[12px] max-w-4xl w-full max-h-[90vh] flex flex-col p-5 sm:p-7 shadow-[0_16px_36px_-8px_rgba(43,36,32,0.12)] animate-in zoom-in-95 duration-150 my-auto text-left"
      >
        {/* Cabeçalho */}
        <div className="pb-4 mb-4 border-b border-[#E2DACD]">
          <h2 id="secret-modal-title" className="font-serif text-2xl sm:text-3xl font-medium text-[#2B2420] tracking-tight mb-1">
            Escolha seu personagem secreto
          </h2>
          <p className="text-xs sm:text-sm font-sans text-[#6F655C]">
            Seu oponente, <strong className="font-medium text-[#2B2420]">{opponentName}</strong>, vai tentar descobrir quem você é.{' '}
            <span>{opponentReady ? 'Ele já escolheu.' : 'Aguardando a escolha dele...'}</span>
          </p>
        </div>

        {/* Grade de Personagens */}
        <div className="flex-1 p-2 sm:p-3 mb-4 rounded-[8px] bg-[#F6F2EA] border border-[#E2DACD] overflow-y-auto overflow-x-hidden">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {cards.map((char) => {
              const isSelected = selectedChar?.id === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleSelect(char)}
                  aria-pressed={isSelected}
                  className={`relative p-2 rounded-[8px] bg-white border cursor-pointer transition-all flex flex-col items-center text-center select-none ${
                    isSelected
                      ? 'border-[#2B2420] ring-2 ring-[#2B2420] shadow-xs'
                      : 'border-[#E2DACD] hover:border-[#2B2420]/40'
                  } ${isReady ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <div className="w-full aspect-square rounded-[6px] cara-frame-thumb overflow-hidden mb-1.5 bg-[#FAF6F0] flex items-center justify-center">
                    <Avatar character={char} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-sans font-medium text-[#2B2420] truncate w-full px-0.5">
                    {char.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Barra de Ação Inferior: Link de sortear à esquerda, confirmar à direita */}
        <div className="pt-3 border-t border-[#E2DACD] flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="text"
            onClick={handleRandom}
            disabled={isReady}
          >
            Sortear aleatório
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={!selectedChar || isReady}
          >
            {isReady ? 'Aguardando adversário...' : 'Confirmar escolha'}
          </Button>
        </div>
      </div>
    </div>
  );
};

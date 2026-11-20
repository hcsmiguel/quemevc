import { useState, useMemo, type FC } from 'react';
import type { Character, CardStatus } from '../types/game';
import { Avatar } from './Avatar';
import { X } from 'lucide-react';
import { sounds } from '../utils/sound';
import { Button } from './ui/Button';

interface GuessModalProps {
  cards: Character[];
  cardStatuses?: Record<string, CardStatus>;
  opponentName: string;
  onConfirmGuess: (character: Character) => void;
  onClose: () => void;
}

export const GuessModal: FC<GuessModalProps> = ({
  cards,
  cardStatuses,
  opponentName,
  onConfirmGuess,
  onClose,
}) => {
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);

  // Exibir SOMENTE as cartas ativas no tabuleiro do jogador (requisito explícito do usuário)
  const activeCards = useMemo(() => {
    if (!cardStatuses) return cards;
    const filtered = cards.filter((char) => cardStatuses[char.id] !== 'discard');
    return filtered.length > 0 ? filtered : cards;
  }, [cards, cardStatuses]);

  const handleSelect = (char: Character) => {
    sounds.playClick();
    setSelectedChar(char);
  };

  const handleConfirm = () => {
    if (!selectedChar) return;
    onConfirmGuess(selectedChar);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2420]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[12px] max-w-2xl w-full max-h-[90vh] flex flex-col p-5 sm:p-7 shadow-xl animate-in zoom-in-95 duration-150 my-auto text-left">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E2DACD] pb-3 mb-4">
          <div>
            <h2 className="font-serif text-2xl font-normal text-[#2B2420]">
              Dar palpite final
            </h2>
            <p className="text-xs sm:text-sm text-[#6F655C] font-sans mt-0.5">
              Quem você acha que é o personagem de <strong className="font-semibold text-[#2B2420]">{opponentName}</strong>?
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer rounded-[4px]"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Confirmação do Personagem Escolhido */}
        {selectedChar ? (
          <div className="py-6 flex flex-col items-center text-center my-auto">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[8px] overflow-hidden border border-[#2B2420] shadow-sm mb-3 bg-white">
              <Avatar character={selectedChar} size={112} className="w-full h-full object-cover" />
            </div>

            <h3 className="font-serif text-2xl text-[#2B2420] font-normal mb-2">
              {selectedChar.name}
            </h3>

            <div className="p-3 rounded-[6px] border border-[#E2DACD] bg-[#F6F2EA] max-w-md text-xs text-[#6F655C] leading-relaxed mb-6">
              Se acertar, você vence a partida imediatamente. Se errar, sua tentativa será revelada e você passará a vez.
            </div>

            <div className="flex items-center gap-3 w-full max-w-xs">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => setSelectedChar(null)}
              >
                Voltar
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                onClick={handleConfirm}
              >
                Confirmar palpite
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Status de cartas ativas */}
            <div className="text-xs text-[#6F655C] font-sans mb-3">
              Mostrando {activeCards.length} {activeCards.length === 1 ? 'carta ativa' : 'cartas ativas'} restantes no seu tabuleiro:
            </div>

            {/* Grid de Cartas Ativas */}
            <div className="flex-1 overflow-y-auto pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {activeCards.map((char) => (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleSelect(char)}
                    className="p-2 rounded-[8px] border border-[#E2DACD] bg-[#F6F2EA] hover:bg-white hover:border-[#2B2420] transition-colors flex flex-col items-center text-center cursor-pointer group select-none"
                  >
                    <div className="w-full aspect-square rounded-[6px] overflow-hidden border border-[#E2DACD]/80 bg-white mb-1.5">
                      <Avatar
                        character={char}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span className="text-xs font-sans font-medium text-[#2B2420] line-clamp-2 leading-tight">
                      {char.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

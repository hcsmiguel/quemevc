import { useEffect, type FC } from 'react';
import confetti from 'canvas-confetti';
import type { Character } from '../types/game';
import { Avatar } from './Avatar';
import { RotateCcw } from 'lucide-react';
import { sounds } from '../utils/sound';
import { Button } from './ui/Button';

interface GameOverModalProps {
  isWinner: boolean;
  winnerName: string;
  mySecretCharacter: Character;
  opponentSecretCharacter: Character;
  opponentName: string;
  rematchRequestedByMe?: boolean;
  rematchRequestedByOpponent?: boolean;
  onRematch: () => void;
  onExit?: () => void;
}

export const GameOverModal: FC<GameOverModalProps> = ({
  isWinner,
  winnerName,
  mySecretCharacter,
  opponentSecretCharacter,
  opponentName,
  rematchRequestedByMe = false,
  rematchRequestedByOpponent = false,
  onRematch,
  onExit,
}) => {
  useEffect(() => {
    if (isWinner) {
      sounds.playWin();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else {
      sounds.playWrong();
    }
  }, [isWinner]);

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2420]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] max-w-md w-full p-6 text-center shadow-xl animate-in zoom-in-95 duration-150">
        <h2 className="font-serif text-3xl font-normal text-[#2B2420] mb-1">
          {isWinner ? 'Vitória!' : `${winnerName} venceu`}
        </h2>
        <p className="text-xs sm:text-sm text-[#6F655C] font-sans mb-6">
          {isWinner
            ? `Você descobriu o personagem secreto de ${opponentName}.`
            : `${opponentName} descobriu o seu personagem primeiro.`}
        </p>

        {/* Revelação das cartas secretas */}
        <div className="border border-[#E2DACD] rounded-[8px] bg-[#F6F2EA] p-4 mb-6">
          <span className="text-[11px] font-medium text-[#6F655C] uppercase tracking-wider block mb-3">
            Cartas Secretas
          </span>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-xs font-medium text-[#6F655C] mb-1.5">Você era</span>
              <div className="w-16 h-16 rounded-[6px] overflow-hidden bg-white border border-[#E2DACD] mb-1.5 shadow-2xs">
                <Avatar character={mySecretCharacter} size={64} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-sans font-medium text-[#2B2420]">{mySecretCharacter.name}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-xs font-medium text-[#6F655C] mb-1.5">{opponentName} era</span>
              <div className="w-16 h-16 rounded-[6px] overflow-hidden bg-white border border-[#E2DACD] mb-1.5 shadow-2xs">
                <Avatar character={opponentSecretCharacter} size={64} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-sans font-medium text-[#2B2420]">{opponentSecretCharacter.name}</span>
            </div>
          </div>
        </div>

        {/* Ações de revanche */}
        <div className="space-y-3">
          {rematchRequestedByOpponent && !rematchRequestedByMe && (
            <p className="text-xs text-[#2E7D32] font-medium mb-2">
              {opponentName} pediu uma revanche!
            </p>
          )}

          <Button
            size="lg"
            variant="primary"
            className="w-full"
            disabled={rematchRequestedByMe}
            onClick={onRematch}
          >
            {rematchRequestedByMe ? (
              <span className="flex items-center justify-center gap-1.5">
                <RotateCcw size={14} className="animate-spin" />
                <span>Aguardando {opponentName}...</span>
              </span>
            ) : rematchRequestedByOpponent ? (
              'Aceitar revanche'
            ) : (
              'Pedir revanche'
            )}
          </Button>

          {onExit && (
            <div className="text-center pt-1">
              <Button
                variant="text"
                onClick={onExit}
              >
                Voltar ao menu
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

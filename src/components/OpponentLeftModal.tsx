import { useState, useEffect, type FC } from 'react';
import { sounds } from '../utils/sound';
import { Button } from './ui/Button';

interface OpponentLeftModalProps {
  isOpen: boolean;
  opponentName: string;
  onConfirm: () => void;
}

export const OpponentLeftModal: FC<OpponentLeftModalProps> = ({
  isOpen,
  opponentName,
  onConfirm,
}) => {
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(6);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2420]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] max-w-sm w-full p-6 shadow-xl text-center animate-in zoom-in-95 duration-150">
        <h3 className="font-serif text-2xl font-normal text-[#2B2420] mb-2">
          Partida encerrada
        </h3>

        <p className="text-xs sm:text-sm text-[#6F655C] font-sans mb-3 leading-relaxed">
          <strong className="text-[#2B2420] font-semibold">{opponentName || 'Seu oponente'}</strong> desconectou-se da partida.
        </p>

        <p className="text-xs text-[#A39A90] font-sans mb-6">
          Retornando ao menu em <span className="font-sans font-medium text-[#2B2420]">{countdown}s</span>...
        </p>

        <Button
          size="md"
          variant="primary"
          className="w-full"
          onClick={() => {
            sounds.playClick();
            onConfirm();
          }}
        >
          Voltar ao menu
        </Button>
      </div>
    </div>
  );
};

import { useEffect, type FC } from 'react';
import confetti from 'canvas-confetti';
import type { Character } from '../types/game';
import { Avatar } from './Avatar';
import { Trophy, RotateCcw, Heart, LogOut } from 'lucide-react';
import { sounds } from '../utils/sound';

interface GameOverModalProps {
  isWinner: boolean;
  winnerName: string;
  mySecretCharacter: Character;
  opponentSecretCharacter: Character;
  opponentName: string;
  onRematch: () => void;
  onExit?: () => void;
}

export const GameOverModal: FC<GameOverModalProps> = ({
  isWinner,
  winnerName,
  mySecretCharacter,
  opponentSecretCharacter,
  opponentName,
  onRematch,
  onExit,
}) => {
  useEffect(() => {
    if (isWinner) {
      sounds.playWin();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
      const timer = setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 400);
      return () => clearTimeout(timer);
    } else {
      sounds.playWrong();
    }
  }, [isWinner]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-lg w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="mb-4">
          {isWinner ? (
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border-2 border-amber-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <Trophy size={36} />
            </div>
          ) : (
            <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 border-2 border-indigo-500/40 rounded-full flex items-center justify-center mx-auto">
              <Heart size={36} />
            </div>
          )}
        </div>

        <h2 className="text-3xl font-black text-white mb-1">
          {isWinner ? '🎉 Você Venceu!' : `👏 ${winnerName} Venceu!`}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {isWinner
            ? `Você descobriu o personagem secreto de ${opponentName}!`
            : `${opponentName} descobriu o seu personagem primeiro!`}
        </p>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-6">
          <div className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-4">
            Revelação das Cartas Secretas
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-indigo-400 font-bold mb-2">Seu Personagem:</span>
              <Avatar character={mySecretCharacter} size={70} className="mb-2" />
              <span className="text-sm font-black text-white">{mySecretCharacter.name}</span>
            </div>

            <div className="flex flex-col items-center bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-pink-400 font-bold mb-2">Personagem de {opponentName}:</span>
              <Avatar character={opponentSecretCharacter} size={70} className="mb-2" />
              <span className="text-sm font-black text-white">{opponentSecretCharacter.name}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onRematch}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 transition-all active:scale-95"
          >
            <RotateCcw size={20} />
            Jogar Outra Partida!
          </button>

          {onExit && (
            <button
              onClick={onExit}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs transition-colors"
            >
              <LogOut size={16} />
              Encerrar Partida e Voltar ao Menu
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

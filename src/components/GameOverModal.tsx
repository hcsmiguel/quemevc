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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-lg w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="mb-4">
          {isWinner ? (
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-tactile-sm">
              <Trophy size={34} />
            </div>
          ) : (
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-tactile-sm">
              <Heart size={34} className="fill-rose-500 text-rose-500" />
            </div>
          )}
        </div>

        <h2 className="text-3xl font-black text-slate-900 mb-1">
          {isWinner ? '🎉 Você Venceu!' : `👏 ${winnerName} Venceu!`}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {isWinner
            ? `Você descobriu o personagem secreto de ${opponentName}!`
            : `${opponentName} descobriu o seu personagem primeiro!`}
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
          <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-4">
            Revelação das Cartas Secretas
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-sky-800 font-bold mb-2">Seu Personagem:</span>
              <Avatar character={mySecretCharacter} size={70} className="mb-2" />
              <span className="text-sm font-black text-slate-900">{mySecretCharacter.name}</span>
            </div>

            <div className="flex flex-col items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-rose-700 font-bold mb-2">Personagem de {opponentName}:</span>
              <Avatar character={opponentSecretCharacter} size={70} className="mb-2" />
              <span className="text-sm font-black text-slate-900">{opponentSecretCharacter.name}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {rematchRequestedByOpponent && !rematchRequestedByMe && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-2.5 text-xs text-emerald-800 font-bold animate-bounce flex items-center justify-center gap-2">
              <span>⚔️ {opponentName} pediu uma revanche!</span>
            </div>
          )}

          <button
            onClick={onRematch}
            disabled={rematchRequestedByMe}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
              rematchRequestedByMe
                ? 'bg-amber-100 text-amber-800 border-2 border-amber-300 cursor-not-allowed opacity-90'
                : rematchRequestedByOpponent
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_0_#059669] active:translate-y-1'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_0_#4338ca] active:translate-y-1'
            }`}
          >
            {rematchRequestedByMe ? (
              <>
                <RotateCcw size={18} className="animate-spin text-amber-600" />
                <span>Aguardando {opponentName} aceitar revanche...</span>
              </>
            ) : rematchRequestedByOpponent ? (
              <>
                <RotateCcw size={18} />
                <span>Aceitar Revanche!</span>
              </>
            ) : (
              <>
                <RotateCcw size={18} />
                <span>Revanche</span>
              </>
            )}
          </button>

          {onExit && (
            <button
              onClick={onExit}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
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

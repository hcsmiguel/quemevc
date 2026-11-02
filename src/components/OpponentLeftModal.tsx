import { useState, useEffect, type FC } from 'react';
import { UserMinus, ArrowLeft } from 'lucide-react';
import { sounds } from '../utils/sound';

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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <UserMinus size={28} />
        </div>

        <h3 className="text-lg font-black text-slate-900 mb-1">
          Partida Encerrada
        </h3>

        <p className="text-xs text-slate-600 mb-2 leading-relaxed">
          <strong className="text-slate-900">{opponentName || 'Seu oponente'}</strong> abandonou a sala ou desconectou.
        </p>

        <p className="text-[11px] text-slate-400 mb-6 font-medium">
          Retornando ao menu principal em <span className="font-sans font-black tabular-nums text-slate-700">{countdown}s</span>...
        </p>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onConfirm();
          }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#059669] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Menu Principal</span>
        </button>
      </div>
    </div>
  );
};

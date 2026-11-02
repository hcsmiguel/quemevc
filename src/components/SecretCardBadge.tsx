import { useState, type FC } from 'react';
import type { Character } from '../types/game';
import { Avatar } from './Avatar';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { sounds } from '../utils/sound';

interface SecretCardBadgeProps {
  character: Character;
}

export const SecretCardBadge: FC<SecretCardBadgeProps> = ({ character }) => {
  const [showSecret, setShowSecret] = useState(true);

  const togglePeek = () => {
    sounds.playClick();
    setShowSecret(prev => !prev);
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-2 sm:p-2.5 shadow-sm flex items-center gap-2.5 sm:gap-3">
      <div className="relative shrink-0">
        {showSecret ? (
          <Avatar character={character} size={44} className="ring-2 ring-sky-300 rounded-xl" />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <Shield size={16} className="text-sky-600 mb-0.5" />
            <span className="text-[8px] font-extrabold">SECRETO</span>
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-sky-800 font-extrabold uppercase tracking-wider">
          <Shield size={12} className="text-sky-600 shrink-0" />
          <span>Você é:</span>
        </div>
        <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
          {showSecret ? character.name : '••••••••'}
        </div>
        <span className="text-[9px] sm:text-[10px] text-slate-400">
          (Apenas você visualiza)
        </span>
      </div>

      <button
        onClick={togglePeek}
        title={showSecret ? 'Ocultar se o oponente estiver perto' : 'Mostrar meu personagem'}
        className="ml-auto p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
      >
        {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
};

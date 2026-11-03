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
    <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-1 sm:px-2.5 sm:py-1 flex items-center gap-1.5 sm:gap-2.5 max-w-fit">
      <div className="relative shrink-0">
        {showSecret ? (
          <Avatar character={character} className="w-7 h-7 sm:w-9 sm:h-9 ring-2 ring-sky-300 rounded-lg sm:rounded-xl" />
        ) : (
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500">
            <Shield size={14} className="text-sky-600" />
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0 pr-0.5">
        <span className="text-[9px] sm:text-[10px] text-sky-800 font-extrabold uppercase tracking-wider flex items-center gap-1 leading-none">
          <Shield size={9} className="text-sky-600 shrink-0" />
          <span>Você é:</span>
        </span>
        <span className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[85px] sm:max-w-[130px] leading-tight mt-0.5">
          {showSecret ? character.name : '••••••••'}
        </span>
      </div>

      <button
        onClick={togglePeek}
        type="button"
        title={showSecret ? 'Ocultar meu personagem' : 'Mostrar meu personagem'}
        className="p-1 sm:p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors shrink-0 cursor-pointer"
      >
        {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
};

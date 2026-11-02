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
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-2.5 shadow-sm flex items-center gap-3">
      <div className="relative">
        {showSecret ? (
          <Avatar character={character} size={54} className="ring-2 ring-sky-300" />
        ) : (
          <div className="w-[54px] h-[54px] rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <Shield size={20} className="text-sky-600 mb-0.5" />
            <span className="text-[9px] font-extrabold">SECRETO</span>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-sky-800 font-extrabold uppercase tracking-wider">
          <Shield size={13} className="text-sky-600" />
          <span>Você é:</span>
        </div>
        <div className="text-sm font-extrabold text-slate-900">
          {showSecret ? character.name : '••••••••'}
        </div>
        <span className="text-[10px] text-slate-400">
          (Apenas você visualiza)
        </span>
      </div>

      <button
        onClick={togglePeek}
        title={showSecret ? 'Ocultar se o oponente estiver perto' : 'Mostrar meu personagem'}
        className="ml-auto p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors"
      >
        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

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
    <div className="bg-slate-800/90 border-2 border-indigo-500/50 rounded-2xl p-2.5 shadow-lg flex items-center gap-3 backdrop-blur-md">
      <div className="relative">
        {showSecret ? (
          <Avatar character={character} size={54} className="ring-2 ring-indigo-400" />
        ) : (
          <div className="w-[54px] h-[54px] rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-slate-500">
            <Shield size={22} className="text-indigo-400 mb-0.5" />
            <span className="text-[9px] font-bold">SECRETO</span>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold uppercase tracking-wider">
          <Shield size={13} />
          <span>Você é:</span>
        </div>
        <div className="text-sm font-extrabold text-white">
          {showSecret ? character.name : '••••••••'}
        </div>
        <span className="text-[10px] text-slate-400">
          (Só você vê isto)
        </span>
      </div>

      <button
        onClick={togglePeek}
        title={showSecret ? 'Ocultar se o oponente estiver perto' : 'Mostrar meu personagem'}
        className="ml-auto p-2 bg-slate-700/80 hover:bg-slate-600 rounded-xl text-slate-300 hover:text-white transition-colors"
      >
        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

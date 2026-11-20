import { useState, type FC } from 'react';
import type { Character } from '../types/game';
import { Avatar } from './Avatar';
import { Eye, EyeOff } from 'lucide-react';
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
    <div className="bg-[#F6F2EA] border border-[#E2DACD] rounded-[6px] p-1 sm:px-2.5 sm:py-1 flex items-center gap-1.5 sm:gap-2.5 max-w-fit">
      <div className="relative shrink-0">
        {showSecret ? (
          <Avatar character={character} className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] border border-[#E2DACD] object-cover" />
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] bg-[#E2DACD]/50 border border-[#E2DACD] flex items-center justify-center text-[#6F655C] text-xs font-serif font-bold">
            ?
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0 pr-0.5 text-left">
        <span className="text-[10px] text-[#6F655C] font-medium leading-none">
          Você é:
        </span>
        <span className="text-xs sm:text-sm font-sans font-medium text-[#2B2420] truncate max-w-[90px] sm:max-w-[140px] leading-tight mt-0.5">
          {showSecret ? character.name : '••••••••'}
        </span>
      </div>

      <button
        onClick={togglePeek}
        type="button"
        title={showSecret ? 'Ocultar meu personagem' : 'Mostrar meu personagem'}
        className="p-1 text-[#6F655C] hover:text-[#2B2420] transition-colors shrink-0 cursor-pointer"
      >
        {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
};

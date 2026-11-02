import type { FC } from 'react';
import type { Character } from '../types/game';
import { Avatar } from './Avatar';
import { EyeOff } from 'lucide-react';
import { sounds } from '../utils/sound';

interface CardProps {
  character: Character;
  isFlipped: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export const Card: FC<CardProps> = ({
  character,
  isFlipped,
  onToggle,
  disabled = false,
}) => {
  const handleClick = () => {
    if (disabled) return;
    sounds.playFlip(!isFlipped);
    onToggle(character.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative group cursor-pointer transition-all duration-300 transform-style-3d perspective-1000 select-none ${
        disabled ? 'cursor-not-allowed opacity-80' : ''
      }`}
      style={{ minHeight: '140px' }}
    >
      <div
        className={`w-full h-full rounded-2xl p-2.5 flex flex-col items-center justify-between border-2 transition-all duration-300 shadow-md ${
          isFlipped
            ? 'bg-slate-900/90 border-slate-700/60 scale-[0.93] brightness-50 opacity-40 translate-y-2'
            : 'bg-slate-800 border-slate-600/80 hover:border-amber-400/80 hover:scale-[1.03] hover:shadow-xl shadow-slate-950/50'
        }`}
      >
        {/* Status Badge */}
        <div className="w-full flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-semibold tracking-wide text-slate-300 group-hover:text-amber-300 transition-colors">
            {character.name}
          </span>
          {isFlipped ? (
            <span className="bg-red-950/80 text-red-400 p-0.5 rounded-full border border-red-800/60">
              <EyeOff size={13} />
            </span>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          )}
        </div>

        {/* Avatar Central */}
        <div className="relative my-0.5">
          <Avatar
            character={character}
            size={76}
            className={`transition-all duration-300 ${isFlipped ? 'grayscale' : ''}`}
          />
          {isFlipped && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
              <span className="bg-red-500/90 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                Eliminado
              </span>
            </div>
          )}
        </div>

        {/* Rodapé da Cartela */}
        <div className="w-full flex items-center justify-center gap-1 mt-1 text-[11px] text-slate-400 font-medium">
          {character.traits.glasses && <span title="Usa óculos">👓</span>}
          {character.traits.hat && <span title="Usa chapéu/boné">🧢</span>}
          {character.traits.beard && <span title="Tem barba">🧔</span>}
          {character.traits.earrings && <span title="Usa brincos">💍</span>}
          {character.traits.gender === 'feminino' ? <span title="Feminino">👩</span> : <span title="Masculino">👨</span>}
        </div>
      </div>
    </div>
  );
};

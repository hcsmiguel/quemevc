import { memo, type FC } from 'react';
import type { Character, CardStatus } from '../types/game';
import { Avatar } from './Avatar';
import { EyeOff } from 'lucide-react';

interface CardProps {
  character: Character;
  status: CardStatus;
  onCardClick: (character: Character) => void;
  disabled?: boolean;
}

const CardComponent: FC<CardProps> = ({
  character,
  status,
  onCardClick,
  disabled = false,
}) => {
  const isDiscarded = status === 'discard';
  const isSuspect = status === 'suspect';

  const handleClick = () => {
    if (disabled) return;
    onCardClick(character);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      className={`relative select-none transition-transform duration-150 rounded-2xl border-2 p-1.5 sm:p-2 flex flex-col items-center justify-between cursor-pointer active:scale-95 ${
        isDiscarded
          ? 'bg-slate-100/80 border-slate-200 opacity-40 scale-[0.93]'
          : isSuspect
          ? 'bg-amber-50 border-amber-400 shadow-[0_2px_0_#f59e0b]'
          : 'bg-white border-slate-200 hover:border-sky-400 shadow-[0_2px_0_#cbd5e1]'
      } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
      style={{ minHeight: '118px', touchAction: 'manipulation' }}
    >
      {/* Cabeçalho da Cartela */}
      <div className="w-full flex items-center justify-between px-0.5 mb-0.5">
        <span
          className={`text-[11px] sm:text-xs font-bold tracking-tight truncate max-w-[70px] sm:max-w-[85px] ${
            isSuspect ? 'text-amber-900' : 'text-slate-800'
          }`}
        >
          {character.name}
        </span>

        {/* Indicador de Status */}
        {isDiscarded && (
          <span className="bg-rose-100 text-rose-700 p-0.5 rounded-full border border-rose-300">
            <EyeOff size={10} />
          </span>
        )}
        {isSuspect && (
          <span className="bg-amber-200 text-amber-900 px-1 py-0.2 rounded-full border border-amber-400 font-black text-[9px]">
            ?
          </span>
        )}
        {!isDiscarded && !isSuspect && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        )}
      </div>

      {/* Avatar Central com Efeitos */}
      <div className="relative my-0.5 flex items-center justify-center">
        <Avatar
          character={character}
          size={58}
          className={`transition-all duration-200 ${
            isDiscarded ? 'grayscale' : isSuspect ? 'grayscale-[40%] brightness-95' : ''
          }`}
        />

        {/* Efeito Suspeito: Interrogação Translúcida */}
        {isSuspect && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-amber-600/70 font-black text-5xl sm:text-6xl drop-shadow select-none">
              ?
            </span>
          </div>
        )}

        {/* Efeito Descarte: Overlay de Eliminado */}
        {isDiscarded && (
          <div className="absolute inset-0 bg-slate-900/40 rounded-2xl flex items-center justify-center">
            <span className="bg-rose-600 text-white font-black text-[8px] sm:text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow">
              Descarte
            </span>
          </div>
        )}
      </div>

      {/* Rodapé da Cartela */}
      <div className="w-full flex items-center justify-center gap-1 text-[9px] sm:text-[10px] text-slate-400 font-medium">
        {character.traits?.glasses && <span title="Usa óculos">👓</span>}
        {character.traits?.hat && <span title="Usa chapéu/boné">🧢</span>}
        {character.traits?.beard && <span title="Tem barba">🧔</span>}
        {character.traits?.earrings && <span title="Usa brinco">💍</span>}
      </div>
    </div>
  );
};

export const Card = memo(CardComponent, (prev, next) => {
  return (
    prev.status === next.status &&
    prev.disabled === next.disabled &&
    prev.character.id === next.character.id &&
    prev.character.name === next.character.name &&
    prev.character.imageUrl === next.character.imageUrl &&
    prev.onCardClick === next.onCardClick
  );
});

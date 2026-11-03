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
      className={`relative select-none transition-all duration-150 rounded-2xl border-2 p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-between cursor-pointer active:scale-95 min-h-[120px] sm:min-h-[165px] md:min-h-[195px] lg:min-h-[220px] ${
        isDiscarded
          ? 'bg-slate-100/80 border-slate-200 opacity-40 scale-[0.93]'
          : isSuspect
          ? 'bg-amber-50 border-amber-400 shadow-[0_3px_0_#f59e0b]'
          : 'bg-white border-slate-200 hover:border-sky-400 shadow-[0_3px_0_#cbd5e1]'
      } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Cabeçalho da Cartela com Quebra de Linha para Nomes Longos */}
      <div className="w-full flex items-start justify-between px-0.5 mb-1 gap-1">
        <div className="flex-1 min-w-0 min-h-[2.3em] flex items-center">
          <span
            title={character.name}
            className={`w-full text-[10px] sm:text-xs md:text-sm font-black tracking-tight leading-[1.15] break-words line-clamp-2 ${
              isSuspect ? 'text-amber-900' : 'text-slate-800'
            }`}
          >
            {character.name}
          </span>
        </div>

        {/* Indicador de Status */}
        <div className="shrink-0 mt-0.5">
          {isDiscarded && (
            <span className="bg-rose-100 text-rose-700 p-0.5 sm:p-1 rounded-full border border-rose-300 block">
              <EyeOff size={11} />
            </span>
          )}
          {isSuspect && (
            <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full border border-amber-400 font-black text-[9px] sm:text-xs block">
              ?
            </span>
          )}
          {!isDiscarded && !isSuspect && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
          )}
        </div>
      </div>

      {/* Avatar Central com Efeitos */}
      <div className="relative my-0.5 sm:my-1 flex items-center justify-center">
        <Avatar
          character={character}
          className={`w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-xl sm:rounded-2xl transition-all duration-200 ${
            isDiscarded ? 'grayscale' : isSuspect ? 'grayscale-[40%] brightness-95' : ''
          }`}
        />

        {/* Efeito Suspeito: Interrogação Translúcida */}
        {isSuspect && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-amber-600/70 font-black text-5xl sm:text-7xl drop-shadow select-none">
              ?
            </span>
          </div>
        )}

        {/* Efeito Descarte: Overlay de Eliminado */}
        {isDiscarded && (
          <div className="absolute inset-0 bg-slate-900/40 rounded-xl sm:rounded-2xl flex items-center justify-center">
            <span className="bg-rose-600 text-white font-black text-[8px] sm:text-[10px] md:text-xs uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
              Descarte
            </span>
          </div>
        )}
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

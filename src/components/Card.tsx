import { memo, type FC } from 'react';
import type { Character, CardStatus } from '../types/game';
import { Avatar } from './Avatar';
import { getCardDisplayName } from '../utils/cardDisplay';

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
  const isDown = status === 'discard';
  const displayName = getCardDisplayName(character);
  const fullName = character.name || displayName;

  const handleClick = () => {
    if (disabled) return;
    onCardClick(character);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`${fullName}, ${isDown ? 'descartado' : 'em jogo'}`}
      aria-pressed={isDown}
      title={fullName}
      className={`group relative w-full min-w-[72px] sm:min-w-[84px] rounded-[8px] p-1.5 text-center cursor-pointer transition-all duration-150 ease-out select-none border focus-visible:ring-2 focus-visible:ring-[#2B2420] outline-none motion-reduce:transition-none ${
        isDown
          ? 'bg-[#E2DACD]/25 border-[#E2DACD]/60 opacity-45 scale-[0.98] shadow-none'
          : 'bg-[#FBF8F3] hover:bg-white border-[#E2DACD] hover:border-[#2B2420] shadow-2xs opacity-100 scale-100 hover:-translate-y-0.5'
      } ${disabled ? 'cursor-not-allowed opacity-30' : ''}`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Moldura da Imagem com proporção 1:1 e carregamento rápido */}
      <div className="w-full aspect-square rounded-[6px] overflow-hidden bg-white mb-1.5 border border-[#E2DACD]/70 flex items-center justify-center relative">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={fullName}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-transform duration-150 pointer-events-none ${
              isDown
                ? 'grayscale-[85%] brightness-90'
                : 'group-hover:scale-105'
            }`}
          />
        ) : (
          <Avatar
            character={character}
            className={`w-full h-full rounded-[6px] transition-all duration-150 ${
              isDown ? 'grayscale-[85%] brightness-90' : ''
            }`}
          />
        )}
      </div>

      {/* Nome da Carta: Nome Completo (máx 20 caracteres), quebra em até 2 linhas sem cortar */}
      <div className="w-full min-h-[2.4em] flex items-center justify-center text-center px-0.5">
        <span
          className={`font-sans font-medium leading-[1.18] line-clamp-2 transition-colors duration-150 ${
            isDown ? 'text-[#A39A90]' : 'text-[#2B2420]'
          }`}
          style={{
            fontSize: displayName.length > 14 ? '10px' : displayName.length > 9 ? '11px' : '12px',
            wordBreak: 'break-word',
          }}
        >
          {displayName}
        </span>
      </div>
    </button>
  );
};

export const Card = memo(CardComponent, (prev, next) => {
  return (
    prev.status === next.status &&
    prev.disabled === next.disabled &&
    prev.character.id === next.character.id &&
    prev.character.name === next.character.name &&
    prev.character.nickname === next.character.nickname &&
    prev.character.imageUrl === next.character.imageUrl &&
    prev.onCardClick === next.onCardClick
  );
});

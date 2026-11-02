import { memo, type FC } from 'react';
import type { Character } from '../types/game';

interface AvatarProps {
  character: Character;
  size?: number;
  className?: string;
}

const AvatarComponent: FC<AvatarProps> = ({ character, size = 120, className = '' }) => {
  // Se for uma foto personalizada carregada pelo usuário:
  if (character.imageUrl) {
    return (
      <div
        className={`relative rounded-2xl overflow-hidden flex items-center justify-center select-none bg-slate-900 border border-slate-700/80 ${className}`}
        style={{
          width: size,
          height: size,
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), 0 4px 6px -1px rgba(0,0,0,0.3)',
        }}
      >
        <img
          src={character.imageUrl}
          alt={character.name}
          className="w-full h-full object-cover object-center pointer-events-none"
          loading="lazy"
        />
      </div>
    );
  }

  // Se for o avatar padrão SVG:
  const traits = character.traits || {
    gender: 'masculino',
    hairColor: 'castanho',
    hairStyle: 'curto',
    eyeColor: 'castanho',
    glasses: false,
    hat: false,
    beard: false,
    earrings: false,
    smile: true,
  };
  const hairHex = character.hairHex || '#B45309';
  const eyeHex = character.eyeHex || '#78350F';
  const avatarBg = character.avatarBg || '#3B82F6';

  const isFemale = traits.gender === 'feminino';
  const skinTone = isFemale ? '#FDE2D2' : '#F6D2BD';
  const skinShadow = isFemale ? '#F2C8B4' : '#E8B99D';

  return (
    <div 
      className={`relative rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`}
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: avatarBg,
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 4px 6px -1px rgba(0,0,0,0.2)' 
      }}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="w-full h-full"
      >
        <defs>
          <radialGradient id={`bg-${character.id}`} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="100" fill={`url(#bg-${character.id})`} />

        {/* Corpo / Ombros */}
        <path
          d="M30 200 C30 160 65 145 100 145 C135 145 170 160 170 200 Z"
          fill={isFemale ? '#818CF8' : '#3B82F6'}
        />
        <path
          d="M85 145 C85 160 115 160 115 145 Z"
          fill="#FFFFFF"
          opacity="0.8"
        />

        {/* Pescoço */}
        <path d="M85 115 L115 115 L115 150 L85 150 Z" fill={skinShadow} />

        {/* Cabelo de Trás */}
        {traits.hairStyle === 'longo' && (
          <path
            d="M50 85 C40 120 40 175 65 175 C75 175 75 120 75 100 L125 100 C125 120 125 175 135 175 C160 175 160 120 150 85 Z"
            fill={hairHex}
          />
        )}
        {traits.hairStyle === 'cacheado' && isFemale && (
          <path
            d="M45 80 C30 100 35 145 55 155 C65 155 70 120 70 100 L130 100 C130 120 135 155 145 155 C165 145 170 100 155 80 Z"
            fill={hairHex}
          />
        )}

        {/* Cabeça / Rosto */}
        <ellipse cx="100" cy="100" rx="42" ry="48" fill={skinTone} />

        {/* Orelhas */}
        <ellipse cx="58" cy="102" rx="7" ry="12" fill={skinTone} />
        <ellipse cx="142" cy="102" rx="7" ry="12" fill={skinTone} />
        <ellipse cx="59" cy="102" rx="4" ry="7" fill={skinShadow} />
        <ellipse cx="141" cy="102" rx="4" ry="7" fill={skinShadow} />

        {/* Brincos */}
        {traits.earrings && (
          <g>
            <circle cx="58" cy="114" r="4" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
            <circle cx="142" cy="114" r="4" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
          </g>
        )}

        {/* Sobrancelhas */}
        <path
          d="M75 80 Q85 76 93 81"
          stroke={hairHex}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M107 81 Q115 76 125 80"
          stroke={hairHex}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Olhos (Base branca) */}
        <ellipse cx="84" cy="94" rx="7.5" ry="5.5" fill="#FFFFFF" />
        <ellipse cx="116" cy="94" rx="7.5" ry="5.5" fill="#FFFFFF" />

        {/* Íris colorida */}
        <ellipse cx="84" cy="94" rx="4.5" ry="4.5" fill={eyeHex} />
        <ellipse cx="116" cy="94" rx="4.5" ry="4.5" fill={eyeHex} />

        {/* Pupilas */}
        <circle cx="84" cy="94" r="2.2" fill="#111827" />
        <circle cx="116" cy="94" r="2.2" fill="#111827" />

        {/* Brilho nos olhos */}
        <circle cx="82.5" cy="92.5" r="1.2" fill="#FFFFFF" />
        <circle cx="114.5" cy="92.5" r="1.2" fill="#FFFFFF" />

        {/* Nariz */}
        <path
          d="M100 95 L97 107 Q100 110 103 107 Z"
          fill={skinShadow}
        />

        {/* Boca */}
        {traits.smile ? (
          <path
            d="M87 118 Q100 134 113 118"
            fill="#EF4444"
            stroke="#991B1B"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M91 122 Q100 120 109 122"
            stroke="#991B1B"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        )}
        {traits.smile && (
          <path
            d="M90 120 Q100 125 110 120 Q100 122 90 120"
            fill="#FFFFFF"
          />
        )}

        {/* Barba / Pelos faciais */}
        {traits.beard && (
          <g>
            <path
              d="M88 114 Q100 118 100 112 Q100 118 112 114 Q100 121 88 114 Z"
              fill={hairHex}
            />
            <path
              d="M75 118 C75 148 125 148 125 118 C115 138 85 138 75 118 Z"
              fill={hairHex}
            />
          </g>
        )}

        {/* Óculos */}
        {traits.glasses && (
          <g>
            <rect
              x="72"
              y="85"
              width="24"
              height="18"
              rx="5"
              fill="rgba(255,255,255,0.3)"
              stroke="#1E293B"
              strokeWidth="3"
            />
            <rect
              x="104"
              y="85"
              width="24"
              height="18"
              rx="5"
              fill="rgba(255,255,255,0.3)"
              stroke="#1E293B"
              strokeWidth="3"
            />
            <line
              x1="96"
              y1="93"
              x2="104"
              y2="93"
              stroke="#1E293B"
              strokeWidth="3"
            />
            <line x1="62" y1="91" x2="72" y2="91" stroke="#1E293B" strokeWidth="2.5" />
            <line x1="128" y1="91" x2="138" y2="91" stroke="#1E293B" strokeWidth="2.5" />
            <line x1="75" y1="88" x2="82" y2="98" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            <line x1="107" y1="88" x2="114" y2="98" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          </g>
        )}

        {/* Cabelo da frente */}
        {traits.hairStyle === 'curto' && (
          <path
            d="M58 85 C58 52 142 52 142 85 C135 68 120 62 100 62 C80 62 65 68 58 85 Z"
            fill={hairHex}
          />
        )}
        {traits.hairStyle === 'longo' && (
          <path
            d="M58 85 C58 50 142 50 142 85 C130 65 115 62 100 62 C85 62 70 65 58 85 Z"
            fill={hairHex}
          />
        )}
        {traits.hairStyle === 'cacheado' && (
          <g fill={hairHex}>
            <circle cx="65" cy="65" r="14" />
            <circle cx="85" cy="55" r="15" />
            <circle cx="105" cy="54" r="16" />
            <circle cx="125" cy="58" r="15" />
            <circle cx="138" cy="72" r="13" />
            <circle cx="60" cy="78" r="12" />
          </g>
        )}
        {traits.hairStyle === 'careca' && (
          <path
            d="M58 92 C58 85 64 85 64 96 Z M136 96 C136 85 142 85 142 92 Z"
            fill={hairHex}
          />
        )}

        {/* Chapéu / Boné */}
        {traits.hat && (
          <g>
            <ellipse cx="100" cy="68" rx="55" ry="14" fill="#DC2626" />
            <path
              d="M60 68 C60 38 140 38 140 68 Z"
              fill="#B91C1C"
            />
            <path
              d="M62 66 Q100 70 138 66"
              stroke="#FBBF24"
              strokeWidth="4"
              fill="none"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

export const Avatar = memo(AvatarComponent);

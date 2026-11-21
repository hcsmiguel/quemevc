import type { FC, ReactNode } from 'react';
import { HighlightedText } from './HighlightedText';

export interface CaraLegendaProps {
  name: string;
  authorName?: string;
  subtitle?: ReactNode;
  isOfficial?: boolean;
  searchQuery?: string;
  className?: string;
  nameClassName?: string;
  showAuthor?: boolean;
}

/**
 * Legenda padrão de cara para todas as telas do jogo:
 * - Nome: Sans do design system, peso 500 (font-medium), ~14px (13px mobile),
 *   cor de tinta primária (#2B2420), line-height confortável, truncado com reticências e title.
 * - Autor/Owner: Sans 400 (font-normal), ~12px, tinta secundária (#6F655C).
 *   Para oficiais: apenas "Tá na Cara!" em tinta primária peso 500 (sem a palavra "oficial").
 */
export const CaraLegenda: FC<CaraLegendaProps> = ({
  name,
  authorName,
  subtitle,
  isOfficial,
  searchQuery = '',
  className = '',
  nameClassName = '',
  showAuthor = true,
}) => {
  return (
    <div className={`w-full text-center mt-2 px-1 select-none min-w-0 ${className}`}>
      <h4
        title={name}
        className={`font-sans font-medium text-[13px] sm:text-[14px] text-[#2B2420] leading-snug truncate w-full ${nameClassName}`}
      >
        {searchQuery ? (
          <HighlightedText text={name} query={searchQuery} />
        ) : (
          name
        )}
      </h4>

      {subtitle !== undefined ? (
        subtitle ? (
          <p className="text-[12px] font-sans truncate mt-0.5 leading-tight text-[#6F655C] font-normal">
            {subtitle}
          </p>
        ) : null
      ) : (
        showAuthor && (authorName !== undefined || isOfficial !== undefined) && (
          <p className="text-[12px] font-sans truncate mt-0.5 leading-tight">
            {isOfficial ? (
              <span className="text-[#2B2420] font-medium">Tá na Cara!</span>
            ) : (
              <span className="text-[#6F655C] font-normal">
                por {authorName?.trim() ? authorName : 'Comunidade'}
              </span>
            )}
          </p>
        )
      )}
    </div>
  );
};

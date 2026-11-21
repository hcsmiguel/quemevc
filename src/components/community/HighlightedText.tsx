import type { FC } from 'react';
import { normalizeText } from '../../utils/communitySearch';

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

/**
 * Componente para realce discreto do trecho encontrado (peso maior, sem cor chamativa).
 * Preserva as maiúsculas e caracteres originais do texto base.
 */
export const HighlightedText: FC<HighlightedTextProps> = ({
  text,
  query,
  className = '',
}) => {
  if (!query || !query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  const normQuery = normalizeText(query);
  if (!normQuery) {
    return <span className={className}>{text}</span>;
  }

  // Mapeamento normalizado para encontrar o trecho
  const normText = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ç/g, 'c');

  const matchIdx = normText.indexOf(normQuery);
  if (matchIdx === -1) {
    return <span className={className}>{text}</span>;
  }

  const before = text.slice(0, matchIdx);
  const match = text.slice(matchIdx, matchIdx + query.trim().length);
  const after = text.slice(matchIdx + query.trim().length);

  return (
    <span className={className}>
      {before}
      <span className="font-bold text-[#2B2420]">{match}</span>
      {after}
    </span>
  );
};

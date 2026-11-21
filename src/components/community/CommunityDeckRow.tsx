import type { FC } from 'react';
import type { SavedDeck } from '../../services/auth';
import { Button } from '../ui/Button';
import { HighlightedText } from './HighlightedText';
import { ActionMenu } from './ActionMenu';

interface CommunityDeckRowProps {
  deck: SavedDeck;
  isSaved: boolean;
  isConfiguring?: boolean;
  searchQuery?: string;
  onPlayDeck: (deck: SavedDeck) => void;
  onViewDeck?: (deck: SavedDeck) => void;
  onToggleSaveDeck: (deck: SavedDeck) => void;
  onShareDeck: (deck: SavedDeck) => void;
  onReportDeck: (deck: SavedDeck) => void;
}

export const CommunityDeckRow: FC<CommunityDeckRowProps> = ({
  deck,
  isSaved,
  isConfiguring = false,
  searchQuery = '',
  onPlayDeck,
  onViewDeck,
  onToggleSaveDeck,
  onShareDeck,
  onReportDeck,
}) => {
  const cardList = deck.cards || [];
  const previewCards = cardList.slice(0, 6);
  const remainingCount = cardList.length - 6;

  return (
    <div className="py-4 border-b border-[#E2DACD] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
      {/* Informações do Baralho (Nome Clicável) */}
      <div className="min-w-0 flex-1">
        <h3
          role="button"
          tabIndex={0}
          onClick={() => onViewDeck?.(deck)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onViewDeck?.(deck);
            }
          }}
          className="font-serif text-base sm:text-lg text-[#2B2420] hover:text-[#B4532F] transition-colors truncate font-normal leading-snug cursor-pointer select-none outline-none focus-visible:underline inline-block max-w-full"
        >
          <HighlightedText text={deck.name} query={searchQuery} />
        </h3>
        <p className="text-xs font-sans text-[#6F655C] mt-0.5 truncate">
          <span>{deck.card_count || cardList.length} cartas · </span>
          {deck.is_official ? (
            <span>
              por <span className="text-[#2B2420] font-medium">Tá na Cara!</span>
            </span>
          ) : (
            <span>
              por{' '}
              <HighlightedText
                text={deck.author_name?.trim() ? deck.author_name : 'Jogador da Comunidade'}
                query={searchQuery}
                className="text-[#2B2420]"
              />
            </span>
          )}
        </p>
      </div>

      {/* Miniaturas das Cartas e Ações */}
      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 flex-wrap">
        {/* Faixa de Fotos das Cartas Clicável */}
        {cardList.length > 0 && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => onViewDeck?.(deck)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onViewDeck?.(deck);
              }
            }}
            title={`Ver as ${cardList.length} caras do baralho ${deck.name}`}
            className="flex items-center -space-x-1.5 overflow-hidden shrink-0 cursor-pointer group/thumbs outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] rounded-[6px]"
          >
            {previewCards.map((c, i) => (
              <div
                key={c.id || i}
                className="w-8 h-8 rounded-[6px] cara-frame-thumb overflow-hidden bg-[#FAF6F0] shrink-0 group-hover/thumbs:opacity-95"
                title={c.name}
              >
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    loading="lazy"
                    className="w-full h-full object-cover cara-img"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] font-sans text-[#2B2420]">
                    {c.name ? c.name.charAt(0) : '?'}
                  </div>
                )}
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="w-8 h-8 rounded-[6px] bg-[#E2DACD]/60 text-[#2B2420] flex items-center justify-center text-[10px] font-sans font-medium shrink-0">
                +{remainingCount}
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Link explícito Ver Caras */}
          <button
            type="button"
            onClick={() => onViewDeck?.(deck)}
            className="text-xs font-sans text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer transition-colors"
          >
            Ver caras
          </button>

          {/* Botão de Ação Principal: Botão Secundário Forte */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onPlayDeck(deck)}
          >
            {isConfiguring ? 'Selecionar este baralho' : 'Jogar'}
          </Button>

          {/* Salvar / Salvo em texto */}
          <button
            type="button"
            onClick={() => onToggleSaveDeck(deck)}
            className={`text-xs font-sans underline cursor-pointer transition-colors ${
              isSaved
                ? 'text-[#2B2420] font-semibold'
                : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            {isSaved ? 'Salvo' : 'Salvar'}
          </button>

          {/* Compartilhar em texto */}
          <button
            type="button"
            onClick={() => onShareDeck(deck)}
            className="text-xs font-sans text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer transition-colors"
          >
            Compartilhar
          </button>

          {/* Menu Reticências */}
          <ActionMenu
            ariaLabel="Mais ações do baralho"
            items={[
              {
                label: 'Denunciar',
                onClick: () => onReportDeck(deck),
                variant: 'danger',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

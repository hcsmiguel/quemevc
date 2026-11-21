import { useState, useRef, type FC, type MouseEvent, type TouchEvent, type KeyboardEvent } from 'react';
import { Bookmark, Eye, Check } from 'lucide-react';
import type { SavedFace } from '../../services/auth';
import { CaraLegenda } from './CaraLegenda';

interface CommunityFaceCardProps {
  face: SavedFace;
  isSelected: boolean;
  isSaved: boolean;
  searchQuery?: string;
  onToggleSelect: (face: SavedFace) => void;
  onToggleSave: (face: SavedFace) => void;
  onOpenPreview: (face: SavedFace, triggerEl?: HTMLElement) => void;
}

export const CommunityFaceCard: FC<CommunityFaceCardProps> = ({
  face,
  isSelected,
  isSaved,
  searchQuery = '',
  onToggleSelect,
  onToggleSave,
  onOpenPreview,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPressFireRef = useRef(false);

  // Tratamento de Long Press para Mobile (~400ms)
  const handleTouchStart = (e: TouchEvent) => {
    didLongPressFireRef.current = false;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressFireRef.current = true;
      onOpenPreview(face, cardRef.current || undefined);
    }, 400);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = () => {
    if (didLongPressFireRef.current) {
      didLongPressFireRef.current = false;
      return;
    }
    onToggleSelect(face);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggleSelect(face);
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      onOpenPreview(face, cardRef.current || undefined);
    }
  };

  const handleSaveClick = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleSave(face);
  };

  const handlePreviewClick = (e: MouseEvent) => {
    e.stopPropagation();
    onOpenPreview(face, cardRef.current || undefined);
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${face.name}. ${isSelected ? 'Selecionada' : 'Não selecionada'}. Pressione Espaço para selecionar ou P para pré-visualizar.`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="group relative flex flex-col items-center cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 rounded-[12px] transition-transform duration-150 active:scale-[0.98]"
    >
      {/* Contêiner da Imagem (Aspecto Quadrado Uniforme, Cantos Suaves, Leve Elevação) */}
      <div
        className={`w-full aspect-square rounded-[12px] cara-frame bg-[#FAF6F0] relative transition-all duration-150 ${
          isSelected
            ? 'ring-2 ring-[#2B2420] ring-offset-2 shadow-sm'
            : 'shadow-[0_2px_6px_rgba(43,36,32,0.06),0_1px_2px_rgba(43,36,32,0.04)] hover:shadow-md'
        }`}
      >
        {/* Placeholder enquanto carrega */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#E2DACD]/25 animate-pulse" />
        )}

        <img
          src={face.image_url}
          alt={face.name}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover cara-img transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Marcador Discreto de Selecionado no Canto Superior Esquerdo */}
        {isSelected && (
          <div
            aria-hidden="true"
            className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#2B2420] text-white flex items-center justify-center shadow-xs"
          >
            <Check size={12} strokeWidth={3} />
          </div>
        )}

        {/* Marcador de Salvar (Canto Superior Direito, Alvo de Toque >= 44x44px) */}
        <button
          type="button"
          onClick={handleSaveClick}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remover ${face.name} dos salvos` : `Salvar ${face.name}`}
          title={isSaved ? 'Salva nos seus favoritos' : 'Salvar nos favoritos'}
          className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center z-10 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
        >
          <div
            className={`w-7 h-7 rounded-[6px] flex items-center justify-center transition-all ${
              isSaved
                ? 'bg-[#FBF8F3]/90 text-[#2B2420] shadow-xs'
                : 'bg-[#FBF8F3]/80 text-[#6F655C] hover:text-[#2B2420] sm:opacity-0 sm:group-hover:opacity-100 opacity-75'
            }`}
          >
            <Bookmark
              size={14}
              className={isSaved ? 'fill-[#2B2420] text-[#2B2420]' : 'text-[#6F655C]'}
            />
          </div>
        </button>

        {/* Botão de Pré-visualização no Olhinho (Desktop Hover) */}
        <button
          type="button"
          onClick={handlePreviewClick}
          aria-label={`Pré-visualizar ${face.name} ampliado (tecla P)`}
          title="Pré-visualizar (tecla P)"
          className="hidden sm:flex absolute bottom-2 right-2 w-7 h-7 rounded-[6px] bg-[#FBF8F3]/90 hover:bg-[#FBF8F3] text-[#6F655C] hover:text-[#2B2420] items-center justify-center shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
        >
          <Eye size={13} />
        </button>
      </div>

      {/* Nome do Personagem e Autor Abaixo da Carta */}
      <CaraLegenda
        name={face.name}
        authorName={face.author_name}
        isOfficial={face.is_official}
        searchQuery={searchQuery}
      />
    </div>
  );
};

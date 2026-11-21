import { useState, useRef, useEffect, useMemo, type FC, type MouseEvent, type TouchEvent, type KeyboardEvent } from 'react';
import { X, Search, Check, Eye, Plus, ArrowLeft } from 'lucide-react';
import type { Character } from '../types/game';
import type { AppUser, SavedFace } from '../services/auth';
import { getRelevanceTier } from '../utils/communitySearch';
import { CaraLegenda } from './community/CaraLegenda';
import { FacePreviewModal } from './community/FacePreviewModal';
import { Button } from './ui/Button';
import { sounds } from '../utils/sound';

export interface FacePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCards: Character[];
  onToggleCard: (face: SavedFace) => void;
  onOpenAddFace: () => void;
  currentUser: AppUser | null;
  communityFaces: SavedFace[];
  savedFaces: SavedFace[];
}

type PickerFilter = 'all' | 'mine' | 'saved';

function getTargetInfo(count: number): { nextTarget: number; text: string } {
  if (count === 0) {
    return { nextTarget: 15, text: 'Nenhuma selecionada · faltam 15 para 15' };
  }
  if (count < 15) {
    const diff = 15 - count;
    return {
      nextTarget: 15,
      text: `${count} ${count === 1 ? 'selecionada' : 'selecionadas'} · faltam ${diff} para 15`,
    };
  }
  if (count === 15) {
    return { nextTarget: 15, text: '15 selecionadas · meta atingida' };
  }
  if (count < 30) {
    const diff = 30 - count;
    const over = count - 15;
    return {
      nextTarget: 30,
      text: `${count} selecionadas · faltam ${diff} para 30, ou remova ${over} para 15`,
    };
  }
  if (count === 30) {
    return { nextTarget: 30, text: '30 selecionadas · meta atingida' };
  }
  if (count < 60) {
    const diff = 60 - count;
    const over = count - 30;
    return {
      nextTarget: 60,
      text: `${count} selecionadas · faltam ${diff} para 60, ou remova ${over} para 30`,
    };
  }
  if (count === 60) {
    return { nextTarget: 60, text: '60 selecionadas · meta atingida' };
  }
  if (count < 90) {
    const diff = 90 - count;
    const over = count - 60;
    return {
      nextTarget: 90,
      text: `${count} selecionadas · faltam ${diff} para 90, ou remova ${over} para 60`,
    };
  }
  if (count === 90) {
    return { nextTarget: 90, text: '90 selecionadas · meta atingida' };
  }
  return { nextTarget: 90, text: 'Máximo de 90 cartas atingido' };
}

export const FacePickerModal: FC<FacePickerModalProps> = ({
  isOpen,
  onClose,
  selectedCards,
  onToggleCard,
  onOpenAddFace,
  currentUser,
  communityFaces,
  savedFaces,
}) => {
  const [filter, setFilter] = useState<PickerFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(36);
  const [previewFace, setPreviewFace] = useState<SavedFace | null>(null);
  const [previewTriggerEl, setPreviewTriggerEl] = useState<HTMLElement | null>(null);

  // Dica de descoberta mobile: exibida uma única vez no celular
  const [showMobileHint, setShowMobileHint] = useState(() => {
    try {
      return !localStorage.getItem('cara_hint_picker_longpress');
    } catch {
      return false;
    }
  });

  const dismissMobileHint = () => {
    try {
      localStorage.setItem('cara_hint_picker_longpress', 'true');
    } catch {
      // ignore
    }
    setShowMobileHint(false);
  };

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Escuta tecla Escape e prende foco no desktop
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Conjunto de chaves das cartas atualmente selecionadas
  const selectedKeySet = useMemo(() => {
    const set = new Set<string>();
    selectedCards.forEach((c) => {
      if (c.id) set.add(c.id);
      if (c.imageUrl) set.add(c.imageUrl);
      set.add(c.name.trim().toLowerCase());
    });
    return set;
  }, [selectedCards]);

  // Lista unificada de todas as caras de acordo com o filtro
  const rawList = useMemo(() => {
    const map = new Map<string, SavedFace>();

    if (filter === 'mine') {
      if (currentUser) {
        savedFaces
          .filter((f) => f.user_id === currentUser.id || f.author_name === currentUser.username)
          .forEach((f) => map.set(f.id, f));
      }
    } else if (filter === 'saved') {
      if (currentUser) {
        savedFaces
          .filter((f) => f.user_id !== currentUser.id && f.author_name !== currentUser.username)
          .forEach((f) => map.set(f.id, f));
      }
    } else {
      // 'all': comunidade + oficiais + minhas
      communityFaces.forEach((f) => map.set(f.id, f));
      savedFaces.forEach((f) => map.set(f.id, f));
    }

    return Array.from(map.values()).filter(
      (f) => !f.is_hidden && f.name !== 'Cara removida' && (f as any).status !== 'deleted'
    );
  }, [filter, communityFaces, savedFaces, currentUser]);

  // Filtragem com busca normalizada sem acento e ordenação por relevância
  const filteredList = useMemo(() => {
    const trimmedQ = searchQuery.trim();
    if (!trimmedQ) return rawList;

    const scored = rawList
      .map((face) => {
        const tier = getRelevanceTier(face.name, trimmedQ);
        return { face, tier };
      })
      .filter((item): item is { face: SavedFace; tier: number } => item.tier !== null);

    scored.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.face.name.localeCompare(b.face.name, 'pt-BR');
    });

    return scored.map((s) => s.face);
  }, [rawList, searchQuery]);

  // Reinicia paginação ao mudar filtro ou busca
  useEffect(() => {
    setVisibleCount(36);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [filter, searchQuery]);

  // Rolagem infinita com IntersectionObserver ancorado no corpo do próprio seletor
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 36, filteredList.length));
        }
      },
      { root: container, rootMargin: '120px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredList.length]);

  if (!isOpen) return null;

  const visibleFaces = filteredList.slice(0, visibleCount);
  const targetInfo = getTargetInfo(selectedCards.length);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
      className="fixed inset-0 z-50 bg-[#2B2420]/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="bg-[#FBF8F3] border border-[#E2DACD] w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-[12px] p-4 sm:p-6 shadow-xl flex flex-col justify-between text-left relative"
      >
        {/* CABEÇALHO DO SELETOR */}
        <div className="shrink-0 pb-3 border-b border-[#E2DACD]">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              {/* No celular: seta de voltar/fechar; no desktop: título direto */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Voltar"
                className="sm:hidden p-1.5 -ml-1.5 text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 id="picker-title" className="font-serif text-xl sm:text-2xl text-[#2B2420] font-normal leading-tight">
                Adicionar caras
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Ação de adicionar nova foto */}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onOpenAddFace();
                }}
                className="text-xs font-sans font-medium text-[#B4532F] hover:text-[#984323] transition-colors flex items-center gap-1 cursor-pointer py-1 px-2 rounded-[4px] hover:bg-[#FAF6F0]"
              >
                <Plus size={14} />
                <span>Adicionar foto</span>
              </button>

              {/* Botão X para fechar no desktop */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar seletor"
                className="hidden sm:inline-flex p-1.5 text-[#6F655C] hover:text-[#2B2420] rounded-[6px] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Linha de Filtros de Texto e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Filtros em texto: Todas · Minhas · Salvas */}
            <div className="flex items-center gap-2 text-xs font-sans text-[#6F655C]">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setFilter('all');
                }}
                className={`transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'font-semibold text-[#2B2420] underline underline-offset-4'
                    : 'hover:text-[#2B2420]'
                }`}
              >
                Todas
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setFilter('mine');
                }}
                className={`transition-colors cursor-pointer ${
                  filter === 'mine'
                    ? 'font-semibold text-[#2B2420] underline underline-offset-4'
                    : 'hover:text-[#2B2420]'
                }`}
              >
                Minhas
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setFilter('saved');
                }}
                className={`transition-colors cursor-pointer ${
                  filter === 'saved'
                    ? 'font-semibold text-[#2B2420] underline underline-offset-4'
                    : 'hover:text-[#2B2420]'
                }`}
              >
                Salvas
              </button>
            </div>

            {/* Campo de Busca Normalizada */}
            <div className="relative flex-1 sm:max-w-xs">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar caras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-7 pr-7 bg-white border border-[#E2DACD] rounded-[6px] text-xs font-sans text-[#2B2420] placeholder-[#A39A90] focus:outline-none focus:border-[#2B2420] transition-colors"
              />
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A39A90]" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#A39A90] hover:text-[#2B2420] cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Dica de descoberta mobile na primeira vez */}
          {showMobileHint && (
            <div className="sm:hidden mt-2 pt-2 border-t border-[#E2DACD]/60 flex items-center justify-between text-[11px] text-[#6F655C] font-sans">
              <span>Segure uma carta para ampliar.</span>
              <button
                type="button"
                onClick={dismissMobileHint}
                className="text-[#2B2420] underline font-medium ml-2 cursor-pointer"
              >
                Entendi
              </button>
            </div>
          )}
        </div>

        {/* CORPO DO SELETOR: GRADE DE CARTAS */}
        <div
          ref={scrollContainerRef}
          className="my-3 flex-1 overflow-y-auto pr-1 select-none min-h-[300px] max-h-[55vh] sm:max-h-[60vh]"
        >
          {visibleFaces.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#6F655C] font-sans">
              {searchQuery.trim() ? (
                <div>
                  <p>Nenhuma cara encontrada para &quot;{searchQuery}&quot;.</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs font-medium text-[#2B2420] underline cursor-pointer"
                  >
                    Limpar busca
                  </button>
                </div>
              ) : filter === 'mine' ? (
                <p>Você ainda não criou nenhuma cara. Toque em &quot;Adicionar foto&quot; para começar!</p>
              ) : filter === 'saved' ? (
                <p>Nenhuma cara salva encontrada.</p>
              ) : (
                <p>Nenhuma cara disponível.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4 pb-4">
              {visibleFaces.map((face) => {
                const isSelected =
                  selectedKeySet.has(face.id) ||
                  selectedKeySet.has(face.image_url) ||
                  selectedKeySet.has(face.name.trim().toLowerCase());
                const isUnavailable = (face as any).status === 'unavailable';

                return (
                  <PickerFaceCardItem
                    key={face.id}
                    face={face}
                    isSelected={isSelected}
                    isUnavailable={isUnavailable}
                    searchQuery={searchQuery}
                    onToggleSelect={() => {
                      if (!isUnavailable) {
                        sounds.playClick();
                        onToggleCard(face);
                      }
                    }}
                    onOpenPreview={(triggerEl) => {
                      setPreviewTriggerEl(triggerEl);
                      setPreviewFace(face);
                      dismissMobileHint();
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Sentinela de Rolagem Infinita */}
          <div ref={sentinelRef} className="h-6 w-full" aria-hidden="true" />
        </div>

        {/* RODAPÉ FIXO DO SELETOR */}
        <div className="pt-3.5 border-t border-[#E2DACD] flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs sm:text-sm font-sans text-[#2B2420]" aria-live="polite">
            {targetInfo.text}
          </p>
          <Button variant="primary" onClick={onClose} className="min-w-[100px]">
            Concluir
          </Button>
        </div>
      </div>

      {/* Visualização de Carta ("olhinho") no Seletor: apenas ver (sem ações) */}
      {previewFace && (
        <FacePreviewModal
          face={previewFace}
          isOpen={Boolean(previewFace)}
          triggerElement={previewTriggerEl}
          onClose={() => setPreviewFace(null)}
        />
      )}
    </div>
  );
};

interface PickerFaceCardItemProps {
  face: SavedFace;
  isSelected: boolean;
  isUnavailable: boolean;
  searchQuery?: string;
  onToggleSelect: () => void;
  onOpenPreview: (triggerEl: HTMLElement) => void;
}

const PickerFaceCardItem: FC<PickerFaceCardItemProps> = ({
  face,
  isSelected,
  isUnavailable,
  searchQuery = '',
  onToggleSelect,
  onOpenPreview,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPressFireRef = useRef(false);

  // Long press mobile (~400ms)
  const handleTouchStart = (e: TouchEvent) => {
    if (isUnavailable) return;
    didLongPressFireRef.current = false;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressFireRef.current = true;
      if (cardRef.current) onOpenPreview(cardRef.current);
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
    onToggleSelect();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggleSelect();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      if (cardRef.current) onOpenPreview(cardRef.current);
    }
  };

  const handleEyeClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (cardRef.current) onOpenPreview(cardRef.current);
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={isUnavailable ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={isUnavailable}
      aria-label={`${face.name}. ${isSelected ? 'Selecionada' : 'Não selecionada'}. Toque para selecionar ou P para pré-visualizar.`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`group relative flex flex-col items-center cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 rounded-[12px] transition-transform duration-150 active:scale-[0.98] ${
        isUnavailable ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      }`}
    >
      {/* Moldura da imagem com contorno de tinta de 2px quando selecionada */}
      <div
        className={`w-full aspect-square rounded-[12px] cara-frame bg-[#FAF6F0] relative transition-all duration-150 ${
          isSelected
            ? 'ring-2 ring-[#2B2420] ring-offset-2 ring-offset-[#FBF8F3] shadow-sm'
            : 'shadow-[0_2px_6px_rgba(43,36,32,0.06),0_1px_2px_rgba(43,36,32,0.04)] hover:shadow-md'
        }`}
      >
        <img
          src={face.image_url}
          alt={face.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover cara-img"
        />

        {/* Marca de seleção discreta no canto superior esquerdo */}
        {isSelected && (
          <div
            aria-hidden="true"
            className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#2B2420] text-white flex items-center justify-center shadow-xs"
          >
            <Check size={12} strokeWidth={3} />
          </div>
        )}

        {/* Botão Olhinho para visualização (hover no desktop) */}
        <button
          type="button"
          onClick={handleEyeClick}
          aria-label={`Ver detalhes de ${face.name}`}
          title="Pré-visualizar (tecla P)"
          className="hidden sm:flex absolute bottom-2 right-2 w-7 h-7 rounded-[6px] bg-[#FBF8F3]/90 hover:bg-[#FBF8F3] text-[#6F655C] hover:text-[#2B2420] items-center justify-center shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
        >
          <Eye size={13} />
        </button>
      </div>

      {/* Legenda padrão */}
      <CaraLegenda
        name={face.name}
        authorName={face.author_name}
        isOfficial={face.is_official}
        searchQuery={searchQuery}
      />
    </div>
  );
};

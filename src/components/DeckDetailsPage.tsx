import { useState, useEffect, useMemo, useCallback, type FC } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Bookmark,
  Share2,
  X,
} from 'lucide-react';
import { auth, type AppUser, type SavedDeck, type SavedFace } from '../services/auth';
import type { Character } from '../types/game';
import { normalizeText } from '../utils/communitySearch';
import { Button } from './ui/Button';
import { CaraLegenda } from './community/CaraLegenda';
import { ActionMenu } from './community/ActionMenu';
import { FacePreviewModal } from './community/FacePreviewModal';
import { CommunityToast, type ToastData } from './community/CommunityToast';
import { ReportModal, type ReportItemTarget } from './ReportModal';
import {
  applyDeckToDraft,
  resetConfigDraft,
  isChoiceMode as checkIsChoiceMode,
  getDeckContextList,
} from '../services/configDraft';
import {
  saveDeckAsReference,
  removeSavedDeckReference,
  saveFaceAsReference,
} from '../services/dataAdapter';

interface DeckDetailsPageProps {
  deckId: string;
  currentUser: AppUser | null;
  onBack: () => void;
  onNavigateToDeck: (nextDeckId: string) => void;
  onUseDeckInConfiguration: (deck: SavedDeck) => void;
  onPlayDeck: (deck: SavedDeck) => void;
  onEditDeck?: (deck: SavedDeck) => void;
  onOpenLogin: () => void;
  onGoToCommunity: () => void;
}

export const DeckDetailsPage: FC<DeckDetailsPageProps> = ({
  deckId,
  currentUser,
  onBack,
  onNavigateToDeck,
  onUseDeckInConfiguration,
  onPlayDeck,
  onEditDeck,
  onOpenLogin,
  onGoToCommunity,
}) => {
  const [deck, setDeck] = useState<SavedDeck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not_found' | 'network' | null>(null);

  // Busca interna no baralho
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Salvar baralho
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Modal de denúncia e pré-visualização de carta
  const [previewFace, setPreviewFace] = useState<SavedFace | null>(null);
  const [previewTriggerEl, setPreviewTriggerEl] = useState<HTMLElement | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportItemTarget | null>(null);

  // Modo escolha (se o usuário veio de "Trocar baralho" na configuração)
  const isChoice = checkIsChoiceMode();

  // Lista de IDs do contexto de navegação para anterior/próximo
  const contextIds = getDeckContextList();
  const currentIndex = contextIds.indexOf(deckId);
  const hasContext = contextIds.length > 1 && currentIndex !== -1;
  const prevDeckId = hasContext && currentIndex > 0 ? contextIds[currentIndex - 1] : null;
  const nextDeckId = hasContext && currentIndex < contextIds.length - 1 ? contextIds[currentIndex + 1] : null;

  // Debounce para a busca interna
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Carregar dados do baralho
  const loadDeck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await auth.getDeckById(deckId);
      if (!found) {
        setError('not_found');
        setDeck(null);
        return;
      }

      // Se o baralho for privado e não pertencer ao usuário logado, não vaza dados
      if (!found.is_public && (!currentUser || found.user_id !== currentUser.id)) {
        setError('not_found');
        setDeck(null);
        return;
      }

      setDeck(found);
      document.title = `${found.name} · Tá na Cara! Mas de quem?!`;

      // Verificar se o baralho já está salvo pelo usuário
      if (currentUser?.id) {
        try {
          const userDecks = await auth.getUserSavedDecks(currentUser.id);
          setIsSaved(userDecks.some((d) => d.id === found.id));
        } catch {
          // ignore
        }
      }
    } catch {
      setError('network');
      setDeck(null);
    } finally {
      setLoading(false);
    }
  }, [deckId, currentUser]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // Limpar título da página ao desmontar
  useEffect(() => {
    return () => {
      document.title = 'Tá na Cara! Mas de quem?!';
    };
  }, []);

  // Filtragem e normalização das cartas do baralho
  const cardsList = deck?.cards || [];
  const filteredCards = useMemo(() => {
    const q = normalizeText(debouncedQuery);
    if (!q) return cardsList;

    return cardsList.filter((card) => {
      const normName = normalizeText(card.name);
      return normName.includes(q);
    });
  }, [cardsList, debouncedQuery]);

  // Alternar Salvar / Dessalvar baralho
  const handleToggleSave = async () => {
    if (!currentUser) {
      onOpenLogin();
      return;
    }
    if (!deck) return;

    const previousState = isSaved;
    const newState = !previousState;
    setIsSaved(newState);

    try {
      if (newState) {
        await saveDeckAsReference(currentUser.id, deck);
        setToast({
          id: String(Date.now()),
          message: 'Baralho salvo nos seus favoritos.',
          actionLabel: 'Desfazer',
          onAction: async () => {
            setIsSaved(false);
            await removeSavedDeckReference(currentUser.id, deck.id);
          },
        });
      } else {
        await removeSavedDeckReference(currentUser.id, deck.id);
        setToast({
          id: String(Date.now()),
          message: 'Baralho removido dos seus favoritos.',
          actionLabel: 'Desfazer',
          onAction: async () => {
            setIsSaved(true);
            await saveDeckAsReference(currentUser.id, deck);
          },
        });
      }
    } catch (err: any) {
      setIsSaved(previousState);
      setToast({
        id: String(Date.now()),
        message: err?.message || 'Erro ao atualizar baralho.',
      });
    }
  };

  // Compartilhar baralho
  const handleShare = async () => {
    if (!deck) return;

    if (!deck.is_public) {
      setToast({
        id: String(Date.now()),
        message: 'Baralho privado: visível apenas para você.',
      });
      return;
    }

    const shareUrl = window.location.href;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setToast({
          id: String(Date.now()),
          message: 'Link do baralho copiado para a área de transferência!',
        });
      } else {
        setToast({
          id: String(Date.now()),
          message: `Link: ${shareUrl}`,
        });
      }
    } catch {
      setToast({
        id: String(Date.now()),
        message: `Link: ${shareUrl}`,
      });
    }
  };

  // Ação Principal: "Usar este baralho" (modo escolha) ou "Jogar" (demais casos)
  // REGRA CENTRAL: Nunca cria sala diretamente! Redireciona sempre para Configurar Partida.
  const handlePrimaryAction = () => {
    if (!deck) return;

    if (isChoice) {
      applyDeckToDraft(deck, { isChoiceMode: true });
      onUseDeckInConfiguration(deck);
    } else {
      resetConfigDraft();
      applyDeckToDraft(deck, { isChoiceMode: false });
      onPlayDeck(deck);
    }
  };

  // Abrir pré-visualização ampliada da carta
  const handleCardClick = (card: Character, triggerEl?: HTMLElement) => {
    setPreviewTriggerEl(triggerEl || null);
    const convertedFace: SavedFace = {
      id: card.id,
      user_id: deck?.user_id || 'community',
      name: card.name,
      image_url: card.imageUrl || '',
      created_at: deck?.created_at || new Date().toISOString(),
      is_public: true,
      is_official: deck?.is_official,
      author_name: deck?.author_name || (deck?.is_official ? 'Tá na Cara!' : 'Comunidade'),
    };
    setPreviewFace(convertedFace);
  };

  // -------------------------------------------------------------
  // ESTADOS ESPECIAIS (CARREGANDO, ERRO, NÃO ENCONTRADO)
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 text-left animate-in fade-in duration-150">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[6px] bg-[#E2DACD]/30 animate-pulse" />
          <div className="h-8 w-48 bg-[#E2DACD]/30 rounded-[6px] animate-pulse" />
        </div>
        <div className="h-4 w-32 bg-[#E2DACD]/20 rounded-[4px] mb-8 animate-pulse" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-full aspect-square rounded-[12px] bg-[#E2DACD]/30 animate-pulse" />
              <div className="w-16 h-3 bg-[#E2DACD]/20 rounded-[4px] mt-2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error === 'not_found' || !deck) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center animate-in fade-in duration-150">
        <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#2B2420] mb-2">
          Baralho não encontrado
        </h2>
        <p className="text-xs sm:text-sm font-sans text-[#6F655C] mb-6">
          Este baralho não existe ou é privado e você não tem permissão para visualizá-lo.
        </p>
        <Button variant="secondary" onClick={onGoToCommunity}>
          Voltar à comunidade
        </Button>
      </div>
    );
  }

  if (error === 'network') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center animate-in fade-in duration-150">
        <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#2B2420] mb-2">
          Erro de conexão
        </h2>
        <p className="text-xs sm:text-sm font-sans text-[#6F655C] mb-6">
          Não foi possível carregar as informações deste baralho. Verifique sua rede e tente novamente.
        </p>
        <Button variant="secondary" onClick={loadDeck}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  const isOwner = currentUser && deck.user_id === currentUser.id;
  const isOfficial = Boolean(deck.is_official || deck.author_name === 'Tá na Cara!');
  const totalCardsCount = deck.cards?.length || deck.card_count || 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-left pb-24 sm:pb-8">
      {/* 1. TOPO DA PÁGINA: NAVEGAÇÃO E TÍTULO EM SUPERFÍCIE ÚNICA */}
      <div className="flex items-center justify-between gap-3 mb-4">
        {/* Seta de Voltar simples */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          title="Voltar"
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-[6px] text-[#6F655C] hover:text-[#2B2420] hover:bg-[#2B2420]/5 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Setas Anterior / Próximo (exibidas apenas se houver contexto de navegação interna) */}
        {hasContext && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!prevDeckId}
              onClick={() => prevDeckId && onNavigateToDeck(prevDeckId)}
              aria-label="Baralho anterior na lista"
              title={prevDeckId ? 'Baralho anterior' : 'Início da lista'}
              className="w-9 h-9 flex items-center justify-center rounded-[6px] text-[#6F655C] hover:text-[#2B2420] hover:bg-[#2B2420]/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={!nextDeckId}
              onClick={() => nextDeckId && onNavigateToDeck(nextDeckId)}
              aria-label="Próximo baralho na lista"
              title={nextDeckId ? 'Próximo baralho' : 'Fim da lista'}
              className="w-9 h-9 flex items-center justify-center rounded-[6px] text-[#6F655C] hover:text-[#2B2420] hover:bg-[#2B2420]/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* 2. CABEÇALHO DO BARALHO: TÍTULO, METADADOS E AÇÕES */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-[#E2DACD] mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#2B2420] font-normal tracking-tight leading-tight">
            {deck.name}
          </h1>

          {/* Metadados: autor "Tá na Cara!" em tinta primária peso 500 sem a palavra "oficial" */}
          <p className="text-xs sm:text-sm font-sans text-[#6F655C] mt-1.5 truncate">
            <span>{totalCardsCount} cartas · por </span>
            {isOfficial ? (
              <span className="text-[#2B2420] font-medium">Tá na Cara!</span>
            ) : (
              <span className="text-[#2B2420]">
                {deck.author_name?.trim() ? deck.author_name : 'Jogador da Comunidade'}
              </span>
            )}
            {!deck.is_public && (
              <span className="ml-2 text-[11px] font-sans text-[#8C786E] bg-[#FAF6F0] px-2 py-0.5 rounded-[4px] border border-[#E2DACD]">
                Privado
              </span>
            )}
          </p>
        </div>

        {/* Ações no Desktop / Tablet */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-wrap">
          {/* Botão Primário: "Usar este baralho" (modo escolha) ou "Jogar" (demais casos) */}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handlePrimaryAction}
            className="hidden sm:inline-flex cursor-pointer"
          >
            {isChoice ? 'Usar este baralho' : 'Jogar'}
          </Button>

          {/* Salvar / Salvo */}
          <button
            type="button"
            onClick={handleToggleSave}
            className={`text-xs font-sans underline cursor-pointer transition-colors flex items-center gap-1.5 py-1 ${
              isSaved
                ? 'text-[#2B2420] font-semibold'
                : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            <Bookmark
              size={13}
              className={isSaved ? 'text-[#2B2420] fill-[#2B2420]' : 'text-[#6F655C]'}
            />
            <span>{isSaved ? 'Salvo' : 'Salvar'}</span>
          </button>

          {/* Compartilhar */}
          <button
            type="button"
            onClick={handleShare}
            disabled={!deck.is_public}
            title={
              deck.is_public
                ? 'Copiar link do baralho'
                : 'Baralho privado: apenas você tem acesso'
            }
            className={`text-xs font-sans underline cursor-pointer transition-colors flex items-center gap-1.5 py-1 ${
              deck.is_public
                ? 'text-[#6F655C] hover:text-[#2B2420]'
                : 'text-[#A39A90] opacity-60 cursor-not-allowed no-underline'
            }`}
          >
            <Share2 size={13} />
            <span>Compartilhar</span>
          </button>

          {/* Menu Reticências ("...") */}
          <ActionMenu
            ariaLabel="Mais opções do baralho"
            items={[
              ...(isOwner && onEditDeck
                ? [
                    {
                      label: 'Editar baralho',
                      onClick: () => onEditDeck(deck),
                    },
                  ]
                : []),
              {
                label: 'Denunciar',
                onClick: () => {
                  setReportTarget({
                    type: 'deck',
                    id: deck.id,
                    name: deck.name,
                    authorName: deck.author_name,
                  });
                },
                variant: 'danger',
              },
            ]}
          />
        </div>
      </div>

      {/* 3. CAMPO DE BUSCA DENTRO DO BARALHO (Apenas linha inferior) */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[#6F655C] pointer-events-none">
            <Search size={15} />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar personagem neste baralho..."
            aria-label="Buscar personagem neste baralho"
            className="w-full pl-6 pr-8 py-2 bg-transparent border-0 border-b border-[#E2DACD] focus:border-[#2B2420] outline-none text-xs sm:text-sm font-sans text-[#2B2420] placeholder-[#A39A90] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca"
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. GRADE DE CARTAS DO BARALHO (Até 90 itens sem paginação) */}
      {filteredCards.length === 0 ? (
        /* Estado vazio da busca */
        <div className="py-16 text-center text-xs font-sans text-[#6F655C]">
          <p className="mb-2">Nenhuma cara com "{searchQuery}".</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs text-[#2B2420] underline font-medium cursor-pointer"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <div
          role="grid"
          aria-label={`Cartas do baralho ${deck.name}`}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3.5"
        >
          {filteredCards.map((card, index) => (
            <div
              key={card.id || index}
              role="button"
              tabIndex={0}
              aria-label={`${card.name}. Pressione Enter ou P para pré-visualizar.`}
              onClick={(e) => handleCardClick(card, e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'p' || e.key === 'P') {
                  e.preventDefault();
                  handleCardClick(card, e.currentTarget);
                }
              }}
              className="group relative flex flex-col items-center cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 rounded-[12px] transition-transform duration-150 active:scale-[0.98]"
            >
              {/* Moldura da imagem: .cara-frame + .cara-img */}
              <div className="w-full aspect-square rounded-[12px] cara-frame bg-[#FAF6F0] relative shadow-[0_2px_6px_rgba(43,36,32,0.06),0_1px_2px_rgba(43,36,32,0.04)] group-hover:shadow-md transition-shadow">
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover cara-img"
                />

                {/* Ícone sutil de lupa no hover desktop */}
                <div
                  aria-hidden="true"
                  className="hidden sm:flex absolute bottom-2 right-2 w-7 h-7 rounded-[6px] bg-[#FBF8F3]/90 text-[#6F655C] items-center justify-center shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Search size={13} />
                </div>
              </div>

              {/* Legenda com tipografia centralizada */}
              <CaraLegenda
                name={card.name}
                authorName={isOfficial ? undefined : (deck.author_name || 'Comunidade')}
                isOfficial={isOfficial}
                searchQuery={debouncedQuery}
              />
            </div>
          ))}
        </div>
      )}

      {/* 5. BARRA FIXA FLUTUANTE NO MOBILE (Respeitando Safe-Area do iOS) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FBF8F3] border-t border-[#E2DACD] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg block sm:hidden">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handlePrimaryAction}
          className="w-full cursor-pointer justify-center"
        >
          {isChoice ? 'Usar este baralho' : 'Jogar'}
        </Button>
      </div>

      {/* 6. MODAL DE PRÉ-VISUALIZAÇÃO AMPLIADA DA CARTA (SEM "Adicionar à seleção") */}
      {previewFace && (
        <FacePreviewModal
          face={previewFace}
          isOpen={!!previewFace}
          isSaved={false}
          onClose={() => setPreviewFace(null)}
          onToggleSave={() => {
            // Salvar cara individual se o usuário desejar
            if (!currentUser) {
              onOpenLogin();
              return;
            }
            saveFaceAsReference(currentUser.id, {
              id: previewFace.id,
              name: previewFace.name,
              imageUrl: previewFace.image_url,
            })
              .then(() => {
                setToast({
                  id: String(Date.now()),
                  message: `${previewFace.name} salva no seu banco de caras.`,
                });
              })
              .catch((err) => {
                setToast({
                  id: String(Date.now()),
                  message: err?.message || 'Erro ao salvar cara.',
                });
              });
          }}
          onReport={() => {
            setPreviewFace(null);
            setReportTarget({
              type: 'face',
              id: previewFace.id,
              name: previewFace.name,
              authorName: previewFace.author_name,
            });
          }}
          triggerElement={previewTriggerEl}
        />
      )}

      {/* 7. MODAL DE DENÚNCIA */}
      {reportTarget && (
        <ReportModal
          isOpen={!!reportTarget}
          item={reportTarget}
          currentUser={currentUser}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* 8. TOAST DE FEEDBACK COM DESFAZER */}
      <CommunityToast
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

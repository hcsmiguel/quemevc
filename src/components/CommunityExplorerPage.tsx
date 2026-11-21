import { useState, useEffect, useRef, useMemo, useCallback, type FC } from 'react';
import {
  Search,
  ArrowLeft,
  X,
} from 'lucide-react';
import { auth, type AppUser, type SavedDeck, type SavedFace } from '../services/auth';
import type { Character } from '../types/game';
import { STANDARD_15_CHARACTERS } from '../utils/characters';
import { MOCK_90_CHARACTERS } from './redesign/mockData';
import {
  getRelevanceTier,
  getDeckRelevanceTier,
} from '../utils/communitySearch';
import { computeSelectionGoal } from '../utils/selectionRules';
import { CommunityFaceCard } from './community/CommunityFaceCard';
import { CommunityDeckRow } from './community/CommunityDeckRow';
import { CommunitySelectionBar } from './community/CommunitySelectionBar';
import { CreateDeckModal } from './community/CreateDeckModal';
import { FacePreviewModal } from './community/FacePreviewModal';
import { CommunityToast, type ToastData } from './community/CommunityToast';
import { ReportModal, type ReportItemTarget } from './ReportModal';
import { AccountLimitModal } from './AccountLimitModal';

import { communityCache } from '../services/communityCache';
import { setDeckContextList } from '../services/configDraft';
import {
  saveFaceAsReference,
  removeSavedFaceReference,
  saveDeckAsReference,
  removeSavedDeckReference,
} from '../services/dataAdapter';

export type CommunityTab = 'decks' | 'faces';
export type SourceFilter = 'todos' | 'oficiais' | 'comunidade' | 'salvos';
export type SortOrder = 'recentes' | 'salvas' | 'az';

interface CommunityExplorerPageProps {
  currentUser: AppUser | null;
  onBackToHome: () => void;
  onOpenLogin: () => void;
  onPlayDeck: (deck: SavedDeck) => void;
  onViewDeck?: (deck: SavedDeck) => void;
  onGoToProfile: () => void;
  isConfiguring?: boolean;
}

const ITEMS_PER_BATCH = 36;
const SESSION_SELECTION_KEY = 'cara_community_selected_cards';

export const CommunityExplorerPage: FC<CommunityExplorerPageProps> = ({
  currentUser,
  onBackToHome,
  onOpenLogin,
  onPlayDeck,
  onViewDeck,
  onGoToProfile,
  isConfiguring = false,
}) => {
  const cached = communityCache.getState();

  // 1. Estados de Navegação e Filtros lidos da URL (ou cache / padrões)
  const getInitialParams = () => {
    if (typeof window === 'undefined') {
      return { tab: 'decks' as CommunityTab, origem: 'todos' as SourceFilter, ordem: 'recentes' as SortOrder, q: '' };
    }
    const params = new URLSearchParams(window.location.search);
    const abaParam = params.get('aba');
    const tab: CommunityTab = abaParam ? (abaParam === 'caras' ? 'faces' : 'decks') : (cached?.activeTab || 'decks');

    const origemParam = params.get('origem');
    const origem: SourceFilter =
      origemParam === 'oficiais' || origemParam === 'comunidade' || origemParam === 'salvos'
        ? origemParam
        : (cached?.sourceFilter || 'todos');

    const ordemParam = params.get('ordem');
    const ordem: SortOrder =
      ordemParam === 'salvas' || ordemParam === 'az' ? ordemParam : (cached?.sortOrder || 'recentes');

    const q = params.get('q') !== null ? (params.get('q') || '') : (cached?.searchQuery || '');
    return { tab, origem, ordem, q };
  };

  const initial = getInitialParams();
  const [activeTab, setActiveTab] = useState<CommunityTab>(initial.tab);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(initial.origem);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initial.ordem);
  const [searchQuery, setSearchQuery] = useState<string>(initial.q);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initial.q);

  // 2. Dados brutos (com cache em memória para evitar recarga visual)
  const [allDecks, setAllDecks] = useState<SavedDeck[]>(() => cached?.allDecks || auth.getCachedPublicDecks());
  const [allFaces, setAllFaces] = useState<SavedFace[]>(() => cached?.allFaces || auth.getCachedPublicFaces());
  const [userSavedDecks, setUserSavedDecks] = useState<SavedDeck[]>([]);
  const [userSavedFaces, setUserSavedFaces] = useState<SavedFace[]>([]);
  const [savedFaceUrls, setSavedFaceUrls] = useState<Set<string>>(new Set());
  const [savedDeckIds, setSavedDeckIds] = useState<Set<string>>(new Set());

  // 3. Paginação e Rolagem Infinita
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_BATCH);
  const [loading, setLoading] = useState<boolean>(() => !cached?.allDecks || cached.allDecks.length === 0);
  const [networkError, setNetworkError] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Restaurar posição de rolagem se veio do cache
  useEffect(() => {
    const scrollY = communityCache.getScroll();
    if (scrollY > 0) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  // 4. Seleção de Cartas para Baralho (Preservada em sessionStorage)
  const [selectedCards, setSelectedCards] = useState<Character[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(SESSION_SELECTION_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const prevSelectionRef = useRef<Character[]>([]);

  // 5. Modais e Toasts
  const [previewFace, setPreviewFace] = useState<SavedFace | null>(null);
  const [previewTriggerEl, setPreviewTriggerEl] = useState<HTMLElement | null>(null);
  const [createDeckModalOpen, setCreateDeckModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportItemTarget | null>(null);
  const [limitModalType, setLimitModalType] = useState<'deck' | 'face' | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // 6. Ref do input de busca para atalho "/"
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar sessionStorage ao alterar seleção
  useEffect(() => {
    try {
      if (selectedCards.length > 0) {
        sessionStorage.setItem(SESSION_SELECTION_KEY, JSON.stringify(selectedCards));
      } else {
        sessionStorage.removeItem(SESSION_SELECTION_KEY);
      }
    } catch {
      // ignore
    }
  }, [selectedCards]);

  // Debounce de ~150ms para a busca em tempo real
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Atualizar URL query params conforme estado muda
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab === 'faces') params.set('aba', 'caras');
    if (sourceFilter !== 'todos') params.set('origem', sourceFilter);
    if (sortOrder !== 'recentes') params.set('ordem', sortOrder);
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [activeTab, sourceFilter, sortOrder, debouncedQuery]);

  // Suporte ao botão voltar/avançar do navegador (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const current = getInitialParams();
      setActiveTab(current.tab);
      setSourceFilter(current.origem);
      setSortOrder(current.ordem);
      setSearchQuery(current.q);
      setDebouncedQuery(current.q);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Atalhos Globais: "/" para focar busca e "Escape" para limpar
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (isInput && searchInputRef.current === activeEl && searchQuery) {
          e.preventDefault();
          setSearchQuery('');
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [searchQuery]);

  // Carregar dados iniciais e favoritos do usuário
  const loadCommunityData = useCallback(async () => {
    setLoading(true);
    setNetworkError(false);
    try {
      // Carregar baralhos públicos e caras
      const [fetchedDecks, fetchedFaces] = await Promise.all([
        auth.getPublicDecks(),
        auth.getPublicFaces(),
      ]);

      // Garantir baralhos oficiais como fallback se a tabela remota ainda não tiver registros oficiais
      let combinedDecks = [...fetchedDecks];
      const hasAnyOfficialDeck = combinedDecks.some((d) => d.is_official && !d.is_hidden);

      if (!hasAnyOfficialDeck) {
        // Fallback gracioso: sintetizar baralho oficial com o acervo base
        const fallbackOfficialDeck: SavedDeck = {
          id: 'official_deck_classic',
          user_id: 'admin_official',
          name: 'Tá na Cara! Clássico',
          card_count: 90,
          cards: MOCK_90_CHARACTERS,
          created_at: new Date(2026, 0, 1).toISOString(),
          is_public: true,
          is_official: true,
          author_name: 'Tá na Cara!',
          description: 'Baralho oficial completo com 90 personalidades clássicas.',
        };
        combinedDecks = [fallbackOfficialDeck, ...combinedDecks];
      }

      // Garantir caras oficiais do acervo básico disponíveis
      let combinedFaces = [...fetchedFaces];
      const hasAnyOfficialFace = combinedFaces.some((f) => f.is_official);
      if (!hasAnyOfficialFace) {
        const standardFaces: SavedFace[] = STANDARD_15_CHARACTERS.map((char, idx) => ({
          id: `official_face_${char.id || idx}`,
          user_id: 'admin_official',
          name: char.name,
          image_url: char.imageUrl || '',
          created_at: new Date(2026, 0, 1).toISOString(),
          is_public: true,
          is_official: true,
          author_name: 'Tá na Cara!',
        }));
        combinedFaces = [...standardFaces, ...combinedFaces];
      }

      setAllDecks(combinedDecks);
      setAllFaces(combinedFaces);

      // Carregar salvos do usuário logado
      if (currentUser?.id) {
        const [userDecks, userFaces] = await Promise.all([
          auth.getUserSavedDecks(currentUser.id).catch(() => []),
          auth.getUserSavedFaces(currentUser.id).catch(() => []),
        ]);
        setUserSavedDecks(userDecks);
        setUserSavedFaces(userFaces);
        setSavedFaceUrls(new Set(userFaces.map((f) => f.image_url)));
        setSavedDeckIds(new Set(userDecks.map((d) => d.id)));
      } else {
        setUserSavedDecks([]);
        setUserSavedFaces([]);
        setSavedFaceUrls(new Set());
        setSavedDeckIds(new Set());
      }
    } catch (err) {
      console.error('Erro ao carregar dados da comunidade:', err);
      setNetworkError(true);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  // Reiniciar paginação ao trocar aba, filtro, ordenação ou termo de busca
  useEffect(() => {
    setVisibleCount(ITEMS_PER_BATCH);
  }, [activeTab, sourceFilter, sortOrder, debouncedQuery]);

  // Observer de Rolagem Infinita no elemento sentinela
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + ITEMS_PER_BATCH);
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelRef, activeTab]);

  // Mapeamento de contagem de salvamentos por URL de imagem (fallback cliente para mais salvas)
  const faceSaveCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of allFaces) {
      if (f.image_url) {
        counts.set(f.image_url, (counts.get(f.image_url) || 0) + 1);
      }
    }
    return counts;
  }, [allFaces]);

  // -------------------------------------------------------------
  // FILTRAGEM, NORMALIZAÇÃO E RELEVÂNCIA: CARAS
  // -------------------------------------------------------------
  const filteredFaces = useMemo(() => {
    const query = debouncedQuery.trim();

    return allFaces.filter((face) => {
      // Filtro de Origem
      if (sourceFilter === 'oficiais') {
        if (!face.is_official) return false;
      } else if (sourceFilter === 'comunidade') {
        if (face.is_official) return false;
      } else if (sourceFilter === 'salvos') {
        if (!currentUser) return false;
        const isUserFace =
          face.user_id === currentUser.id || savedFaceUrls.has(face.image_url);
        if (!isUserFace) return false;
      }

      // Filtro de Busca Normalizada
      if (query) {
        const tier = getRelevanceTier(face.name, query);
        if (tier === null) return false;
      }

      return true;
    });
  }, [allFaces, sourceFilter, debouncedQuery, currentUser, savedFaceUrls]);

  // Ordenação de Caras com Relevância em primeiro lugar quando houver busca
  const sortedFaces = useMemo(() => {
    const query = debouncedQuery.trim();
    const list = [...filteredFaces];

    list.sort((a, b) => {
      // 1. Relevância da busca tem precedência absoluta
      if (query) {
        const tierA = getRelevanceTier(a.name, query) ?? 99;
        const tierB = getRelevanceTier(b.name, query) ?? 99;
        if (tierA !== tierB) {
          return tierA - tierB;
        }
      }

      // 2. Oficiais sempre listados primeiro se filtro for "Todos"
      if (sourceFilter === 'todos') {
        const isOffA = a.is_official ? 1 : 0;
        const isOffB = b.is_official ? 1 : 0;
        if (isOffA !== isOffB) {
          return isOffB - isOffA;
        }
      }

      // 3. Desempate pela ordenação selecionada
      if (sortOrder === 'az') {
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      }

      if (sortOrder === 'salvas') {
        const countA = faceSaveCounts.get(a.image_url) || 0;
        const countB = faceSaveCounts.get(b.image_url) || 0;
        if (countA !== countB) {
          return countB - countA;
        }
      }

      // 'recentes' (padrão)
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return list;
  }, [filteredFaces, debouncedQuery, sourceFilter, sortOrder, faceSaveCounts]);

  const visibleFaces = useMemo(() => {
    return sortedFaces.slice(0, visibleCount);
  }, [sortedFaces, visibleCount]);

  // -------------------------------------------------------------
  // FILTRAGEM, NORMALIZAÇÃO E RELEVÂNCIA: BARALHOS
  // -------------------------------------------------------------
  const filteredDecks = useMemo(() => {
    const query = debouncedQuery.trim();

    return allDecks.filter((deck) => {
      if (deck.is_hidden) return false;

      // Filtro de Origem
      if (sourceFilter === 'oficiais') {
        if (!deck.is_official) return false;
      } else if (sourceFilter === 'comunidade') {
        if (deck.is_official) return false;
      } else if (sourceFilter === 'salvos') {
        if (!currentUser) return false;
        const isUserDeck =
          deck.user_id === currentUser.id || savedDeckIds.has(deck.id);
        if (!isUserDeck) return false;
      }

      // Filtro de Busca Normalizada (Aplica-se ao nome e autor)
      if (query) {
        const tier = getDeckRelevanceTier(deck.name, deck.author_name || '', query);
        if (tier === null) return false;
      }

      return true;
    });
  }, [allDecks, sourceFilter, debouncedQuery, currentUser, savedDeckIds]);

  const sortedDecks = useMemo(() => {
    const query = debouncedQuery.trim();
    const list = [...filteredDecks];

    list.sort((a, b) => {
      // 1. Relevância da busca tem precedência absoluta
      if (query) {
        const tierA = getDeckRelevanceTier(a.name, a.author_name || '', query) ?? 99;
        const tierB = getDeckRelevanceTier(b.name, b.author_name || '', query) ?? 99;
        if (tierA !== tierB) {
          return tierA - tierB;
        }
      }

      // 2. Oficiais SEMPRE listados antes dos da comunidade quando filtro for "Todos"
      if (sourceFilter === 'todos') {
        const isOffA = a.is_official ? 1 : 0;
        const isOffB = b.is_official ? 1 : 0;
        if (isOffA !== isOffB) {
          return isOffB - isOffA;
        }
      }

      // 3. Desempate pela ordenação selecionada
      if (sortOrder === 'az') {
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      }

      if (sortOrder === 'salvas') {
        // Ordenação por contagem de cartas ou salvamentos
        const cardsA = a.cards?.length || a.card_count || 0;
        const cardsB = b.cards?.length || b.card_count || 0;
        if (cardsA !== cardsB) {
          return cardsB - cardsA;
        }
      }

      // 'recentes' (padrão)
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return list;
  }, [filteredDecks, debouncedQuery, sourceFilter, sortOrder]);

  const visibleDecks = useMemo(() => {
    return sortedDecks.slice(0, visibleCount);
  }, [sortedDecks, visibleCount]);

  // Set de IDs selecionados para busca O(1)
  const selectedFaceKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const c of selectedCards) {
      if (c.imageUrl) set.add(c.imageUrl);
      if (c.id) set.add(c.id);
    }
    return set;
  }, [selectedCards]);

  // -------------------------------------------------------------
  // AÇÕES: SELEÇÃO DE CARTAS
  // -------------------------------------------------------------
  const handleToggleSelectCard = useCallback((face: SavedFace) => {
    const isCurrentlySelected =
      selectedFaceKeySet.has(face.image_url) || selectedFaceKeySet.has(face.id);

    if (isCurrentlySelected) {
      setSelectedCards((prev) =>
        prev.filter((c) => c.imageUrl !== face.image_url && c.id !== face.id)
      );
    } else {
      if (selectedCards.length >= 90) {
        setToast({
          id: 'max-selected',
          message: 'Máximo de 90 cartas atingido para um baralho.',
        });
        return;
      }

      const newChar: Character = {
        id: face.id,
        name: face.name,
        imageUrl: face.image_url,
      };
      setSelectedCards((prev) => [...prev, newChar]);
    }
  }, [selectedFaceKeySet, selectedCards.length]);

  const handleClearSelection = useCallback(() => {
    prevSelectionRef.current = selectedCards;
    setSelectedCards([]);
    setToast({
      id: 'selection-cleared',
      message: 'Seleção limpa',
      actionLabel: 'Desfazer',
      onAction: () => {
        setSelectedCards(prevSelectionRef.current);
      },
    });
  }, [selectedCards]);

  const handleCompleteSelection = useCallback(() => {
    const goal = computeSelectionGoal(selectedCards.length);
    if (!goal.nextTarget || goal.missingToNext <= 0) return;

    // Buscar cartas do banco ainda não selecionadas
    const unselected = allFaces.filter(
      (f) => !selectedFaceKeySet.has(f.image_url) && !selectedFaceKeySet.has(f.id)
    );

    if (unselected.length === 0) {
      setToast({
        id: 'no-more-cards',
        message: 'Não há mais cartas disponíveis no banco para completar.',
      });
      return;
    }

    // Embaralhar aleatoriamente
    const shuffled = [...unselected].sort(() => 0.5 - Math.random());
    const needed = Math.min(goal.missingToNext, shuffled.length);
    const toAdd: Character[] = shuffled.slice(0, needed).map((f) => ({
      id: f.id,
      name: f.name,
      imageUrl: f.image_url,
    }));

    setSelectedCards((prev) => [...prev, ...toAdd]);
  }, [selectedCards.length, allFaces, selectedFaceKeySet]);

  const handleSelectVisibleCards = useCallback(() => {
    const maxAllowed = 90 - selectedCards.length;
    if (maxAllowed <= 0) return;

    const visibleUnselected = visibleFaces.filter(
      (f) => !selectedFaceKeySet.has(f.image_url) && !selectedFaceKeySet.has(f.id)
    );

    const toAdd = visibleUnselected.slice(0, maxAllowed).map((f) => ({
      id: f.id,
      name: f.name,
      imageUrl: f.image_url,
    }));

    if (toAdd.length > 0) {
      setSelectedCards((prev) => [...prev, ...toAdd]);
    }
  }, [selectedCards.length, visibleFaces, selectedFaceKeySet]);

  // -------------------------------------------------------------
  // AÇÕES: SALVAR E DESSALVAR (COM OTIMISMO, DESFAZER E SEM SOM)
  // -------------------------------------------------------------
  const handleToggleSaveFace = useCallback(async (face: SavedFace) => {
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    const wasSaved = savedFaceUrls.has(face.image_url);

    if (wasSaved) {
      // Otimista: Dessalvar
      setSavedFaceUrls((prev) => {
        const next = new Set(prev);
        next.delete(face.image_url);
        return next;
      });

      try {
        await removeSavedFaceReference(currentUser.id, face.id);
        setUserSavedFaces((prev) => prev.filter((f) => f.image_url !== face.image_url));

        setToast({
          id: `face-unsaved-${face.id}`,
          message: 'Removida dos salvos',
          actionLabel: 'Desfazer',
          onAction: async () => {
            // Reverter remoção
            setSavedFaceUrls((prev) => new Set(prev).add(face.image_url));
            await saveFaceAsReference(currentUser.id, face);
            setUserSavedFaces((prev) => [face, ...prev]);
          },
        });
      } catch (err) {
        // Rollback
        setSavedFaceUrls((prev) => new Set(prev).add(face.image_url));
        setToast({ id: 'save-error', message: 'Erro ao remover dos salvos.' });
      }
    } else {
      // Otimista: Salvar
      setSavedFaceUrls((prev) => new Set(prev).add(face.image_url));

      try {
        await saveFaceAsReference(currentUser.id, face);
        setUserSavedFaces((prev) => [face, ...prev]);

        setToast({
          id: `face-saved-${face.id}`,
          message: 'Salva',
          actionLabel: 'Desfazer',
          onAction: async () => {
            // Desfazer salvamento
            setSavedFaceUrls((prev) => {
              const next = new Set(prev);
              next.delete(face.image_url);
              return next;
            });
            await removeSavedFaceReference(currentUser.id, face.id);
            setUserSavedFaces((prev) => prev.filter((f) => f.image_url !== face.image_url));
          },
        });
      } catch (err) {
        // Rollback
        setSavedFaceUrls((prev) => {
          const next = new Set(prev);
          next.delete(face.image_url);
          return next;
        });
        setToast({ id: 'save-error', message: 'Erro ao salvar cara.' });
      }
    }
  }, [currentUser, savedFaceUrls, userSavedFaces, onOpenLogin]);

  const handleToggleSaveDeck = useCallback(async (deck: SavedDeck) => {
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    const wasSaved = savedDeckIds.has(deck.id);

    if (wasSaved) {
      // Dessalvar
      setSavedDeckIds((prev) => {
        const next = new Set(prev);
        next.delete(deck.id);
        return next;
      });

      try {
        await removeSavedDeckReference(currentUser.id, deck.id);
        setUserSavedDecks((prev) => prev.filter((d) => d.id !== deck.id));

        setToast({
          id: `deck-unsaved-${deck.id}`,
          message: 'Removido dos salvos',
          actionLabel: 'Desfazer',
          onAction: async () => {
            setSavedDeckIds((prev) => new Set(prev).add(deck.id));
            await saveDeckAsReference(currentUser.id, deck);
            setUserSavedDecks((prev) => [deck, ...prev]);
          },
        });
      } catch {
        setSavedDeckIds((prev) => new Set(prev).add(deck.id));
        setToast({ id: 'deck-error', message: 'Erro ao remover baralho.' });
      }
    } else {
      // Salvar
      setSavedDeckIds((prev) => new Set(prev).add(deck.id));

      try {
        await saveDeckAsReference(currentUser.id, deck);
        setUserSavedDecks((prev) => [deck, ...prev]);

        setToast({
          id: `deck-saved-${deck.id}`,
          message: 'Salvo',
          actionLabel: 'Desfazer',
          onAction: async () => {
            setSavedDeckIds((prev) => {
              const next = new Set(prev);
              next.delete(deck.id);
              return next;
            });
            await removeSavedDeckReference(currentUser.id, deck.id);
            setUserSavedDecks((prev) => prev.filter((d) => d.id !== deck.id));
          },
        });
      } catch {
        setSavedDeckIds((prev) => {
          const next = new Set(prev);
          next.delete(deck.id);
          return next;
        });
        setToast({ id: 'deck-error', message: 'Erro ao salvar baralho.' });
      }
    }
  }, [currentUser, savedDeckIds, userSavedDecks, onOpenLogin]);

  // Compartilhar baralho copiando URL
  const handleShareDeck = useCallback((deck: SavedDeck) => {
    const shareUrl = `${window.location.origin}/comunidade/baralho/${deck.id}`;
    navigator.clipboard.writeText(shareUrl);
    setToast({
      id: `share-${deck.id}`,
      message: 'Link copiado para a área de transferência',
    });
  }, []);

  // Visualizar todas as caras do baralho preservando estado da comunidade
  const handleViewDeck = useCallback((deck: SavedDeck) => {
    const deckIds = sortedDecks.map((d) => d.id);
    setDeckContextList(deckIds);

    communityCache.saveState({
      scrollPosition: window.scrollY,
      activeTab,
      sourceFilter,
      sortOrder,
      searchQuery,
      allDecks,
      allFaces,
    });

    if (onViewDeck) {
      onViewDeck(deck);
    }
  }, [sortedDecks, activeTab, sourceFilter, sortOrder, searchQuery, allDecks, allFaces, onViewDeck]);

  // Criação de Baralho a partir do Modal
  const handleConfirmCreateDeck = useCallback(async (name: string, isPublic: boolean) => {
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    if (userSavedDecks.length >= 10) {
      setCreateDeckModalOpen(false);
      setLimitModalType('deck');
      return;
    }

    const created = await auth.saveDeck(
      currentUser.id,
      name,
      selectedCards.length,
      selectedCards,
      isPublic,
      currentUser.username
    );

    setUserSavedDecks((prev) => [created, ...prev]);
    setAllDecks((prev) => [created, ...prev]);
    setSelectedCards([]);
    sessionStorage.removeItem(SESSION_SELECTION_KEY);
    setCreateDeckModalOpen(false);

    setToast({
      id: 'deck-created',
      message: 'Baralho criado com sucesso!',
      actionLabel: 'Ver no perfil',
      onAction: onGoToProfile,
    });
  }, [currentUser, userSavedDecks.length, selectedCards, onOpenLogin, onGoToProfile]);

  const hasVisibleUnselected = useMemo(() => {
    if (activeTab !== 'faces') return false;
    return visibleFaces.some(
      (f) => !selectedFaceKeySet.has(f.image_url) && !selectedFaceKeySet.has(f.id)
    );
  }, [activeTab, visibleFaces, selectedFaceKeySet]);

  return (
    <div className={`w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 font-sans text-[#2B2420] transition-all duration-150 ${
      selectedCards.length > 0 ? 'pb-28 sm:pb-24' : 'pb-12'
    }`}>
      {/* 1. Navegação de Retorno Condicional (Seta simples sem texto apenas se estiver no fluxo de partida) */}
      {isConfiguring && (
        <div className="mb-4">
          <button
            type="button"
            onClick={onBackToHome}
            aria-label="Voltar para a configuração de partida"
            title="Voltar"
            className="w-11 h-11 flex items-center justify-center rounded-[6px] text-[#6F655C] hover:text-[#2B2420] hover:bg-[#2B2420]/5 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420]"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      )}

      {/* 2. Topo da Página: Título Serifado e Superfície Única */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-[#2B2420] font-normal tracking-tight">
          Comunidade
        </h1>
        <p className="text-xs sm:text-sm font-sans text-[#6F655C] mt-1">
          Baralhos e personagens prontos para jogar
        </p>
      </div>

      {/* 3. Linha das Abas de Texto e Campo de Busca Contextual */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 border-b border-[#E2DACD] pb-3 mb-4">
        {/* Abas com Sublinhado no Item Ativo */}
        <div className="flex items-center gap-6" role="tablist" aria-label="Abas da comunidade">
          <button
            type="button"
            role="tab"
            id="tab-baralhos"
            aria-selected={activeTab === 'decks'}
            aria-controls="panel-baralhos"
            onClick={() => setActiveTab('decks')}
            className={`pb-2 text-sm font-sans transition-colors cursor-pointer relative outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] rounded-[2px] ${
              activeTab === 'decks'
                ? 'text-[#2B2420] font-semibold'
                : 'text-[#6F655C] hover:text-[#2B2420] font-normal'
            }`}
          >
            <span>Baralhos</span>
            {activeTab === 'decks' && (
              <div className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-[#2B2420]" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            id="tab-caras"
            aria-selected={activeTab === 'faces'}
            aria-controls="panel-caras"
            onClick={() => setActiveTab('faces')}
            className={`pb-2 text-sm font-sans transition-colors cursor-pointer relative outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] rounded-[2px] ${
              activeTab === 'faces'
                ? 'text-[#2B2420] font-semibold'
                : 'text-[#6F655C] hover:text-[#2B2420] font-normal'
            }`}
          >
            <span>Caras</span>
            {activeTab === 'faces' && (
              <div className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-[#2B2420]" />
            )}
          </button>
        </div>

        {/* Campo de Busca (Apenas Linha Inferior, Lupa Pequena, Atalhos "/" e Esc) */}
        <div className="relative w-full sm:w-64 md:w-80">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-0 text-[#A39A90] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'decks' ? 'Buscar baralhos' : 'Buscar caras'}
              aria-label={activeTab === 'decks' ? 'Buscar baralhos por nome ou autor' : 'Buscar caras por nome'}
              className="w-full pl-6 pr-6 pb-1 pt-0.5 bg-transparent border-0 border-b border-[#E2DACD] focus:border-[#2B2420] text-xs font-sans text-[#2B2420] placeholder-[#A39A90] outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca"
                className="absolute right-0 text-[#A39A90] hover:text-[#2B2420] p-1 cursor-pointer transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Linha de Controles em Texto: Filtro de Origem à Esquerda e Ordenação à Direita */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-sans text-[#6F655C] mb-6">
        {/* Filtro de Origem: Todos · Oficiais · Da comunidade · Salvos */}
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filtro de origem">
          <button
            type="button"
            onClick={() => setSourceFilter('todos')}
            className={`cursor-pointer transition-colors ${
              sourceFilter === 'todos' ? 'text-[#2B2420] font-semibold' : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Todos
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setSourceFilter('oficiais')}
            className={`cursor-pointer transition-colors ${
              sourceFilter === 'oficiais' ? 'text-[#2B2420] font-semibold' : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Oficiais
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setSourceFilter('comunidade')}
            className={`cursor-pointer transition-colors ${
              sourceFilter === 'comunidade' ? 'text-[#2B2420] font-semibold' : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Da comunidade
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setSourceFilter('salvos')}
            className={`cursor-pointer transition-colors ${
              sourceFilter === 'salvos' ? 'text-[#2B2420] font-semibold' : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Salvos
          </button>
        </div>

        {/* Menu de Ordenação: Mais recentes · Mais salvas · A–Z */}
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Critério de ordenação">
          <span className="text-[#A39A90]">Ordenar:</span>
          <button
            type="button"
            onClick={() => setSortOrder('recentes')}
            className={`cursor-pointer transition-colors ${
              sortOrder === 'recentes' ? 'text-[#2B2420] font-semibold' : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Mais recentes
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setSortOrder('salvas')}
            className={`cursor-pointer transition-colors ${
              sortOrder === 'salvas' ? 'text-[#2B2420] font-semibold' : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Mais salvas
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setSortOrder('az')}
            className={`cursor-pointer transition-colors ${
              sortOrder === 'az' ? 'text-[#2B2420] font-semibold' : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            A–Z
          </button>
        </div>
      </div>

      {/* 5. Estado de Erro de Rede */}
      {networkError && (
        <div className="py-12 text-center text-xs font-sans text-[#8C2E2A]">
          <p className="mb-2">Não foi possível carregar os itens no momento.</p>
          <button
            type="button"
            onClick={loadCommunityData}
            className="text-xs text-[#2B2420] underline font-medium cursor-pointer"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {/* 6. CONTEÚDO DA ABA BARALHOS */}
      {activeTab === 'decks' && !networkError && (
        <div id="panel-baralhos" role="tabpanel" aria-labelledby="tab-baralhos">
          {/* Estado de Carregamento Inicial */}
          {loading && allDecks.length === 0 ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="py-4 border-b border-[#E2DACD] flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-[#E2DACD]/40 rounded-[4px] animate-pulse" />
                    <div className="h-3 w-28 bg-[#E2DACD]/30 rounded-[4px] animate-pulse" />
                  </div>
                  <div className="h-8 w-24 bg-[#E2DACD]/30 rounded-[6px] animate-pulse" />
                </div>
              ))}
            </div>
          ) : visibleDecks.length === 0 ? (
            /* Estado Vazio */
            <div className="py-16 text-center text-xs font-sans text-[#6F655C]">
              {sourceFilter === 'salvos' && !currentUser ? (
                <div>
                  <p className="mb-2">Faça login para visualizar seus baralhos salvos.</p>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="text-xs text-[#2B2420] underline font-medium cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              ) : debouncedQuery ? (
                <div>
                  <p className="mb-2">Nenhum baralho com "{debouncedQuery}".</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#2B2420] underline font-medium cursor-pointer"
                  >
                    Limpar busca
                  </button>
                </div>
              ) : sourceFilter === 'salvos' ? (
                <p>Você ainda não salvou nenhum baralho no seu perfil.</p>
              ) : (
                <p>Nenhum baralho encontrado para os filtros selecionados.</p>
              )}
            </div>
          ) : (
            /* Lista de Baralhos em LINHAS */
            <div className="divide-y divide-[#E2DACD]">
              {visibleDecks.map((deck) => (
                <CommunityDeckRow
                  key={deck.id}
                  deck={deck}
                  isSaved={savedDeckIds.has(deck.id)}
                  isConfiguring={isConfiguring}
                  searchQuery={debouncedQuery}
                  onPlayDeck={onPlayDeck}
                  onViewDeck={handleViewDeck}
                  onToggleSaveDeck={handleToggleSaveDeck}
                  onShareDeck={handleShareDeck}
                  onReportDeck={(targetDeck) =>
                    setReportTarget({
                      type: 'deck',
                      id: targetDeck.id,
                      name: targetDeck.name,
                      authorName: targetDeck.author_name,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. CONTEÚDO DA ABA CARAS */}
      {activeTab === 'faces' && !networkError && (
        <div id="panel-caras" role="tabpanel" aria-labelledby="tab-caras">
          {/* Estado de Carregamento Inicial */}
          {loading && allFaces.length === 0 ? (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6 py-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-full aspect-square rounded-[12px] bg-[#E2DACD]/30 animate-pulse" />
                  <div className="h-3 w-16 bg-[#E2DACD]/40 rounded-[4px] mt-2 animate-pulse" />
                </div>
              ))}
            </div>
          ) : visibleFaces.length === 0 ? (
            /* Estado Vazio */
            <div className="py-16 text-center text-xs font-sans text-[#6F655C]">
              {sourceFilter === 'salvos' && !currentUser ? (
                <div>
                  <p className="mb-2">Faça login para visualizar suas cartas salvas.</p>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="text-xs text-[#2B2420] underline font-medium cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              ) : debouncedQuery ? (
                <div>
                  <p className="mb-2">Nenhuma cara com "{debouncedQuery}".</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#2B2420] underline font-medium cursor-pointer"
                  >
                    Limpar busca
                  </button>
                </div>
              ) : sourceFilter === 'salvos' ? (
                <p>Você ainda não salvou nenhuma cara no seu perfil.</p>
              ) : (
                <p>Nenhuma cara encontrada para os filtros selecionados.</p>
              )}
            </div>
          ) : (
            /* Grade Responsiva de Cartas de Personagem */
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6">
              {visibleFaces.map((face) => {
                const isSelected =
                  selectedFaceKeySet.has(face.image_url) || selectedFaceKeySet.has(face.id);
                const isSaved = savedFaceUrls.has(face.image_url);

                return (
                  <CommunityFaceCard
                    key={face.id}
                    face={face}
                    isSelected={isSelected}
                    isSaved={isSaved}
                    searchQuery={debouncedQuery}
                    onToggleSelect={handleToggleSelectCard}
                    onToggleSave={handleToggleSaveFace}
                    onOpenPreview={(targetFace, triggerEl) => {
                      setPreviewFace(targetFace);
                      setPreviewTriggerEl(triggerEl || null);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 8. Sentinela de Rolagem Infinita (Silencioso no Fim) */}
      <div ref={sentinelRef} className="h-10 w-full" aria-hidden="true" />

      {/* 9. Barra Fixa de Seleção no Rodapé */}
      <CommunitySelectionBar
        selectedCount={selectedCards.length}
        hasVisibleUnselected={hasVisibleUnselected}
        onClear={handleClearSelection}
        onComplete={handleCompleteSelection}
        onSelectVisible={handleSelectVisibleCards}
        onCreateDeck={() => {
          if (!currentUser) {
            onOpenLogin();
            return;
          }
          setCreateDeckModalOpen(true);
        }}
      />

      {/* 10. Modal de Criação de Baralho */}
      <CreateDeckModal
        isOpen={createDeckModalOpen}
        cardCount={selectedCards.length}
        onClose={() => setCreateDeckModalOpen(false)}
        onConfirm={handleConfirmCreateDeck}
      />

      {/* 11. Modal de Pré-visualização Ampliada da Carta */}
      <FacePreviewModal
        face={previewFace}
        isOpen={Boolean(previewFace)}
        isSelected={
          previewFace
            ? selectedFaceKeySet.has(previewFace.image_url) || selectedFaceKeySet.has(previewFace.id)
            : false
        }
        isSaved={previewFace ? savedFaceUrls.has(previewFace.image_url) : false}
        triggerElement={previewTriggerEl}
        onClose={() => setPreviewFace(null)}
        onToggleSelect={() => {
          if (previewFace) handleToggleSelectCard(previewFace);
        }}
        onToggleSave={() => {
          if (previewFace) handleToggleSaveFace(previewFace);
        }}
        onReport={() => {
          if (previewFace) {
            setReportTarget({
              type: 'face',
              id: previewFace.id,
              name: previewFace.name,
              authorName: previewFace.author_name,
            });
            setPreviewFace(null);
          }
        }}
      />

      {/* 12. Modal de Denúncia (Reutilizado com design limpo) */}
      <ReportModal
        isOpen={reportTarget !== null}
        item={reportTarget}
        currentUser={currentUser}
        onClose={() => {
          setReportTarget(null);
          setToast({
            id: 'report-submitted',
            message: 'Denúncia enviada',
          });
        }}
      />

      {/* 13. Modal de Limites Atingidos */}
      <AccountLimitModal
        isOpen={limitModalType !== null}
        type={limitModalType || 'deck'}
        onClose={() => setLimitModalType(null)}
        onGoToProfile={onGoToProfile}
      />

      {/* 14. Sistema de Toast com Desfazer */}
      <CommunityToast
        toast={toast}
        hasSelectionBar={selectedCards.length > 0}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

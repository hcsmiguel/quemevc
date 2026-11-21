import { useState, useEffect, useMemo, useCallback, type FC } from 'react';
import {
  ArrowLeft,
  Search,
  Share2,
  Plus,
  AlertTriangle,
  Check,
  RotateCcw,
  Eye,
  Wand2,
} from 'lucide-react';
import {
  auth,
  type AppUser,
  type UserStats,
  type SavedDeck,
  type SavedFace,
} from '../services/auth';
import type { Character } from '../types/game';
import { sounds } from '../utils/sound';
import { network } from '../services/network';
import { normalizeText } from '../utils/communitySearch';
import {
  TAMANHO_MINIMO_BARALHO,
  TAMANHO_MAXIMO_BARALHO,
  isDeckSizeValid,
} from '../constants/deck';
import {
  getProfileFaces,
  getProfileDecks,
  saveFaceAsReference,
  removeSavedFaceReference,
  saveDeckAsReference,
  removeSavedDeckReference,
  checkAntiDuplicate,
  countOtherDecksUsingFace,
  replaceRemovedFaceInDeck,
  type ProfileFaceItem,
  type ProfileDeckItem,
} from '../services/dataAdapter';
import { CaraLegenda } from './community/CaraLegenda';
import { ActionMenu } from './community/ActionMenu';
import { FacePreviewModal } from './community/FacePreviewModal';
import { CommunityToast, type ToastData } from './community/CommunityToast';
import { ReportModal, type ReportItemTarget } from './ReportModal';
import { ImageCropperModal } from './ImageCropperModal';
import { CreateDeckModal } from './community/CreateDeckModal';
import { Button } from './ui/Button';
import { Tabs } from './ui/Tabs';

interface ProfilePageProps {
  currentUser: AppUser;
  onBackToLobby: () => void;
  onPlayDeck: (deck: SavedDeck) => void;
  onViewDeck?: (deck: SavedDeck) => void;
  onEditDeck: (deck: SavedDeck) => void;
  onCreateNewDeck: () => void;
  onReconnectMatch?: (session: any) => void;
}

export const ProfilePage: FC<ProfilePageProps> = ({
  currentUser,
  onBackToLobby,
  onPlayDeck,
  onViewDeck,
  onEditDeck,
  onCreateNewDeck,
  onReconnectMatch,
}) => {
  // --------------------------------------------------------------------------
  // 1. ESTADO E QUERY PARAMS (Isolados na rota /perfil, sem vazar 'origem')
  // --------------------------------------------------------------------------
  const getInitialParams = () => {
    const params = new URLSearchParams(window.location.search);
    const rawAba = params.get('aba');
    let tab: 'decks' | 'faces' | 'stats' = 'decks';
    if (rawAba === 'caras' || rawAba === 'faces') tab = 'faces';
    else if (rawAba === 'historico' || rawAba === 'stats') tab = 'stats';

    const rawFiltro = params.get('filtro');
    let fFaces: 'all' | 'mine' | 'saved' = 'all';
    if (rawFiltro === 'minhas') fFaces = 'mine';
    else if (rawFiltro === 'salvas') fFaces = 'saved';

    let fDecks: 'all' | 'mine' | 'saved' = 'all';
    if (rawFiltro === 'meus') fDecks = 'mine';
    else if (rawFiltro === 'salvos') fDecks = 'saved';

    const rawOrdem = params.get('ordem');
    const sort: 'recent' | 'az' = rawOrdem === 'az' ? 'az' : 'recent';
    const q = params.get('q') || '';

    return { tab, fFaces, fDecks, sort, q };
  };

  const initialParams = getInitialParams();
  const [activeTab, setActiveTab] = useState<'decks' | 'faces' | 'stats'>(initialParams.tab);
  const [facesFilter, setFacesFilter] = useState<'all' | 'mine' | 'saved'>(initialParams.fFaces);
  const [decksFilter, setDecksFilter] = useState<'all' | 'mine' | 'saved'>(initialParams.fDecks);
  const [facesSort, setFacesSort] = useState<'recent' | 'az'>(initialParams.sort);
  const [decksSort, setDecksSort] = useState<'recent' | 'az'>(initialParams.sort);
  const [searchQuery, setSearchQuery] = useState(initialParams.q);

  // Sincronizar URL dinamicamente com os parâmetros próprios do Perfil
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab === 'faces') params.set('aba', 'caras');
    else if (activeTab === 'stats') params.set('aba', 'historico');
    else params.set('aba', 'baralhos');

    if (activeTab === 'faces') {
      if (facesFilter !== 'all') params.set('filtro', facesFilter === 'mine' ? 'minhas' : 'salvas');
      if (facesSort !== 'recent') params.set('ordem', facesSort);
    } else if (activeTab === 'decks') {
      if (decksFilter !== 'all') params.set('filtro', decksFilter === 'mine' ? 'meus' : 'salvos');
      if (decksSort !== 'recent') params.set('ordem', decksSort);
    }

    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const newUrl = `${window.location.pathname}${queryStr}`;
    window.history.replaceState({ path: '/perfil' }, '', newUrl);
  }, [activeTab, facesFilter, decksFilter, facesSort, decksSort, searchQuery]);

  // --------------------------------------------------------------------------
  // 2. DADOS DO USUÁRIO E CARREGAMENTO
  // --------------------------------------------------------------------------
  const [stats, setStats] = useState<UserStats | null>(null);
  const [faces, setFaces] = useState<ProfileFaceItem[]>([]);
  const [decks, setDecks] = useState<ProfileDeckItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [uStats, uFaces, uDecks] = await Promise.all([
        auth.getUserStats(currentUser.id),
        getProfileFaces(currentUser.id, currentUser.username),
        getProfileDecks(currentUser.id, currentUser.username),
      ]);
      setStats(uStats);
      setFaces(uFaces);
      setDecks(uDecks);
    } catch (err) {
      console.warn('Erro ao carregar dados do perfil:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Contadores de limite
  const myFacesCount = useMemo(() => faces.filter((f) => f.origin === 'own').length, [faces]);
  const myDecksCount = useMemo(() => decks.filter((d) => d.origin === 'own').length, [decks]);

  // --------------------------------------------------------------------------
  // 3. RECONEXÃO DE PARTIDA EM ANDAMENTO
  // --------------------------------------------------------------------------
  const [reconnectSession, setReconnectSession] = useState<any>(null);
  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState<number>(0);

  useEffect(() => {
    const checkSession = () => {
      try {
        const raw = localStorage.getItem('cara_reconnect_session') || localStorage.getItem('cara_active_session');
        if (!raw) {
          setReconnectSession(null);
          return;
        }
        const session = JSON.parse(raw);
        if (!session.roomCode || session.phase === 'LOBBY') {
          setReconnectSession(null);
          return;
        }
        const expiresAt = session.expiresAt || (session.disconnectedAt ? session.disconnectedAt + 180000 : Date.now() + 180000);
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        if (remaining > 0) {
          setReconnectSession({ ...session, expiresAt });
          setReconnectSecondsLeft(remaining);
        } else {
          localStorage.removeItem('cara_reconnect_session');
          setReconnectSession(null);
          if (session.roomCode) network.finishRoom(session.roomCode);
        }
      } catch {
        setReconnectSession(null);
      }
    };
    checkSession();
    const timer = setInterval(() => {
      setReconnectSecondsLeft((prev) => {
        if (prev <= 1) {
          checkSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDismissReconnect = () => {
    sounds.playClick();
    if (reconnectSession?.roomCode) network.finishRoom(reconnectSession.roomCode);
    localStorage.removeItem('cara_reconnect_session');
    localStorage.removeItem('cara_active_session');
    setReconnectSession(null);
  };

  // --------------------------------------------------------------------------
  // 4. TOAST E MODAIS DE SUPORTE
  // --------------------------------------------------------------------------
  const [toast, setToast] = useState<ToastData | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportItemTarget | null>(null);
  const [previewFace, setPreviewFace] = useState<ProfileFaceItem | null>(null);
  const [previewTriggerEl, setPreviewTriggerEl] = useState<HTMLElement | null>(null);

  // Modais de Conta
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Modal para Adicionar Cara e Diálogos Anti-duplicata
  const [isAddingFace, setIsAddingFace] = useState(false);
  const [droppedInitialImage, setDroppedInitialImage] = useState<string | null>(null);
  const [duplicateDialog, setDuplicateDialog] = useState<{
    type: 'exact_hash' | 'similar_name';
    match: SavedFace;
    newChar?: Character;
  } | null>(null);

  // Modal de Confirmação de Exclusão de Cara (com impacto em baralhos)
  const [faceToDelete, setFaceToDelete] = useState<{
    face: ProfileFaceItem;
    otherDecksCount: number;
  } | null>(null);

  // Modal de Criação de Baralho a partir da seleção
  const [createDeckModalOpen, setCreateDeckModalOpen] = useState(false);

  // --------------------------------------------------------------------------
  // 5. SELEÇÃO DE CARAS POR TOQUE (ABA CARAS)
  // --------------------------------------------------------------------------
  const [selectedFaceIds, setSelectedFaceIds] = useState<Set<string>>(new Set());

  const handleToggleSelectFace = (face: ProfileFaceItem) => {
    if (face.status === 'unavailable') {
      setToast({
        id: `unavail-${face.id}`,
        message: 'Cara indisponível: não pode ser incluída em novos baralhos.',
      });
      return;
    }
    sounds.playClick();
    setSelectedFaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(face.id)) next.delete(face.id);
      else next.add(face.id);
      return next;
    });
  };

  const handleClearSelection = () => {
    sounds.playClick();
    setSelectedFaceIds(new Set());
  };

  // Composição da seleção
  const selectedFacesList = useMemo(() => {
    return faces.filter((f) => selectedFaceIds.has(f.id));
  }, [faces, selectedFaceIds]);

  const selectedStats = useMemo(() => {
    let mine = 0;
    let saved = 0;
    let privateCount = 0;
    for (const f of selectedFacesList) {
      if (f.origin === 'own') {
        mine++;
        if (!f.isPublic) privateCount++;
      } else {
        saved++;
      }
    }
    return {
      total: selectedFacesList.length,
      mine,
      saved,
      privateCount,
      isHomogeneousMine: mine > 0 && saved === 0,
      isHomogeneousSaved: saved > 0 && mine === 0,
    };
  }, [selectedFacesList]);

  const isValidDeckSize = (count: number): boolean => {
    return isDeckSizeValid(count);
  };

  // --------------------------------------------------------------------------
  // 6. AÇÕES EM LOTE E INDIVIDUAIS DE CARAS
  // --------------------------------------------------------------------------
  // Tornar Privada / Pública
  const handleToggleFaceVisibility = async (face: ProfileFaceItem) => {
    sounds.playClick();
    const nextPublic = !face.isPublic;

    if (nextPublic) {
      // Checar anti-duplicata
      const { exactHashMatch, similarNameMatch } = await checkAntiDuplicate(face.name, face.contentHash);
      if (exactHashMatch && exactHashMatch.id !== face.id) {
        setDuplicateDialog({ type: 'exact_hash', match: exactHashMatch });
        return;
      }
      if (similarNameMatch && similarNameMatch.id !== face.id) {
        setDuplicateDialog({ type: 'similar_name', match: similarNameMatch });
        return;
      }
    }

    try {
      await auth.toggleFacePublic(face.id, currentUser.id, nextPublic);
      setFaces((prev) =>
        prev.map((f) => (f.id === face.id ? { ...f, isPublic: nextPublic } : f))
      );
      setToast({
        id: `face-vis-${face.id}`,
        message: nextPublic ? 'Cara publicada na comunidade.' : 'Cara tornada privada.',
        actionLabel: 'Desfazer',
        onAction: async () => {
          await auth.toggleFacePublic(face.id, currentUser.id, !nextPublic);
          setFaces((prev) =>
            prev.map((f) => (f.id === face.id ? { ...f, isPublic: !nextPublic } : f))
          );
        },
      });
    } catch {
      sounds.playWrong();
    }
  };

  // Remover dos salvos (individual)
  const handleRemoveFaceFromSaved = async (faceId: string, faceName: string) => {
    sounds.playClick();
    const removedFace = faces.find((f) => f.id === faceId);
    await removeSavedFaceReference(currentUser.id, faceId);
    setFaces((prev) => prev.filter((f) => f.id !== faceId));
    setSelectedFaceIds((prev) => {
      const next = new Set(prev);
      next.delete(faceId);
      return next;
    });

    setToast({
      id: `face-rem-${faceId}`,
      message: `${faceName} removida dos seus salvos.`,
      actionLabel: 'Desfazer',
      onAction: async () => {
        if (removedFace) {
          await saveFaceAsReference(currentUser.id, removedFace);
          setFaces((prev) => [removedFace, ...prev]);
        }
      },
    });
  };

  // Excluir cara própria (inicia modal com impacto em outros baralhos)
  const handlePromptDeleteFace = async (face: ProfileFaceItem) => {
    sounds.playClick();
    const otherDecks = await countOtherDecksUsingFace(face.id, currentUser.id);
    setFaceToDelete({ face, otherDecksCount: otherDecks });
  };

  const handleConfirmDeleteFace = async () => {
    if (!faceToDelete) return;
    const { face } = faceToDelete;
    sounds.playClick();
    try {
      await auth.deleteSavedFace(face.id, currentUser.id);
      setFaces((prev) => prev.filter((f) => f.id !== face.id));
      setSelectedFaceIds((prev) => {
        const next = new Set(prev);
        next.delete(face.id);
        return next;
      });
      setToast({
        id: `del-face-${face.id}`,
        message: `"${face.name}" excluída. Baralhos que a continham foram atualizados.`,
      });
    } catch {
      sounds.playWrong();
    } finally {
      setFaceToDelete(null);
    }
  };

  // Ações em lote da barra de seleção
  const handleBatchMakePrivate = async (makePrivate: boolean) => {
    sounds.playClick();
    const targetIds = selectedFacesList.filter((f) => f.origin === 'own').map((f) => f.id);
    if (targetIds.length === 0) return;

    for (const id of targetIds) {
      await auth.toggleFacePublic(id, currentUser.id, !makePrivate);
    }

    setFaces((prev) =>
      prev.map((f) => (targetIds.includes(f.id) ? { ...f, isPublic: !makePrivate } : f))
    );
    setSelectedFaceIds(new Set());

    setToast({
      id: `batch-vis-${Date.now()}`,
      message: `${targetIds.length} ${targetIds.length === 1 ? 'cara alterada' : 'caras alteradas'}.`,
      actionLabel: 'Desfazer',
      onAction: async () => {
        for (const id of targetIds) {
          await auth.toggleFacePublic(id, currentUser.id, makePrivate);
        }
        setFaces((prev) =>
          prev.map((f) => (targetIds.includes(f.id) ? { ...f, isPublic: makePrivate } : f))
        );
      },
    });
  };

  const handleBatchRemoveSaved = async () => {
    sounds.playClick();
    const targetFaces = selectedFacesList.filter((f) => f.origin !== 'own');
    if (targetFaces.length === 0) return;

    for (const f of targetFaces) {
      await removeSavedFaceReference(currentUser.id, f.id);
    }

    const targetIds = targetFaces.map((f) => f.id);
    setFaces((prev) => prev.filter((f) => !targetIds.includes(f.id)));
    setSelectedFaceIds(new Set());

    setToast({
      id: `batch-rem-${Date.now()}`,
      message: `${targetFaces.length} ${targetFaces.length === 1 ? 'cara removida' : 'caras removidas'} dos salvos.`,
      actionLabel: 'Desfazer',
      onAction: async () => {
        for (const f of targetFaces) {
          await saveFaceAsReference(currentUser.id, f);
        }
        setFaces((prev) => [...targetFaces, ...prev]);
      },
    });
  };

  const handleBatchDeleteMine = async () => {
    sounds.playClick();
    const mineFaces = selectedFacesList.filter((f) => f.origin === 'own');
    if (mineFaces.length === 0) return;

    if (!window.confirm(`Tem certeza que deseja excluir ${mineFaces.length} ${mineFaces.length === 1 ? 'cara' : 'caras'}? Esta ação é definitiva.`)) {
      return;
    }

    for (const f of mineFaces) {
      await auth.deleteSavedFace(f.id, currentUser.id);
    }

    const mineIds = mineFaces.map((f) => f.id);
    setFaces((prev) => prev.filter((f) => !mineIds.includes(f.id)));
    setSelectedFaceIds(new Set());

    setToast({
      id: `batch-del-${Date.now()}`,
      message: `${mineFaces.length} ${mineFaces.length === 1 ? 'cara excluída' : 'caras excluídas'}.`,
    });
  };

  // --------------------------------------------------------------------------
  // 7. UPLOAD DE CARA, COLA (CTRL+V) E ARRASTAR
  // --------------------------------------------------------------------------
  const handleOpenAddFace = () => {
    if (myFacesCount >= 360) {
      setToast({
        id: 'limit-360',
        message: 'Você atingiu o limite de 360 caras enviadas. Exclua alguma para adicionar novas.',
      });
      return;
    }
    setDroppedInitialImage(null);
    setIsAddingFace(true);
  };

  // Suporte a colar (Ctrl+V) imagem da área de transferência
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== 'faces' || isAddingFace) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) {
                setDroppedInitialImage(ev.target.result as string);
                setIsAddingFace(true);
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab, isAddingFace]);

  const handleSaveBatchFaces = (
    savedBatch: Array<{ id: string; name: string; imageUrl: string; isExistingReference?: boolean }>
  ) => {
    setIsAddingFace(false);
    if (!savedBatch || savedBatch.length === 0) return;

    const newProfileFaces: ProfileFaceItem[] = savedBatch.map((f) => ({
      id: f.id,
      name: f.name,
      imageUrl: f.imageUrl,
      authorName: currentUser.username,
      isPublic: false,
      origin: f.isExistingReference ? 'saved' : 'own',
      status: 'private',
      createdAt: new Date().toISOString(),
    }));

    setFaces((prev) => [...newProfileFaces, ...prev]);

    setToast({
      id: `batch-saved-${Date.now()}`,
      message:
        savedBatch.length === 1
          ? `"${savedBatch[0].name}" adicionada ao seu banco de caras.`
          : `${savedBatch.length} caras adicionadas ao seu banco de caras.`,
    });
  };

  const handleSaveCroppedFace = async (newChar: Character) => {
    setIsAddingFace(false);

    // Checagem anti-duplicata no cliente
    const { exactHashMatch, similarNameMatch } = await checkAntiDuplicate(
      newChar.name,
      (newChar as any).contentHash
    );

    if (exactHashMatch) {
      // Mesma imagem já existe na comunidade!
      setDuplicateDialog({
        type: 'exact_hash',
        match: exactHashMatch,
        newChar,
      });
      return;
    }

    if (similarNameMatch) {
      // Nome parecido
      setDuplicateDialog({
        type: 'similar_name',
        match: similarNameMatch,
        newChar,
      });
      return;
    }

    // Salvar cara normalmente
    try {
      const saved = await auth.saveFace(currentUser.id, newChar.name, newChar.imageUrl || '', false, currentUser.username);
      setFaces((prev) => [
        {
          id: saved.id,
          name: saved.name,
          imageUrl: saved.image_url,
          authorName: currentUser.username,
          isPublic: false,
          origin: 'own',
          status: 'private',
          createdAt: saved.created_at,
        },
        ...prev,
      ]);
      setToast({
        id: `face-saved-${saved.id}`,
        message: `"${saved.name}" adicionada ao seu banco de caras.`,
      });
    } catch (err: any) {
      setToast({
        id: 'err-save-face',
        message: err?.message || 'Erro ao salvar cara.',
      });
    }
  };

  // --------------------------------------------------------------------------
  // 8. BARALHOS: AÇÕES, ESTADO "PRECISA DE AJUSTE" E JOGAR
  // --------------------------------------------------------------------------
  const handleToggleDeckPublic = async (deck: ProfileDeckItem) => {
    sounds.playClick();
    const nextPublic = !deck.isPublic;
    try {
      await auth.toggleDeckPublic(deck.id, currentUser.id, nextPublic);
      setDecks((prev) =>
        prev.map((d) => (d.id === deck.id ? { ...d, isPublic: nextPublic } : d))
      );
      setToast({
        id: `deck-vis-${deck.id}`,
        message: nextPublic ? 'Baralho publicado na comunidade.' : 'Baralho tornado privado.',
        actionLabel: 'Desfazer',
        onAction: async () => {
          await auth.toggleDeckPublic(deck.id, currentUser.id, !nextPublic);
          setDecks((prev) =>
            prev.map((d) => (d.id === deck.id ? { ...d, isPublic: !nextPublic } : d))
          );
        },
      });
    } catch {
      sounds.playWrong();
    }
  };

  const handleDeleteDeck = async (deckId: string, deckName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o baralho "${deckName}"?`)) return;
    sounds.playClick();
    try {
      await auth.deleteSavedDeck(deckId, currentUser.id);
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
      setToast({
        id: `deck-del-${deckId}`,
        message: `Baralho "${deckName}" excluído.`,
      });
    } catch {
      sounds.playWrong();
    }
  };

  const handleRemoveDeckFromSaved = async (deckId: string, deckName: string) => {
    sounds.playClick();
    const removedDeck = decks.find((d) => d.id === deckId);
    await removeSavedDeckReference(currentUser.id, deckId);
    setDecks((prev) => prev.filter((d) => d.id !== deckId));

    setToast({
      id: `deck-rem-${deckId}`,
      message: `"${deckName}" removido dos seus salvos.`,
      actionLabel: 'Desfazer',
      onAction: async () => {
        if (removedDeck) {
          await saveDeckAsReference(currentUser.id, removedDeck);
          setDecks((prev) => [removedDeck, ...prev]);
        }
      },
    });
  };

  const handleShareDeck = async (deckId: string) => {
    sounds.playClick();
    const shareUrl = `${window.location.origin}/comunidade/baralho/${deckId}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setToast({
          id: `share-${deckId}`,
          message: 'Link do baralho copiado!',
        });
      }
    } catch {
      setToast({
        id: `share-${deckId}`,
        message: `Link: ${shareUrl}`,
      });
    }
  };

  // Substituir cara removida em baralho (em um toque)
  const handleAutoReplaceRemovedFaces = async (deck: ProfileDeckItem) => {
    sounds.playClick();
    // Lista de caras candidatas disponíveis
    const available = faces
      .filter((f) => f.status === 'active')
      .map((f) => ({ id: f.id, name: f.name, imageUrl: f.imageUrl }));

    const updatedCards = await replaceRemovedFaceInDeck(
      deck.id,
      currentUser.id,
      deck.cards,
      available
    );

    setDecks((prev) =>
      prev.map((d) =>
        d.id === deck.id
          ? {
              ...d,
              cards: updatedCards,
              hasRemovedFaces: false,
              status: 'active',
            }
          : d
      )
    );

    setToast({
      id: `fixed-${deck.id}`,
      message: 'Cartas removidas foram substituídas por novas caras aleatórias.',
    });
  };

  // --------------------------------------------------------------------------
  // 9. FILTRAGEM E ORDENAÇÃO
  // --------------------------------------------------------------------------
  const normalizedQuery = useMemo(() => normalizeText(searchQuery), [searchQuery]);

  const filteredFaces = useMemo(() => {
    return faces
      .filter((face) => {
        if (facesFilter === 'mine' && face.origin !== 'own') return false;
        if (facesFilter === 'saved' && face.origin === 'own') return false;
        if (normalizedQuery) {
          const nName = normalizeText(face.name);
          const nAuthor = normalizeText(face.authorName || '');
          if (!nName.includes(normalizedQuery) && !nAuthor.includes(normalizedQuery)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (facesSort === 'az') return a.name.localeCompare(b.name);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [faces, facesFilter, facesSort, normalizedQuery]);

  const filteredDecks = useMemo(() => {
    return decks
      .filter((deck) => {
        if (decksFilter === 'mine' && deck.origin !== 'own') return false;
        if (decksFilter === 'saved' && deck.origin === 'own') return false;
        if (normalizedQuery && decks.length > 6) {
          const nName = normalizeText(deck.name);
          const nAuthor = normalizeText(deck.authorName || '');
          if (!nName.includes(normalizedQuery) && !nAuthor.includes(normalizedQuery)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (decksSort === 'az') return a.name.localeCompare(b.name);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [decks, decksFilter, decksSort, normalizedQuery]);

  // --------------------------------------------------------------------------
  // 10. AÇÕES DE CONTA (Senha / Sair / Apagar)
  // --------------------------------------------------------------------------
  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError('A nova senha precisa ter pelo menos 6 caracteres.');
      sounds.playWrong();
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('As senhas digitadas não coincidem.');
      sounds.playWrong();
      return;
    }
    setIsSavingPassword(true);
    setPasswordError(null);
    try {
      await auth.updatePassword(newPassword);
      sounds.playWin();
      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordSuccess(false);
        setNewPassword('');
        setNewPasswordConfirm('');
      }, 1800);
    } catch (err: any) {
      setPasswordError(err?.message || 'Falha de conexão ao trocar senha.');
      sounds.playWrong();
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    sounds.playClick();
    try {
      await auth.deleteAccount(currentUser.id);
      sounds.playWrong();
      auth.logout();
      onBackToLobby();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível apagar a conta neste momento.');
    } finally {
      setIsDeletingAccount(false);
      setDeleteConfirmOpen(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDERIZAÇÃO
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto w-full py-6 sm:py-10 px-4 text-left animate-in fade-in duration-150">
      {/* Botão de Retorno: Seta Simples (apenas ícone, padrão do app) */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBackToLobby}
          aria-label="Voltar ao menu principal"
          className="p-2 -ml-2 text-[#6F655C] hover:text-[#2B2420] transition-colors rounded-[6px] cursor-pointer inline-flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Banner de Reconexão para Partida em Andamento */}
      {reconnectSession && reconnectSecondsLeft > 0 && (
        <div className="bg-[#2B2420] text-white rounded-[8px] p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-[#2B2420]">
          <div className="flex items-center gap-3">
            <RotateCcw size={16} className="text-[#B4532F] animate-spin-slow shrink-0" />
            <div className="text-xs">
              <span className="font-semibold block text-white">
                Partida em andamento na Sala #{reconnectSession.roomCode}
              </span>
              <span className="text-[#A39A90]">
                Contra {reconnectSession.opponentName || 'Oponente'}. Tempo restante: {reconnectSecondsLeft}s
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                sounds.playClick();
                if (onReconnectMatch) onReconnectMatch(reconnectSession);
              }}
            >
              Reconectar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="text-white border-white/40 hover:bg-white/10"
              onClick={handleDismissReconnect}
            >
              Desistir
            </Button>
          </div>
        </div>
      )}

      {/* CABEÇALHO DO PERFIL (Sem Painel Admin, estatísticas em tinta, layout idêntico) */}
      <div className="border-b border-[#E2DACD] pb-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-[8px] object-cover border border-[#E2DACD] shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[8px] bg-[#E2DACD]/50 border border-[#E2DACD] text-[#2B2420] font-serif font-bold text-2xl flex items-center justify-center shrink-0">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#2B2420] leading-tight">
                  {currentUser.username}
                </h1>
                {currentUser.is_admin && (
                  <span className="text-xs text-[#6F655C] font-sans">
                    Administrador
                  </span>
                )}
                {currentUser.provider && currentUser.provider !== 'email' && (
                  <span className="text-xs text-[#6F655C] font-sans">
                    via {currentUser.provider}
                  </span>
                )}
              </div>

              {/* Estatísticas em UMA ÚNICA LINHA, números em Fraunces e TUDO em tinta primária */}
              <div className="text-xs sm:text-sm text-[#6F655C] font-sans mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span>
                  <strong className="font-serif text-base sm:text-lg font-normal text-[#2B2420]">{stats?.totalMatches || 0}</strong> partidas
                </span>
                <span>·</span>
                <span>
                  <strong className="font-serif text-base sm:text-lg font-normal text-[#2B2420]">{stats?.wins || 0}</strong> vitórias
                </span>
                <span>·</span>
                <span>
                  <strong className="font-serif text-base sm:text-lg font-normal text-[#2B2420]">{stats?.losses || 0}</strong> derrotas
                </span>
                <span>·</span>
                <span>
                  <strong className="font-serif text-base sm:text-lg font-normal text-[#2B2420]">{stats?.winRate || 0}%</strong> de aproveitamento
                </span>
              </div>
            </div>
          </div>

          {/* Ações em UMA ÚNICA LINHA sem quebra */}
          <div className="flex items-center gap-3 text-xs flex-nowrap whitespace-nowrap shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="text-[#6F655C] hover:text-[#2B2420] underline transition-colors cursor-pointer"
            >
              Trocar senha
            </button>
            <span className="text-[#E2DACD]">·</span>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                auth.logout();
                onBackToLobby();
              }}
              className="text-[#6F655C] hover:text-[#2B2420] underline transition-colors cursor-pointer"
            >
              Sair
            </button>
            <span className="text-[#E2DACD]">·</span>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="text-[#A39A90] hover:text-[#8C2E2A] underline transition-colors cursor-pointer"
            >
              Apagar conta
            </button>
          </div>
        </div>
      </div>

      {/* Navegação por Abas em Texto com Sublinhado Ativo */}
      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'decks', label: 'Baralhos', count: decks.length },
            { id: 'faces', label: 'Caras', count: faces.length },
            { id: 'stats', label: 'Histórico' },
          ]}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab as 'decks' | 'faces' | 'stats');
            setSearchQuery('');
          }}
        />
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* ABA 1: BARALHOS (LISTA DE LINHAS) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'decks' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Linha de Controles: Filtros, Ordenação, Busca (>6) e Criar Baralho */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filtros à Esquerda */}
            <div className="flex items-center gap-3 text-xs font-sans">
              {(['all', 'mine', 'saved'] as const).map((filterKey) => {
                const label = filterKey === 'all' ? 'Todos' : filterKey === 'mine' ? 'Meus' : 'Salvos';
                const isActive = decksFilter === filterKey;
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setDecksFilter(filterKey)}
                    className={`cursor-pointer transition-colors pb-0.5 ${
                      isActive
                        ? 'text-[#2B2420] font-medium border-b border-[#2B2420]'
                        : 'text-[#6F655C] hover:text-[#2B2420]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Ordenação e Ação Criar Baralho à Direita */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {/* Campo de Busca (Apenas quando houver mais de 6 baralhos) */}
              {decks.length > 6 && (
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A39A90] pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Buscar baralhos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-2.5 py-1 text-xs font-sans bg-transparent border-b border-[#E2DACD] focus:border-[#2B2420] outline-none transition-colors w-32 sm:w-44 placeholder-[#A39A90] text-[#2B2420]"
                  />
                </div>
              )}

              {/* Ordenação */}
              <div className="flex items-center gap-2 text-xs font-sans text-[#6F655C]">
                <button
                  type="button"
                  onClick={() => setDecksSort('recent')}
                  className={`cursor-pointer transition-colors ${
                    decksSort === 'recent' ? 'text-[#2B2420] font-medium' : 'hover:text-[#2B2420]'
                  }`}
                >
                  Mais recentes
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setDecksSort('az')}
                  className={`cursor-pointer transition-colors ${
                    decksSort === 'az' ? 'text-[#2B2420] font-medium' : 'hover:text-[#2B2420]'
                  }`}
                >
                  A–Z
                </button>
              </div>

              {/* Ação Primária Única: Criar Baralho */}
              <Button
                size="sm"
                variant="primary"
                onClick={onCreateNewDeck}
                disabled={myDecksCount >= 10}
              >
                <Plus size={14} className="mr-1" />
                <span>Criar baralho</span>
              </Button>
            </div>
          </div>

          {/* Aviso de Limite de 10 Baralhos (Apenas a partir de 80% / 8 baralhos) */}
          {myDecksCount >= 8 && (
            <p className="text-xs font-sans text-[#6F655C]">
              {myDecksCount >= 10
                ? 'Você atingiu o limite de 10 baralhos criados. Exclua algum baralho para criar novos.'
                : `Você usou ${myDecksCount} de 10 baralhos.`}
            </p>
          )}

          {/* Lista de Linhas de Baralho */}
          {loading ? (
            <div className="py-12 text-center text-xs text-[#6F655C]">
              Carregando baralhos...
            </div>
          ) : filteredDecks.length === 0 ? (
            /* Estado Vazio sem cartão com borda */
            <div className="py-12 text-center text-xs font-sans text-[#6F655C]">
              <p>Nenhum baralho ainda. Selecione cartas na aba Caras ou explore baralhos prontos na Comunidade.</p>
              <button
                type="button"
                onClick={() => {
                  window.history.pushState(null, '', '/comunidade');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="mt-2 text-[#2B2420] font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer inline-block"
              >
                Explorar baralhos
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#E2DACD]/60 border-t border-b border-[#E2DACD]/60">
              {filteredDecks.map((deck) => {
                const isMine = deck.origin === 'own';
                const isUnavailable = deck.status === 'unavailable';
                const needsAdjustment = deck.status === 'needs_adjustment';

                return (
                  <div
                    key={deck.id}
                    className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-colors hover:bg-[#FBF8F3]/60 px-1 rounded-[4px]"
                  >
                    {/* Informações à Esquerda: Nome e Metadados */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h3
                          role="button"
                          tabIndex={0}
                          onClick={() => onViewDeck?.(deck as any)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onViewDeck?.(deck as any);
                            }
                          }}
                          className="font-serif text-lg text-[#2B2420] hover:text-[#B4532F] transition-colors font-normal truncate cursor-pointer outline-none focus-visible:underline"
                        >
                          {deck.name}
                        </h3>

                        {/* Metadados */}
                        <span className="text-xs font-sans text-[#6F655C]">
                          {deck.cardCount} cartas ·{' '}
                          {isMine
                            ? deck.isPublic
                              ? 'público'
                              : 'privado'
                            : deck.origin === 'official'
                            ? 'por Tá na Cara!'
                            : `por ${deck.authorName || 'Comunidade'}`}
                        </span>
                      </div>

                      {/* Alertas de Estado Especial */}
                      {needsAdjustment && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#8C2E2A]">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>Este baralho contém cartas removidas.</span>
                          <button
                            type="button"
                            onClick={() => handleAutoReplaceRemovedFaces(deck)}
                            className="font-medium underline hover:opacity-80 cursor-pointer inline-flex items-center gap-1 text-[#2B2420]"
                          >
                            <Wand2 size={11} />
                            <span>Substituir por cara aleatória</span>
                          </button>
                        </div>
                      )}

                      {isUnavailable && (
                        <p className="text-xs text-[#8C2E2A] mt-0.5">
                          Baralho indisponível (autor tornou privado ou removeu).
                        </p>
                      )}
                    </div>

                    {/* Direita: Faixa de Miniaturas e Ações em Linha */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end">
                      {/* Faixa de Fotos das Cartas Clicável */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onViewDeck?.(deck as any)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onViewDeck?.(deck as any);
                          }
                        }}
                        title={`Ver as ${deck.cards.length} cartas do baralho ${deck.name}`}
                        className="flex items-center -space-x-1.5 overflow-hidden py-0.5 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[#2B2420] rounded-[4px]"
                      >
                        {deck.cards.slice(0, 6).map((c, idx) => (
                          <div
                            key={c.id || idx}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-[6px] overflow-hidden bg-[#FAF6F0] cara-frame border border-[#F6F2EA] shadow-2xs shrink-0"
                          >
                            <img
                              src={c.imageUrl}
                              alt=""
                              className="w-full h-full object-cover cara-img"
                              loading="lazy"
                            />
                          </div>
                        ))}
                        {deck.cards.length > 6 && (
                          <span className="text-[10px] font-sans font-medium text-[#6F655C] pl-2 shrink-0">
                            +{deck.cards.length - 6}
                          </span>
                        )}
                      </div>

                      {/* Link Explícito "Ver caras" */}
                      <button
                        type="button"
                        onClick={() => onViewDeck?.(deck as any)}
                        className="text-xs font-sans text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer shrink-0 hidden md:inline"
                      >
                        Ver caras
                      </button>

                      {/* Botão JOGAR: Segue a REGRA 3 (redireciona para Configuração) */}
                      {!isUnavailable && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onPlayDeck(deck as any)}
                          disabled={needsAdjustment}
                          title={needsAdjustment ? 'Substitua as cartas removidas antes de jogar' : 'Configurar partida com este baralho'}
                          className="font-medium shrink-0"
                        >
                          Jogar
                        </Button>
                      )}

                      {/* Compartilhar */}
                      <button
                        type="button"
                        onClick={() => handleShareDeck(deck.id)}
                        title="Copiar link do baralho"
                        className="p-1 text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer shrink-0"
                      >
                        <Share2 size={14} />
                      </button>

                      {/* Menu Reticências ("...") */}
                      <ActionMenu
                        ariaLabel={`Opções do baralho ${deck.name}`}
                        items={[
                          ...(isMine
                            ? [
                                {
                                  label: 'Editar',
                                  onClick: () => onEditDeck(deck as any),
                                },
                                {
                                  label: deck.isPublic ? 'Tornar privado' : 'Tornar público',
                                  onClick: () => handleToggleDeckPublic(deck),
                                },
                                {
                                  label: 'Excluir',
                                  onClick: () => handleDeleteDeck(deck.id, deck.name),
                                  variant: 'danger' as const,
                                },
                              ]
                            : [
                                {
                                  label: 'Remover dos salvos',
                                  onClick: () => handleRemoveDeckFromSaved(deck.id, deck.name),
                                },
                                {
                                  label: 'Denunciar',
                                  onClick: () => {
                                    setReportTarget({
                                      type: 'deck',
                                      id: deck.id,
                                      name: deck.name,
                                      authorName: deck.authorName,
                                    });
                                  },
                                  variant: 'danger' as const,
                                },
                              ]),
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* ABA 2: CARAS (GRADE ÚNICA, SELEÇÃO POR TOQUE, BARRA FIXA) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'faces' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Linha de Controles: Filtros, Busca, Ordenação e Adicionar Cara */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filtros à Esquerda */}
            <div className="flex items-center gap-3 text-xs font-sans">
              {(['all', 'mine', 'saved'] as const).map((filterKey) => {
                const label = filterKey === 'all' ? 'Todas' : filterKey === 'mine' ? 'Minhas' : 'Salvas';
                const isActive = facesFilter === filterKey;
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setFacesFilter(filterKey)}
                    className={`cursor-pointer transition-colors pb-0.5 ${
                      isActive
                        ? 'text-[#2B2420] font-medium border-b border-[#2B2420]'
                        : 'text-[#6F655C] hover:text-[#2B2420]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Busca, Ordenação e Botão Adicionar Cara à Direita */}
            <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
              {/* Campo de Busca com normalização sem acento */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A39A90] pointer-events-none" />
                <input
                  type="search"
                  placeholder="Buscar caras..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2.5 py-1 text-xs font-sans bg-transparent border-b border-[#E2DACD] focus:border-[#2B2420] outline-none transition-colors w-32 sm:w-44 placeholder-[#A39A90] text-[#2B2420]"
                />
              </div>

              {/* Ordenação: Mais recentes · A–Z */}
              <div className="flex items-center gap-2 text-xs font-sans text-[#6F655C]">
                <button
                  type="button"
                  onClick={() => setFacesSort('recent')}
                  className={`cursor-pointer transition-colors ${
                    facesSort === 'recent' ? 'text-[#2B2420] font-medium' : 'hover:text-[#2B2420]'
                  }`}
                >
                  Mais recentes
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setFacesSort('az')}
                  className={`cursor-pointer transition-colors ${
                    facesSort === 'az' ? 'text-[#2B2420] font-medium' : 'hover:text-[#2B2420]'
                  }`}
                >
                  A–Z
                </button>
              </div>

              {/* Ação Primária Única: Adicionar Cara */}
              <Button
                size="sm"
                variant="primary"
                onClick={handleOpenAddFace}
                disabled={myFacesCount >= 360}
              >
                <Plus size={14} className="mr-1" />
                <span>Adicionar cara</span>
              </Button>
            </div>
          </div>

          {/* Aviso de Limite de 360 Caras (Apenas a partir de 90% / 324 caras) */}
          {myFacesCount >= 324 && (
            <p className="text-xs font-sans text-[#6F655C]">
              {myFacesCount >= 360
                ? 'Você atingiu o limite de caras enviadas. Exclua alguma ou salve caras da comunidade.'
                : `Você usou ${myFacesCount} de 360 caras.`}
            </p>
          )}

          {/* Grade de Caras */}
          {loading ? (
            <div className="py-12 text-center text-xs text-[#6F655C]">
              Carregando caras...
            </div>
          ) : filteredFaces.length === 0 ? (
            <div className="py-12 text-center text-xs font-sans text-[#6F655C]">
              <p>Nenhuma cara encontrada neste filtro.</p>
              {myFacesCount < 360 && (
                <button
                  type="button"
                  onClick={handleOpenAddFace}
                  className="mt-2 text-[#2B2420] font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer inline-block"
                >
                  Adicionar primeira cara
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 pb-24">
              {filteredFaces.map((face) => {
                const isSelected = selectedFaceIds.has(face.id);
                const isUnavailable = face.status === 'unavailable';
                const isMine = face.origin === 'own';

                // Subtítulo da Legenda conforme as regras
                let subtitle = '';
                if (isMine) {
                  subtitle = face.isPublic ? '' : 'Privada';
                } else if (face.origin === 'official') {
                  subtitle = 'Tá na Cara!';
                } else if (isUnavailable) {
                  subtitle = 'indisponível';
                } else {
                  subtitle = `por ${face.authorName || 'Comunidade'}`;
                }

                return (
                  <div
                    key={face.id}
                    onClick={() => handleToggleSelectFace(face)}
                    className={`group cursor-pointer text-left select-none transition-transform active:scale-[0.98] ${
                      isUnavailable ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {/* Moldura da Imagem */}
                    <div
                      className={`relative aspect-square rounded-[8px] overflow-hidden bg-[#FAF6F0] cara-frame transition-all ${
                        isSelected
                          ? 'ring-2 ring-[#2B2420] ring-offset-2 ring-offset-[#F6F2EA]'
                          : 'hover:opacity-90'
                      }`}
                    >
                      <img
                        src={face.imageUrl}
                        alt={face.name}
                        className={`w-full h-full object-cover cara-img ${
                          isUnavailable ? 'grayscale' : ''
                        }`}
                        loading="lazy"
                      />

                      {/* Indicador de Seleção no Canto Superior Esquerdo */}
                      {isSelected && (
                        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[#2B2420] text-white flex items-center justify-center shadow-xs">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}

                      {/* Botão de Pré-visualização Ampliada */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTriggerEl(e.currentTarget);
                          setPreviewFace(face);
                        }}
                        aria-label={`Ver detalhes de ${face.name}`}
                        className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-[#2B2420]/75 hover:bg-[#2B2420] text-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer shadow-xs"
                      >
                        <Eye size={12} />
                      </button>
                    </div>

                    {/* Legenda Padronizada */}
                    <CaraLegenda
                      name={face.name}
                      subtitle={subtitle}
                      isOfficial={face.origin === 'official'}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* BARRA FIXA INFERIOR DE SELEÇÃO */}
          {selectedFaceIds.size > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#F6F2EA]/95 backdrop-blur-md border-t border-[#E2DACD] shadow-lg py-3 px-4 transition-all animate-in slide-in-from-bottom duration-200">
              <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans">
                {/* Contagem e Status da Seleção */}
                <div className="flex items-center gap-3">
                  <span className="text-[#2B2420] font-medium">
                    {selectedStats.total} {selectedStats.total === 1 ? 'carta selecionada' : 'cartas selecionadas'}
                  </span>
                  {!selectedStats.isHomogeneousMine && !selectedStats.isHomogeneousSaved && (
                    <span className="text-[#6F655C]">
                      ({selectedStats.mine} minhas · {selectedStats.saved} salvas)
                    </span>
                  )}
                  {isValidDeckSize(selectedStats.total) ? (
                    <span className="text-[#2E7D32] font-semibold">Tamanho válido para baralho</span>
                  ) : (
                    <span className="text-[#6F655C]">
                      (precisa de {TAMANHO_MINIMO_BARALHO} a {TAMANHO_MAXIMO_BARALHO} cartas para criar baralho)
                    </span>
                  )}
                </div>

                {/* Ações da Seleção por Composição */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Ações Homogêneas: Apenas Minhas */}
                  {selectedStats.isHomogeneousMine && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleBatchMakePrivate(selectedStats.privateCount === 0)}
                        className="text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer px-1 py-1"
                      >
                        {selectedStats.privateCount > 0 ? 'Tornar públicas' : 'Tornar privadas'}
                      </button>
                      <button
                        type="button"
                        onClick={handleBatchDeleteMine}
                        className="text-[#8C2E2A] hover:underline cursor-pointer px-1 py-1"
                      >
                        Excluir
                      </button>
                    </>
                  )}

                  {/* Ações Homogêneas: Apenas Salvas */}
                  {selectedStats.isHomogeneousSaved && (
                    <button
                      type="button"
                      onClick={handleBatchRemoveSaved}
                      className="text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer px-1 py-1"
                    >
                      Remover dos salvos
                    </button>
                  )}

                  {/* Limpar Seleção */}
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer px-1 py-1"
                  >
                    Limpar
                  </button>

                  {/* Criar Baralho (Exige de 15 a 90 cartas) */}
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!isValidDeckSize(selectedStats.total) || myDecksCount >= 10}
                    onClick={() => setCreateDeckModalOpen(true)}
                  >
                    Criar baralho
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* ABA 3: HISTÓRICO (DESIGN SYSTEM: LINHAS DE TEXTO, SEM CARDS) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'stats' && (
        <div className="space-y-4 animate-in fade-in duration-150 text-left">
          <span className="text-xs text-[#6F655C] block pb-2">
            Registro das últimas partidas disputadas
          </span>

          {!stats || stats.lastMatches.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6F655C] italic">
              Nenhuma partida registrada ainda. Jogue uma rodada para ver seu histórico aqui.
            </div>
          ) : (
            <div className="divide-y divide-[#E2DACD]/60 border-t border-b border-[#E2DACD]/60">
              {stats.lastMatches.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="py-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-serif text-sm text-[#2B2420] font-normal">
                      vs {m.opponent_name}
                    </span>
                    <span className="text-[#6F655C] block text-[11px] mt-0.5">
                      {m.deck_mode === 'custom'
                        ? `Baralho personalizado (${m.card_count} cartas)`
                        : 'Modo clássico (15 cartas)'}
                    </span>
                  </div>

                  <span className="font-sans font-medium text-xs text-[#2B2420]">
                    {m.result === 'win' ? 'Vitória' : 'Derrota'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAIS E DIÁLOGOS DE AVISO */}
      {/* ---------------------------------------------------------------------- */}

      {/* Modal de Pré-visualização Ampliada de Cara */}
      {previewFace && (
        <FacePreviewModal
          face={{
            id: previewFace.id,
            user_id: currentUser.id,
            name: previewFace.name,
            image_url: previewFace.imageUrl,
            author_name: previewFace.authorName,
            is_public: previewFace.isPublic,
            is_official: previewFace.origin === 'official',
            created_at: previewFace.createdAt,
          }}
          isOpen={!!previewFace}
          isOwner={previewFace.origin === 'own'}
          isOfficial={previewFace.origin === 'official'}
          isPublic={previewFace.isPublic}
          onClose={() => setPreviewFace(null)}
          onTogglePublic={() => {
            setPreviewFace(null);
            handleToggleFaceVisibility(previewFace);
          }}
          onDelete={() => {
            setPreviewFace(null);
            handlePromptDeleteFace(previewFace);
          }}
          onRemoveSaved={() => {
            setPreviewFace(null);
            handleRemoveFaceFromSaved(previewFace.id, previewFace.name);
          }}
          onReport={() => {
            setPreviewFace(null);
            setReportTarget({
              type: 'face',
              id: previewFace.id,
              name: previewFace.name,
              authorName: previewFace.authorName,
            });
          }}
          triggerElement={previewTriggerEl}
        />
      )}

      {/* Modal de Criação de Baralho a partir da Seleção */}
      {createDeckModalOpen && (
        <CreateDeckModal
          isOpen={createDeckModalOpen}
          cardCount={selectedStats.total}
          privateCardsCount={selectedStats.privateCount}
          onClose={() => setCreateDeckModalOpen(false)}
          onConfirm={async (deckName, isPublic) => {
            // Se o baralho foi marcado como público e há caras privadas, torná-las públicas
            if (isPublic && selectedStats.privateCount > 0) {
              const privateMine = selectedFacesList.filter((f) => f.origin === 'own' && !f.isPublic);
              for (const f of privateMine) {
                await auth.toggleFacePublic(f.id, currentUser.id, true);
              }
            }

            const cardsForDeck: Character[] = selectedFacesList.map((f) => ({
              id: f.id,
              name: f.name,
              imageUrl: f.imageUrl,
            }));

            const created = await auth.saveDeck(
              currentUser.id,
              deckName,
              selectedStats.total,
              cardsForDeck,
              isPublic,
              currentUser.username
            );

            setDecks((prev) => [
              {
                id: created.id,
                name: created.name,
                cardCount: created.card_count || cardsForDeck.length,
                cards: cardsForDeck,
                authorName: currentUser.username,
                isPublic,
                origin: 'own',
                status: 'active',
                createdAt: created.created_at,
              },
              ...prev,
            ]);

            setCreateDeckModalOpen(false);
            setSelectedFaceIds(new Set());
            setToast({
              id: `deck-created-${created.id}`,
              message: `Baralho "${created.name}" criado com sucesso!`,
            });
          }}
        />
      )}

      {/* Modal de Recorte / Upload de Imagem */}
      {isAddingFace && (
        <ImageCropperModal
          roomCode="profile"
          currentUser={currentUser}
          initialImageSrc={droppedInitialImage}
          onSaveCharacter={handleSaveCroppedFace}
          onSaveBatch={handleSaveBatchFaces}
          onClose={() => {
            setIsAddingFace(false);
            setDroppedInitialImage(null);
          }}
        />
      )}

      {/* Diálogo Anti-duplicata */}
      {duplicateDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#2B2420]/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[12px] max-w-sm w-full p-5 shadow-xl text-left">
            <h3 className="font-serif text-lg text-[#2B2420] font-normal mb-2 leading-snug">
              {duplicateDialog.type === 'exact_hash'
                ? 'Cara já existente na comunidade'
                : 'Nome semelhante encontrado'}
            </h3>

            {duplicateDialog.type === 'exact_hash' ? (
              <>
                <p className="text-xs font-sans text-[#6F655C] mb-4 leading-relaxed">
                  Essa exata imagem já existe na comunidade ("{duplicateDialog.match.name}"). Salvamos a existente para você como referência para evitar duplicatas.
                </p>
                <div className="flex justify-end pt-2 border-t border-[#E2DACD]/60">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={async () => {
                      await saveFaceAsReference(currentUser.id, duplicateDialog.match);
                      await loadProfile();
                      setDuplicateDialog(null);
                      setToast({
                        id: `dup-${duplicateDialog.match.id}`,
                        message: `"${duplicateDialog.match.name}" adicionada às suas caras salvas.`,
                      });
                    }}
                  >
                    Entendido
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-2.5 rounded-[6px] border border-[#E2DACD] bg-[#FAF6F0] mb-4">
                  <img
                    src={duplicateDialog.match.image_url}
                    alt={duplicateDialog.match.name}
                    className="w-10 h-10 rounded-[4px] object-cover"
                  />
                  <div className="text-xs">
                    <span className="font-medium text-[#2B2420] block">{duplicateDialog.match.name}</span>
                    <span className="text-[#6F655C]">por {duplicateDialog.match.author_name || 'Comunidade'}</span>
                  </div>
                </div>
                <p className="text-xs font-sans text-[#6F655C] mb-4 leading-relaxed">
                  Já existe uma cara com nome idêntico ou muito parecido na comunidade. Deseja salvar a já existente ou manter a sua?
                </p>
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-[#E2DACD]/60">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      if (duplicateDialog.newChar) {
                        const saved = await auth.saveFace(
                          currentUser.id,
                          duplicateDialog.newChar.name,
                          duplicateDialog.newChar.imageUrl || '',
                          false,
                          currentUser.username
                        );
                        await loadProfile();
                        setToast({
                          id: `pub-anyway-${saved.id}`,
                          message: 'Sua cara foi salva com sucesso.',
                        });
                      }
                      setDuplicateDialog(null);
                    }}
                  >
                    Salvar a minha mesmo assim
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={async () => {
                      await saveFaceAsReference(currentUser.id, duplicateDialog.match);
                      await loadProfile();
                      setDuplicateDialog(null);
                      setToast({
                        id: `dup-ref-${duplicateDialog.match.id}`,
                        message: `"${duplicateDialog.match.name}" adicionada às suas caras salvas.`,
                      });
                    }}
                  >
                    Salvar a existente
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Diálogo de Confirmação de Exclusão de Cara com Impacto */}
      {faceToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#2B2420]/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[12px] max-w-sm w-full p-5 shadow-xl text-left">
            <h3 className="font-serif text-lg text-[#2B2420] font-normal mb-2 leading-snug">
              Excluir cara
            </h3>
            <p className="text-xs font-sans text-[#6F655C] mb-3 leading-relaxed">
              Tem certeza que deseja excluir "{faceToDelete.face.name}"?
            </p>
            {faceToDelete.otherDecksCount > 0 ? (
              <p className="text-xs font-sans text-[#8C2E2A] mb-4 leading-relaxed">
                Atenção: Esta cara está presente em {faceToDelete.otherDecksCount}{' '}
                {faceToDelete.otherDecksCount === 1 ? 'baralho' : 'baralhos'} de outros jogadores. Nesses baralhos, o espaço exibirá "Cara removida" e precisará de ajuste.
              </p>
            ) : (
              <p className="text-xs font-sans text-[#6F655C] mb-4">
                Esta ação é definitiva e removerá a cara permanentemente.
              </p>
            )}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E2DACD]/60">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setFaceToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleConfirmDeleteFace}
              >
                Excluir definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Denúncia */}
      {reportTarget && (
        <ReportModal
          isOpen={!!reportTarget}
          item={reportTarget}
          currentUser={currentUser}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* Modal de Troca de Senha */}
      {passwordModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#2B2420]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] max-w-sm w-full p-6 shadow-xl text-left">
            <h3 className="font-serif text-xl text-[#2B2420] font-normal mb-1">Trocar senha</h3>
            <p className="text-xs text-[#6F655C] mb-4">Digite sua nova senha de acesso.</p>
            {passwordSuccess ? (
              <div className="p-3 bg-[#E8F5E9] text-[#2E7D32] text-xs rounded-md flex items-center gap-2">
                <Check size={16} />
                <span>Senha alterada com sucesso!</span>
              </div>
            ) : (
              <div className="space-y-3">
                {passwordError && (
                  <div className="p-2.5 bg-[#F8EBEA] text-[#8C2E2A] text-xs rounded-md">
                    {passwordError}
                  </div>
                )}
                <div>
                  <label className="text-xs text-[#6F655C] block mb-1">Nova senha</label>
                  <input
                    type="password"
                    placeholder="Mínimo de 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs p-2 rounded-[6px] border border-[#E2DACD] bg-[#FAF6F0] text-[#2B2420] outline-none focus:border-[#2B2420]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#6F655C] block mb-1">Confirmar nova senha</label>
                  <input
                    type="password"
                    placeholder="Repita a nova senha"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="w-full text-xs p-2 rounded-[6px] border border-[#E2DACD] bg-[#FAF6F0] text-[#2B2420] outline-none focus:border-[#2B2420]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setPasswordModalOpen(false);
                      setPasswordError(null);
                      setNewPassword('');
                      setNewPasswordConfirm('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleUpdatePassword}
                    disabled={isSavingPassword || !newPassword}
                  >
                    {isSavingPassword ? 'Salvando...' : 'Atualizar senha'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Apagar Conta */}
      {deleteConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#2B2420]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] max-w-sm w-full p-6 shadow-xl text-left">
            <h3 className="font-serif text-xl text-[#8C2E2A] font-normal mb-1">Apagar conta?</h3>
            <p className="text-xs text-[#6F655C] mb-4 leading-relaxed">
              Esta ação é permanente e não poderá ser desfeita. Todos os seus baralhos e estatísticas serão removidos.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isDeletingAccount}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? 'Apagando...' : 'Sim, apagar conta'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Feedback com Ação de Desfazer */}
      <CommunityToast
        toast={toast}
        hasSelectionBar={selectedFaceIds.size > 0 && activeTab === 'faces'}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

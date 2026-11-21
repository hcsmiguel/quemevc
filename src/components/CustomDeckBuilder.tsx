import { useState, useEffect, useRef, type FC } from 'react';
import type { Character, DifficultyCount } from '../types/game';
import { STANDARD_60_CHARACTERS } from '../utils/characters';
import { ImageCropperModal } from './ImageCropperModal';
import { FacePickerModal } from './FacePickerModal';
import { auth, type AppUser, type SavedDeck, type SavedFace } from '../services/auth';
import { ArrowLeft, X, Plus } from 'lucide-react';
import { sounds } from '../utils/sound';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';
import { CompleteUntilMenu } from './ui/CompleteUntilMenu';
import { CaraLegenda } from './community/CaraLegenda';
import { CommunityToast, type ToastData } from './community/CommunityToast';
import {
  TAMANHO_MINIMO_BARALHO,
  TAMANHO_MAXIMO_BARALHO,
  isDeckSizeValid,
  getDeckSizeStatus,
} from '../constants/deck';

interface CustomDeckBuilderProps {
  targetCount?: DifficultyCount;
  roomCode?: string;
  currentUser: AppUser | null;
  initialDeck?: SavedDeck | null;
  isFromProfile?: boolean;
  onFinishDeck: (cards: Character[], deckName?: string, savedToProfile?: boolean) => void;
  onCancel: () => void;
}

export const CustomDeckBuilder: FC<CustomDeckBuilderProps> = ({
  targetCount: _initialTargetCount = 30,
  currentUser,
  initialDeck = null,
  isFromProfile: _isFromProfile = false,
  onFinishDeck,
  onCancel,
}) => {
  const DRAFT_KEY = `cara_deck_draft_${currentUser?.id || 'guest'}`;
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);

  // Cartas do baralho
  const [cards, setCards] = useState<Character[]>(() => {
    if (initialDeck) return [...initialDeck.cards];
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.cards) && parsed.cards.length > 0) {
          return parsed.cards;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Nome do baralho
  const [deckName, setDeckName] = useState(() => {
    if (initialDeck?.name) return initialDeck.name;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) return parsed.name;
      }
    } catch {
      // ignore
    }
    return '';
  });

  const [isPublicDeck, setIsPublicDeck] = useState(initialDeck?.is_public ?? false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  // Modais
  const [isFacePickerOpen, setIsFacePickerOpen] = useState(false);
  const [isAddFaceOpen, setIsAddFaceOpen] = useState(false);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);
  const [privateFacesDialog, setPrivateFacesDialog] = useState<{ faces: SavedFace[] } | null>(null);

  // Notificações / Toast
  const [toast, setToast] = useState<ToastData | null>(null);

  // Catálogo de caras disponíveis
  const [communityFaces, setCommunityFaces] = useState<SavedFace[]>([]);
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Salvar rascunho automaticamente
  useEffect(() => {
    if (!initialDeck) {
      if (cards.length > 0 || deckName.trim()) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: deckName, cards }));
        } catch {
          // ignore
        }
      }
    }
  }, [cards, deckName, initialDeck, DRAFT_KEY]);

  // Carregar dados iniciais e detectar restauração de rascunho
  useEffect(() => {
    auth.getPublicFaces().then(setCommunityFaces).catch(() => {});
    if (!initialDeck) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.cards) && parsed.cards.length > 0) {
            setRestoredFromDraft(true);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [initialDeck, DRAFT_KEY]);

  useEffect(() => {
    if (currentUser) {
      auth
        .getUserSavedFaces(currentUser.id)
        .then((loaded) => {
          setSavedFaces(
            loaded.filter(
              (f) => !f.is_hidden && f.name !== 'Cara removida' && (f as any).status !== 'deleted'
            )
          );
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // Descartar rascunho automático
  const handleDiscardDraft = () => {
    sounds.playClick();
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setCards([]);
    setDeckName('');
    setRestoredFromDraft(false);
    setToast({
      id: `draft-discarded-${Date.now()}`,
      message: 'Rascunho descartado.',
    });
  };

  // Botão Voltar (com confirmação se houver dados alterados)
  const handleBack = () => {
    sounds.playClick();
    if (cards.length > 0 || deckName.trim()) {
      setIsConfirmExitOpen(true);
    } else {
      onCancel();
    }
  };

  // Alternar seleção no Seletor
  const handleToggleCardFromPicker = (face: SavedFace) => {
    const isAlreadySelected = cards.some(
      (c) =>
        c.name.trim().toLowerCase() === face.name.trim().toLowerCase() ||
        (c.imageUrl && c.imageUrl === face.image_url) ||
        c.id === face.id
    );

    if (isAlreadySelected) {
      setCards((prev) =>
        prev.filter(
          (c) =>
            c.name.trim().toLowerCase() !== face.name.trim().toLowerCase() &&
            c.imageUrl !== face.image_url &&
            c.id !== face.id
        )
      );
    } else {
      if (cards.length >= TAMANHO_MAXIMO_BARALHO) {
        setToast({
          id: 'max-cards-reached',
          message: `Máximo de ${TAMANHO_MAXIMO_BARALHO} cartas atingido.`,
        });
        return;
      }
      const newCard: Character = {
        id: face.id,
        name: face.name,
        imageUrl: face.image_url,
        authorName: face.author_name,
        isOfficial: face.is_official,
        avatarBg: '#1e293b',
      };
      setCards((prev) => [...prev, newCard]);
    }
  };

  // Remover carta da grade com opção de desfazer via toast
  const handleRemoveCard = (cardId: string) => {
    sounds.playClick();
    const cardIndex = cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return;
    const removedCard = cards[cardIndex];

    setCards((prev) => prev.filter((c) => c.id !== cardId));

    setToast({
      id: `removed_${cardId}_${Date.now()}`,
      message: `"${removedCard.name}" removida do baralho.`,
      actionLabel: 'Desfazer',
      onAction: () => {
        setCards((prev) => {
          const next = [...prev];
          next.splice(cardIndex, 0, removedCard);
          return next;
        });
      },
    });
  };

  // Limpar todas as cartas
  const handleClearAll = () => {
    sounds.playClick();
    const prev = [...cards];
    setCards([]);
    setToast({
      id: `cleared_${Date.now()}`,
      message: 'Todas as cartas foram removidas.',
      actionLabel: 'Desfazer',
      onAction: () => setCards(prev),
    });
  };

  // Ação "Completar até": preenche aleatoriamente com cartas disponíveis até a meta escolhida
  const handleCompleteUntil = (targetCount: number) => {
    sounds.playClick();
    const currentCount = cards.length;
    const needed = targetCount - currentCount;
    if (needed <= 0) return;

    const existingKeys = new Set<string>();
    cards.forEach((c) => {
      existingKeys.add(c.name.trim().toLowerCase());
      if (c.imageUrl) existingKeys.add(c.imageUrl);
      if (c.id) existingKeys.add(c.id);
    });

    const candidates: Character[] = [];

    // Adiciona das cartas salvas
    savedFaces.forEach((f) => {
      const key = f.name.trim().toLowerCase();
      if (
        !existingKeys.has(key) &&
        !existingKeys.has(f.image_url) &&
        !existingKeys.has(f.id) &&
        f.name !== 'Cara removida' &&
        (f as any).status !== 'deleted' &&
        (f as any).status !== 'unavailable'
      ) {
        existingKeys.add(key);
        candidates.push({
          id: f.id,
          name: f.name,
          imageUrl: f.image_url,
          authorName: f.author_name,
          isOfficial: f.is_official,
        });
      }
    });

    // Adiciona da comunidade
    communityFaces.forEach((f) => {
      const key = f.name.trim().toLowerCase();
      if (
        !existingKeys.has(key) &&
        !existingKeys.has(f.image_url) &&
        !existingKeys.has(f.id) &&
        f.name !== 'Cara removida' &&
        (f as any).status !== 'deleted' &&
        (f as any).status !== 'unavailable'
      ) {
        existingKeys.add(key);
        candidates.push({
          id: f.id,
          name: f.name,
          imageUrl: f.image_url,
          authorName: f.author_name,
          isOfficial: f.is_official,
        });
      }
    });

    // Adiciona do padrão
    STANDARD_60_CHARACTERS.forEach((std) => {
      const key = std.name.trim().toLowerCase();
      if (!existingKeys.has(key) && !existingKeys.has(std.imageUrl || '') && !existingKeys.has(std.id)) {
        existingKeys.add(key);
        candidates.push(std);
      }
    });

    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const toAdd = shuffled.slice(0, needed);

    if (toAdd.length < needed) {
      setToast({
        id: `err_complete_${Date.now()}`,
        message: `Foram adicionadas ${toAdd.length} cartas (catálogo esgotado).`,
      });
    }

    setCards((prev) => [...prev, ...toAdd]);
  };

  // Quando cartas são criadas no modal "Adicionar Cara"
  const handleBatchCreatedFaces = (
    newFaces: Array<{ id: string; name: string; imageUrl: string; isExistingReference?: boolean }>
  ) => {
    setIsAddFaceOpen(false);
    if (!newFaces || newFaces.length === 0) return;

    const newCards: Character[] = newFaces.map((f) => ({
      id: f.id,
      name: f.name,
      imageUrl: f.imageUrl,
      authorName: currentUser?.username,
      avatarBg: '#1e293b',
    }));

    setCards((prev) => [...prev, ...newCards]);

    setToast({
      id: `faces-added-${Date.now()}`,
      message:
        newFaces.length === 1
          ? `"${newFaces[0].name}" adicionada ao baralho.`
          : `${newFaces.length} cartas adicionadas ao baralho.`,
    });
  };

  // Validação de salvamento (Regra central de tamanho: 15 a 90 cartas)
  const deckStatus = getDeckSizeStatus(cards.length);
  const isDeckCountValid = isDeckSizeValid(cards.length);
  const isNameValid = deckName.trim().length > 0;
  const canSaveDeck = isDeckCountValid && isNameValid;

  const getDisabledReason = (): string | null => {
    if (!isNameValid) return 'Digite um nome para o baralho.';
    if (!isDeckCountValid) {
      if (cards.length < TAMANHO_MINIMO_BARALHO) {
        return `Faltam ${TAMANHO_MINIMO_BARALHO - cards.length} cartas para o mínimo de ${TAMANHO_MINIMO_BARALHO}.`;
      }
      return `Máximo de ${TAMANHO_MAXIMO_BARALHO} cartas permitido.`;
    }
    return null;
  };

  // Início do fluxo de Salvar Baralho
  const handleSaveDeckClick = async () => {
    if (!canSaveDeck || isSavingDeck) {
      const reason = getDisabledReason();
      if (reason) setToast({ id: 'disabled-reason', message: reason });
      return;
    }

    // Consistência ao publicar: se o baralho for público, verificar se contém caras privadas do usuário
    if (isPublicDeck && currentUser) {
      const myPrivateFaces = savedFaces.filter(
        (sf) =>
          sf.user_id === currentUser.id &&
          !sf.is_public &&
          cards.some(
            (c) =>
              c.name.trim().toLowerCase() === sf.name.trim().toLowerCase() ||
              (c.imageUrl && c.imageUrl === sf.image_url) ||
              c.id === sf.id
          )
      );

      if (myPrivateFaces.length > 0) {
        setPrivateFacesDialog({ faces: myPrivateFaces });
        return;
      }
    }

    await executeSaveDeck(isPublicDeck);
  };

  const executeSaveDeck = async (publishPublic: boolean) => {
    setIsSavingDeck(true);
    sounds.playClick();
    const finalDeckName = deckName.trim();
    const finalTargetCount = cards.length as DifficultyCount;

    try {
      if (initialDeck && currentUser) {
        await auth.updateSavedDeck(
          initialDeck.id,
          currentUser.id,
          finalDeckName,
          finalTargetCount,
          cards,
          publishPublic
        );
      } else if (currentUser) {
        await auth.saveDeck(
          currentUser.id,
          finalDeckName,
          finalTargetCount,
          cards,
          publishPublic
        );
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      onFinishDeck(cards, finalDeckName, true);
    } catch (err: any) {
      console.error('Erro ao salvar baralho:', err);
      setToast({
        id: 'err-save-deck',
        message: err?.message || 'Erro ao salvar baralho.',
      });
      setIsSavingDeck(false);
    }
  };

  // Diálogo de consistência: tornar públicas e publicar
  const handleConfirmMakeFacesPublicAndSave = async () => {
    if (!privateFacesDialog || !currentUser) return;
    setIsSavingDeck(true);

    try {
      for (const face of privateFacesDialog.faces) {
        await auth.toggleFacePublic(face.id, currentUser.id, true);
      }
      setPrivateFacesDialog(null);
      await executeSaveDeck(true);
    } catch (err: any) {
      console.error('Erro ao tornar caras públicas:', err);
      setToast({
        id: 'err-toggle-public',
        message: 'Falha ao atualizar visibilidade das caras.',
      });
      setIsSavingDeck(false);
    }
  };

  // Diálogo de consistência: manter baralho privado
  const handleKeepDeckPrivateAndSave = async () => {
    setPrivateFacesDialog(null);
    setIsPublicDeck(false);
    await executeSaveDeck(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-28 sm:pb-32 text-left relative">
      {/* 1. RASCUNHO RECUPERADO (UMA LINHA DE TEXTO SIMPLES) */}
      {restoredFromDraft && (
        <div className="flex items-center justify-between text-xs font-sans text-[#6F655C] mb-4 pb-2 border-b border-[#E2DACD]/60">
          <span>Rascunho recuperado automaticamente.</span>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-[#2B2420] underline font-medium hover:text-[#B4532F] cursor-pointer"
          >
            Descartar
          </button>
        </div>
      )}

      {/* 2. CABEÇALHO LIMPO: SETA À ESQUERDA, SALVAR À DIREITA */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Voltar"
          className="p-2 -ml-2 text-[#6F655C] hover:text-[#2B2420] transition-colors rounded-[6px] cursor-pointer inline-flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          {!canSaveDeck && cards.length > 0 && (
            <span className="hidden sm:inline-block text-xs font-sans text-[#6F655C]">
              {getDisabledReason()}
            </span>
          )}
          <Button
            variant="primary"
            disabled={!canSaveDeck || isSavingDeck}
            onClick={handleSaveDeckClick}
            className="min-w-[120px]"
          >
            {isSavingDeck ? 'Salvando...' : 'Salvar baralho'}
          </Button>
        </div>
      </div>

      {/* 3. NOME DO BARALHO (TÍTULO SEM BORDA, PLACEHOLDER EM SERIFADA) */}
      <div className="mb-2">
        <input
          ref={titleInputRef}
          type="text"
          value={deckName}
          maxLength={35}
          placeholder="Nome do baralho"
          aria-label="Nome do baralho"
          onFocus={() => setIsTitleFocused(true)}
          onBlur={() => setIsTitleFocused(false)}
          onChange={(e) => setDeckName(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-transparent focus:border-[#E2DACD] pb-1 font-serif text-2xl sm:text-3xl text-[#2B2420] font-normal leading-tight placeholder-[#A39A90] focus:outline-none transition-colors"
        />

        {/* Contador de Caracteres: apenas quando em foco, em sans (nunca monospace) */}
        {isTitleFocused && (
          <span className="text-xs text-[#A39A90] font-sans block mt-1">
            {deckName.length}/35 caracteres
          </span>
        )}
      </div>

      {/* 4. OPÇÃO "PÚBLICO NA COMUNIDADE" (CHECKBOX SIMPLES + LINHA DE AJUDA) */}
      <div className="mb-8 mt-3">
        <Checkbox
          checked={isPublicDeck}
          onChange={(e) => setIsPublicDeck(e.target.checked)}
          label="Público na comunidade"
        />
        <p className="text-xs text-[#6F655C] font-sans mt-1 ml-6">
          Jogadores poderão encontrar e jogar com este baralho na aba Comunidade.
        </p>
      </div>

      {/* 5. CORPO: AÇÃO DE ADICIONAR CARAS E GRADE DE CARTAS ESCOLHIDAS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg sm:text-xl font-normal text-[#2B2420]">
            Cartas do baralho
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              sounds.playClick();
              setIsFacePickerOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Adicionar caras</span>
          </Button>
        </div>

        {cards.length === 0 ? (
          /* Estado Vazio: frase curta e botão claro */
          <div className="py-16 text-center text-sm font-sans text-[#6F655C] flex flex-col items-center justify-center gap-3">
            <p>Nenhuma carta escolhida ainda.</p>
            <Button
              variant="primary"
              onClick={() => {
                sounds.playClick();
                setIsFacePickerOpen(true);
              }}
            >
              Adicionar caras
            </Button>
          </div>
        ) : (
          /* Grade de Cartas Escolhidas */
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className="group relative flex flex-col items-center select-none"
              >
                {/* Moldura padrão sem bordas coloridas */}
                <div className="w-full aspect-square rounded-[12px] cara-frame bg-[#FAF6F0] relative shadow-[0_2px_6px_rgba(43,36,32,0.06),0_1px_2px_rgba(43,36,32,0.04)] overflow-hidden">
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover cara-img"
                  />

                  {/* Ação única por carta: remover com um "x" discreto no canto */}
                  <button
                    type="button"
                    onClick={() => handleRemoveCard(card.id)}
                    aria-label={`Remover ${card.name} do baralho`}
                    title="Remover do baralho"
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#2B2420]/80 hover:bg-[#2B2420] text-white flex items-center justify-center transition-opacity opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer shadow-xs"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Legenda padrão em sans com o nome */}
                <CaraLegenda
                  name={card.name}
                  authorName={card.authorName}
                  isOfficial={card.isOfficial}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. BARRA FIXA DE META NO RODAPÉ (SÓ APARECE QUANDO HÁ AO MENOS 1 CARTA) */}
      {cards.length > 0 && (
        <div
          role="region"
          aria-label="Progresso do baralho"
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#FBF8F3]/95 backdrop-blur-md border-t border-[#E2DACD] shadow-lg py-3 px-4 sm:px-8 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm font-sans">
            {/* Texto dinâmico de estado */}
            <p className="text-[#2B2420] font-medium text-center sm:text-left" aria-live="polite">
              {deckStatus.text}
            </p>

            {/* Ações da barra */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer underline"
              >
                Limpar
              </button>

              {/* Menu "Completar até" */}
              <CompleteUntilMenu
                currentCount={cards.length}
                onSelectTarget={handleCompleteUntil}
                direction="up"
              />

              <Button
                variant="primary"
                size="sm"
                disabled={!canSaveDeck || isSavingDeck}
                onClick={handleSaveDeckClick}
                className="min-w-[120px]"
              >
                {isSavingDeck ? 'Salvando...' : 'Salvar baralho'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DE SELEÇÃO DE PERSONAGENS */}
      <FacePickerModal
        isOpen={isFacePickerOpen}
        onClose={() => setIsFacePickerOpen(false)}
        selectedCards={cards}
        onToggleCard={handleToggleCardFromPicker}
        onOpenAddFace={() => {
          setIsFacePickerOpen(false);
          setIsAddFaceOpen(true);
        }}
        currentUser={currentUser}
        communityFaces={communityFaces}
        savedFaces={savedFaces}
      />

      {/* 8. MODAL DE ADICIONAR CARAS (UPLOAD/LOTE) */}
      {isAddFaceOpen && (
        <ImageCropperModal
          roomCode="builder"
          currentUser={currentUser}
          onSaveBatch={handleBatchCreatedFaces}
          onClose={() => setIsAddFaceOpen(false)}
        />
      )}

      {/* 9. MODAL DE CONFIRMAÇÃO AO SAIR COM DADOS NÃO SALVOS */}
      {isConfirmExitOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#2B2420]/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[12px] p-6 max-w-sm w-full text-center shadow-xl">
            <h3 className="font-serif text-xl font-normal text-[#2B2420] mb-2 leading-snug">
              Sair da criação de baralho?
            </h3>
            <p className="text-xs text-[#6F655C] font-sans mb-6">
              Você tem alterações que ainda não foram salvas.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  sounds.playClick();
                  setIsConfirmExitOpen(false);
                  onCancel();
                }}
              >
                Sair e manter o rascunho
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  sounds.playClick();
                  try {
                    localStorage.removeItem(DRAFT_KEY);
                  } catch {
                    // ignore
                  }
                  setIsConfirmExitOpen(false);
                  onCancel();
                }}
              >
                Descartar
              </Button>
              <button
                type="button"
                onClick={() => setIsConfirmExitOpen(false)}
                className="text-xs text-[#6F655C] hover:text-[#2B2420] underline mt-1 cursor-pointer"
              >
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. DIÁLOGO DE CONSISTÊNCIA AO PUBLICAR (CARAS PRIVADAS) */}
      {privateFacesDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#2B2420]/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[12px] p-6 max-w-sm w-full text-left shadow-xl">
            <h3 className="font-serif text-xl font-normal text-[#2B2420] mb-2 leading-snug">
              Tornar caras públicas?
            </h3>
            <p className="text-xs text-[#6F655C] font-sans mb-5 leading-relaxed">
              Este baralho tem {privateFacesDialog.faces.length}{' '}
              {privateFacesDialog.faces.length === 1 ? 'cara privada' : 'caras privadas'}. Para
              torná-lo público na comunidade, elas também serão públicas.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={handleConfirmMakeFacesPublicAndSave}
              >
                Tornar públicas e publicar
              </Button>
              <Button
                variant="secondary"
                onClick={handleKeepDeckPrivateAndSave}
              >
                Manter baralho privado
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 11. TOAST COM SUPORTE A DESFAZER */}
      <CommunityToast
        toast={toast}
        hasSelectionBar={cards.length > 0}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

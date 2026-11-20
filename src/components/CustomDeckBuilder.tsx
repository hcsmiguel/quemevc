import { useState, useEffect, type FC } from 'react';
import type { Character, DifficultyCount } from '../types/game';
import { STANDARD_60_CHARACTERS } from '../utils/characters';
import { Avatar } from './Avatar';
import { ImageCropperModal } from './ImageCropperModal';
import { auth, type AppUser, type SavedDeck, type SavedFace } from '../services/auth';
import {
  Trash2,
  Check,
  ArrowLeft,
  X,
  Edit2,
  Camera,
  Search,
  Upload,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { AccountLimitModal } from './AccountLimitModal';
import { DuplicateFaceAlertModal } from './DuplicateFaceAlertModal';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';

interface CustomDeckBuilderProps {
  targetCount: DifficultyCount;
  roomCode?: string;
  currentUser: AppUser | null;
  initialDeck?: SavedDeck | null;
  isFromProfile?: boolean;
  onFinishDeck: (cards: Character[], deckName?: string, savedToProfile?: boolean) => void;
  onCancel: () => void;
}

export const CustomDeckBuilder: FC<CustomDeckBuilderProps> = ({
  targetCount,
  currentUser,
  initialDeck = null,
  isFromProfile = false,
  onFinishDeck,
  onCancel,
}) => {
  const DRAFT_KEY = `cara_deck_draft_${currentUser?.id || 'guest'}_${targetCount}`;
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);

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

  const [saveToProfile, setSaveToProfile] = useState(false);
  const [isPublicDeck, setIsPublicDeck] = useState(initialDeck?.is_public ?? false);
  const [limitModalType, setLimitModalType] = useState<'deck' | 'face' | null>(null);
  const [duplicateWarningFace, setDuplicateWarningFace] = useState<Character | null>(null);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  // Caras salvas no perfil e da comunidade
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);
  const [communityFaces, setCommunityFaces] = useState<SavedFace[]>([]);
  const [facePickerTab, setFacePickerTab] = useState<'community' | 'my'>('community');
  const [faceSearchQuery, setFaceSearchQuery] = useState('');
  const [loadingFaces, setLoadingFaces] = useState(false);
  const [isFacePickerOpen, setIsFacePickerOpen] = useState(false);

  // Edição de nome da carta
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardName, setEditingCardName] = useState('');
  const [editingCardNickname, setEditingCardNickname] = useState('');
  const [replacingCardId, setReplacingCardId] = useState<string | null>(null);

  // Salvar rascunho automaticamente
  useEffect(() => {
    if (cards.length > 0 || deckName.trim()) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: deckName, cards }));
    }
  }, [cards, deckName, DRAFT_KEY]);

  const handleDiscardDraft = () => {
    sounds.playClick();
    localStorage.removeItem(DRAFT_KEY);
    setCards(initialDeck ? [...initialDeck.cards] : []);
    setDeckName(initialDeck?.name || '');
    setRestoredFromDraft(false);
  };

  // Carregar dados iniciais
  useEffect(() => {
    auth.getPublicFaces().then(setCommunityFaces);
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
  }, []);

  useEffect(() => {
    if (currentUser) {
      auth.getUserSavedFaces(currentUser.id).then(setSavedFaces);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isFacePickerOpen && facePickerTab === 'community' && faceSearchQuery.trim()) {
      setLoadingFaces(true);
      const timer = setTimeout(() => {
        auth.getPublicFaces(faceSearchQuery).then((faces) => {
          setCommunityFaces((prev) => {
            const map = new Map<string, SavedFace>();
            prev.forEach((f) => map.set(f.id, f));
            faces.forEach((f) => map.set(f.id, f));
            return Array.from(map.values());
          });
          setLoadingFaces(false);
        });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isFacePickerOpen, facePickerTab, faceSearchQuery]);

  const commitSaveCharacter = (sanitizedChar: Character) => {
    if (replacingCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === replacingCardId
            ? { ...c, imageUrl: sanitizedChar.imageUrl, name: sanitizedChar.name || c.name }
            : c
        )
      );
      setReplacingCardId(null);
    } else {
      setCards((prev) => [...prev, sanitizedChar]);
    }
    setDuplicateWarningFace(null);
  };

  const handleSaveCroppedCharacter = async (newChar: Character) => {
    // Limita o nome a no máximo 20 caracteres
    const sanitizedChar = {
      ...newChar,
      name: newChar.name.slice(0, 20),
    };

    const exists = await auth.checkIfPublicFaceNameExists(sanitizedChar.name);
    if (exists) {
      setDuplicateWarningFace(sanitizedChar);
      return;
    }
    commitSaveCharacter(sanitizedChar);
  };

  const handleRemoveCard = (id: string) => {
    sounds.playClick();
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleFace = (face: SavedFace) => {
    if (replacingCardId) {
      sounds.playClick();
      setCards((prev) =>
        prev.map((c) =>
          c.id === replacingCardId
            ? { ...c, name: face.name.slice(0, 20), imageUrl: face.image_url }
            : c
        )
      );
      setReplacingCardId(null);
      setIsFacePickerOpen(false);
      return;
    }

    const isAdded = cards.some(
      (c) =>
        c.name.trim().toLowerCase() === face.name.trim().toLowerCase() ||
        (c.imageUrl && c.imageUrl === face.image_url)
    );
    if (isAdded) {
      sounds.playClick();
      setCards((prev) =>
        prev.filter(
          (c) =>
            c.name.trim().toLowerCase() !== face.name.trim().toLowerCase() &&
            (!c.imageUrl || c.imageUrl !== face.image_url)
        )
      );
      return;
    }
    if (cards.length >= targetCount) {
      sounds.playWrong();
      return;
    }
    sounds.playClick();
    const newChar: Character = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: face.name.slice(0, 20),
      imageUrl: face.image_url,
    };
    setCards((prev) => [...prev, newChar]);
  };

  // Preencher aleatório
  const handleFillRandomly = () => {
    sounds.playWin();
    const result: Character[] = [];
    const usedNames = new Set<string>();

    const shuffledSavedFaces = [...savedFaces].sort(() => 0.5 - Math.random());
    for (const f of shuffledSavedFaces) {
      if (result.length >= targetCount) break;
      if (!usedNames.has(f.name.toLowerCase())) {
        usedNames.add(f.name.toLowerCase());
        result.push({
          id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: f.name.slice(0, 20),
          imageUrl: f.image_url,
        });
      }
    }

    if (result.length < targetCount && communityFaces.length > 0) {
      const shuffledCommunity = [...communityFaces].sort(() => 0.5 - Math.random());
      for (const cf of shuffledCommunity) {
        if (result.length >= targetCount) break;
        if (!usedNames.has(cf.name.toLowerCase())) {
          usedNames.add(cf.name.toLowerCase());
          result.push({
            id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: cf.name.slice(0, 20),
            imageUrl: cf.image_url,
          });
        }
      }
    }

    if (result.length < targetCount) {
      const shuffledStandards = [...STANDARD_60_CHARACTERS].sort(() => 0.5 - Math.random());
      for (const std of shuffledStandards) {
        if (result.length >= targetCount) break;
        if (!usedNames.has(std.name.toLowerCase())) {
          usedNames.add(std.name.toLowerCase());
          result.push(std);
        }
      }
    }

    setCards(result.slice(0, targetCount));
  };

  const handleStartRenameCard = (char: Character) => {
    setEditingCardId(char.id);
    setEditingCardName(char.name);
    setEditingCardNickname(char.nickname || '');
  };

  const handleSaveRenameCard = () => {
    if (!editingCardId) return;
    const clean = editingCardName.trim().slice(0, 20); // Limite de 20 caracteres
    if (!clean) return;
    const cleanNick = editingCardNickname.trim().slice(0, 12);
    setCards((prev) =>
      prev.map((c) =>
        c.id === editingCardId
          ? { ...c, name: clean, nickname: cleanNick || undefined }
          : c
      )
    );
    setEditingCardId(null);
    setEditingCardNickname('');
  };

  const isTitleMissing = !deckName.trim();
  const isComplete = cards.length >= targetCount;
  const isFormValid = isComplete && !isTitleMissing;

  const handleConfirm = async () => {
    if (!isComplete || isTitleMissing) {
      if (isTitleMissing) sounds.playWrong();
      return;
    }
    sounds.playWin();
    setIsSavingDeck(true);

    const finalDeckName = deckName.trim().slice(0, 35) || `Baralho ${targetCount} Caras`;

    if (initialDeck && currentUser) {
      try {
        await auth.updateSavedDeck(
          initialDeck.id,
          currentUser.id,
          finalDeckName,
          targetCount,
          cards.slice(0, targetCount),
          isPublicDeck
        );
      } catch (err) {
        console.warn('Erro ao atualizar baralho:', err);
      }
    } else if ((isFromProfile || saveToProfile) && currentUser) {
      try {
        const userDecks = await auth.getUserSavedDecks(currentUser.id);
        if (userDecks.length >= 10) {
          sounds.playWrong();
          setLimitModalType('deck');
          setIsSavingDeck(false);
          return;
        }

        await auth.saveDeck(
          currentUser.id,
          finalDeckName,
          targetCount,
          cards.slice(0, targetCount),
          isPublicDeck,
          currentUser.username
        );
      } catch (err) {
        console.warn('Erro ao salvar baralho no perfil:', err);
      }
    }

    setIsSavingDeck(false);
    localStorage.removeItem(DRAFT_KEY);
    onFinishDeck(cards.slice(0, targetCount), finalDeckName, isFromProfile || saveToProfile);
  };

  const filteredSavedFaces = savedFaces.filter((f) =>
    f.name.toLowerCase().includes(faceSearchQuery.toLowerCase().trim())
  );
  const filteredCommunityFaces = communityFaces.filter((f) =>
    f.name.toLowerCase().includes(faceSearchQuery.toLowerCase().trim())
  );

  return (
    <div className="max-w-4xl mx-auto w-full py-6 sm:py-10 px-4 text-left animate-in fade-in duration-150">
      {/* Rascunho Recuperado */}
      {restoredFromDraft && cards.length > 0 && (
        <div className="flex items-center justify-between bg-[#F6F2EA] border border-[#E2DACD] text-xs px-3.5 py-2 rounded-[6px] mb-4">
          <span className="text-[#6F655C]">
            Rascunho recuperado automaticamente.
          </span>
          <button
            onClick={handleDiscardDraft}
            className="text-xs font-medium text-[#B4532F] hover:underline cursor-pointer ml-2"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Top Header: Voltar e Ações Primárias */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-[#E2DACD]">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6F655C] font-sans">
            Progresso: <strong className={`font-mono font-bold ${isComplete ? 'text-[#2E7D32]' : 'text-[#B4532F]'}`}>{cards.length}/{targetCount}</strong>
          </span>

          <Button
            size="sm"
            variant="primary"
            disabled={!isFormValid || isSavingDeck}
            onClick={handleConfirm}
          >
            {isSavingDeck
              ? 'Salvando...'
              : initialDeck
              ? 'Salvar'
              : isFromProfile
              ? 'Salvar baralho'
              : 'Selecionar baralho'}
          </Button>
        </div>
      </div>

      {/* SUPERFÍCIE ÚNICA: Nome do Baralho sem borda grossa */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            maxLength={35}
            value={deckName}
            onChange={(e) => setDeckName(e.target.value.slice(0, 35))}
            placeholder="Nome do baralho"
            className="w-full font-serif text-3xl sm:text-4xl text-[#2B2420] placeholder-[#A39A90] bg-transparent border-0 outline-none p-0 tracking-tight"
          />
          <span className="text-[11px] text-[#A39A90] font-mono mt-1 block">
            {deckName.length}/35 caracteres
          </span>
        </div>

        {/* Checkbox de Publicação / Salvar no Perfil */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {!isFromProfile && currentUser && (
            <Checkbox
              id="save-profile"
              checked={saveToProfile}
              onChange={(e) => setSaveToProfile(e.target.checked)}
              label="Salvar baralho no perfil"
            />
          )}

          {(isFromProfile || saveToProfile) && currentUser && (
            <Checkbox
              id="public-deck"
              checked={isPublicDeck}
              onChange={(e) => setIsPublicDeck(e.target.checked)}
              label="Disponibilizar publicamente na comunidade"
            />
          )}
        </div>
      </div>

      {/* Barra de Ações Rápidas: Abas e Preenchimento */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E2DACD] text-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setFacePickerTab('community');
              setIsFacePickerOpen(true);
            }}
            className="text-xs font-medium text-[#B4532F] hover:underline cursor-pointer"
          >
            Da comunidade ({communityFaces.length})
          </button>

          {currentUser && savedFaces.length > 0 && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setFacePickerTab('my');
                setIsFacePickerOpen(true);
              }}
              className="text-xs font-medium text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer"
            >
              Minhas caras ({savedFaces.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {cards.length < targetCount && (
            <button
              type="button"
              onClick={handleFillRandomly}
              className="text-xs text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer"
            >
              Preencher aleatório
            </button>
          )}
        </div>
      </div>

      {/* Grid de Cartas com Dropzone Unificada */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {/* Dropzone Unificada para Upload / Escolha da Comunidade */}
        {!isComplete && (
          currentUser ? (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setIsCropperOpen(true);
              }}
              className="p-3 rounded-[8px] border border-dashed border-[#E2DACD] hover:border-[#2B2420] bg-[#FBF8F3] hover:bg-white transition-colors flex flex-col items-center justify-center text-center min-h-[160px] cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-[6px] border border-[#E2DACD] bg-white flex items-center justify-center text-[#B4532F] mb-2 group-hover:scale-105 transition-transform">
                <Upload size={18} />
              </div>
              <span className="text-xs font-sans font-medium text-[#2B2420]">
                Adicionar foto
              </span>
              <span className="text-[10px] text-[#6F655C] mt-0.5">
                Arquivo ou Ctrl+V
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setFacePickerTab('community');
                setIsFacePickerOpen(true);
              }}
              className="p-3 rounded-[8px] border border-dashed border-[#E2DACD] hover:border-[#2B2420] bg-[#FBF8F3] hover:bg-white transition-colors flex flex-col items-center justify-center text-center min-h-[160px] cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-[6px] border border-[#E2DACD] bg-white flex items-center justify-center text-[#B4532F] mb-2 group-hover:scale-105 transition-transform">
                <Search size={18} />
              </div>
              <span className="text-xs font-sans font-medium text-[#2B2420]">
                Escolher da Comunidade
              </span>
              <span className="text-[10px] text-[#A39A90] mt-0.5">
                Upload exige conta
              </span>
            </button>
          )
        )}

        {/* Cartas do Baralho */}
        {cards.map((char, index) => (
          <div
            key={char.id || index}
            className="p-2 rounded-[8px] border border-[#E2DACD] bg-[#FBF8F3] hover:border-[#2B2420] transition-colors flex flex-col items-center text-center relative group select-none min-h-[160px] justify-between"
          >
            <div className="w-full aspect-square rounded-[6px] overflow-hidden bg-white border border-[#E2DACD]/80 mb-1.5 relative">
              <Avatar character={char} className="w-full h-full object-cover" />

              {/* Botão substituir foto */}
              <button
                type="button"
                onClick={() => {
                  setReplacingCardId(char.id);
                  if (!currentUser) {
                    setFacePickerTab('community');
                    setIsFacePickerOpen(true);
                  } else {
                    setIsCropperOpen(true);
                  }
                }}
                title="Substituir foto"
                className="absolute top-1 left-1 p-1 bg-white/90 hover:bg-white rounded-[4px] text-[#6F655C] hover:text-[#2B2420] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-2xs"
              >
                <Camera size={11} />
              </button>

              {/* Botão remover */}
              <button
                type="button"
                onClick={() => handleRemoveCard(char.id)}
                title="Remover carta"
                className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-[#F8EBEA] rounded-[4px] text-[#6F655C] hover:text-[#8C2E2A] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-2xs"
              >
                <Trash2 size={11} />
              </button>
            </div>

            {/* Edição de Nome (Limite de 20 caracteres) */}
            {editingCardId === char.id ? (
              <div className="w-full p-1 bg-white rounded-[4px] border border-[#2B2420] flex flex-col gap-1">
                <input
                  type="text"
                  maxLength={20}
                  value={editingCardName}
                  onChange={(e) => setEditingCardName(e.target.value.slice(0, 20))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameCard()}
                  className="w-full text-xs font-sans border-0 outline-none p-0 text-[#2B2420]"
                  autoFocus
                />
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#E2DACD]">
                  <span className="text-[#A39A90] font-mono">{editingCardName.length}/20</span>
                  <button
                    type="button"
                    onClick={handleSaveRenameCard}
                    className="text-[#2E7D32] font-semibold cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full px-1">
                <div className="flex items-center justify-center gap-1 w-full">
                  <span className="text-xs font-sans font-medium text-[#2B2420] truncate text-center" title={char.name}>
                    {char.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartRenameCard(char)}
                    className="text-[#A39A90] hover:text-[#2B2420] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                    title="Editar nome"
                  >
                    <Edit2 size={10} />
                  </button>
                </div>
                <span className="text-[10px] text-[#A39A90] font-mono block">#{index + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de Seleção de Caras (Comunidade ou Salvas) */}
      {isFacePickerOpen && (
        <div className="fixed inset-0 z-50 bg-[#2B2420]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] max-w-2xl w-full p-5 sm:p-6 shadow-xl flex flex-col max-h-[85vh] animate-in zoom-in-95 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DACD] mb-3">
              <div>
                <h3 className="font-serif text-xl font-normal text-[#2B2420]">
                  Escolher personagens
                </h3>
                <p className="text-xs text-[#6F655C]">
                  Toque para adicionar ou remover do baralho ({cards.length}/{targetCount})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFacePickerOpen(false)}
                className="p-1 text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Abas e Busca */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setFacePickerTab('community')}
                  className={`pb-1 border-b-2 transition-colors cursor-pointer ${
                    facePickerTab === 'community'
                      ? 'border-[#2B2420] font-semibold text-[#2B2420]'
                      : 'border-transparent text-[#6F655C] hover:text-[#2B2420]'
                  }`}
                >
                  Comunidade ({communityFaces.length})
                </button>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setFacePickerTab('my')}
                    className={`pb-1 border-b-2 transition-colors cursor-pointer ${
                      facePickerTab === 'my'
                        ? 'border-[#2B2420] font-semibold text-[#2B2420]'
                        : 'border-transparent text-[#6F655C] hover:text-[#2B2420]'
                    }`}
                  >
                    Minhas caras ({savedFaces.length})
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={faceSearchQuery}
                  onChange={(e) => setFaceSearchQuery(e.target.value)}
                  className="h-8 pl-7 pr-3 bg-white border border-[#E2DACD] rounded-[4px] text-xs text-[#2B2420] placeholder-[#A39A90] focus:outline-none focus:border-[#2B2420]"
                />
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A39A90]" />
              </div>
            </div>

            {/* Grid de Caras Disponíveis */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loadingFaces ? (
                <div className="py-12 text-center text-xs text-[#6F655C]">Carregando...</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {(facePickerTab === 'community' ? filteredCommunityFaces : filteredSavedFaces).map((face) => {
                    const isAdded = cards.some(
                      (c) =>
                        c.name.trim().toLowerCase() === face.name.trim().toLowerCase() ||
                        (c.imageUrl && c.imageUrl === face.image_url)
                    );
                    return (
                      <button
                        key={face.id}
                        type="button"
                        onClick={() => handleToggleFace(face)}
                        className={`p-2 rounded-[6px] border text-center transition-colors cursor-pointer flex flex-col items-center ${
                          isAdded
                            ? 'bg-[#E8F5E9] border-[#A5D6A7]'
                            : 'bg-white border-[#E2DACD] hover:border-[#2B2420]'
                        }`}
                      >
                        <div className="w-full aspect-square rounded-[4px] overflow-hidden bg-white mb-1.5 border border-[#E2DACD]/60 relative">
                          <img src={face.image_url} alt={face.name} className="w-full h-full object-cover" />
                          {isAdded && (
                            <div className="absolute inset-0 bg-[#2E7D32]/20 flex items-center justify-center">
                              <Check size={16} className="text-[#2E7D32]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-sans font-medium text-[#2B2420] truncate w-full">
                          {face.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E2DACD] mt-3 text-right">
              <Button size="sm" onClick={() => setIsFacePickerOpen(false)}>
                Concluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recorte de Imagem */}
      {isCropperOpen && (
        <ImageCropperModal
          roomCode="builder"
          onSaveCharacter={handleSaveCroppedCharacter}
          onClose={() => {
            setIsCropperOpen(false);
            setReplacingCardId(null);
          }}
        />
      )}

      {/* Modal de Limites */}
      <AccountLimitModal
        isOpen={limitModalType !== null}
        type={limitModalType || 'deck'}
        onClose={() => setLimitModalType(null)}
      />

      {/* Modal de Alerta para Nome de Cara já Existente */}
      <DuplicateFaceAlertModal
        isOpen={!!duplicateWarningFace}
        faceName={duplicateWarningFace?.name || ''}
        onConfirm={() => {
          if (duplicateWarningFace) commitSaveCharacter(duplicateWarningFace);
        }}
        onCancel={() => setDuplicateWarningFace(null)}
      />
    </div>
  );
};

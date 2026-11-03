import { useState, useEffect, type FC } from 'react';
import type { Character, DifficultyCount } from '../types/game';
import { STANDARD_60_CHARACTERS } from '../utils/characters';
import { Avatar } from './Avatar';
import { ImageCropperModal } from './ImageCropperModal';
import { auth, type AppUser, type SavedDeck, type SavedFace } from '../services/auth';
import {
  Plus,
  Trash2,
  Check,
  Wand2,
  ArrowLeft,
  Smile,
  Shuffle,
  X,
  Edit2,
  Camera,
  Layers,
  Globe,
  Globe2,
  Search,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { AccountLimitModal } from './AccountLimitModal';

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
  roomCode = 'temp',
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

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  // Caras salvas no perfil do usuário e da comunidade
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);
  const [communityFaces, setCommunityFaces] = useState<SavedFace[]>([]);
  const [facePickerTab, setFacePickerTab] = useState<'my' | 'community'>('my');
  const [faceSearchQuery, setFaceSearchQuery] = useState('');
  const [loadingFaces, setLoadingFaces] = useState(false);
  const [isFacePickerOpen, setIsFacePickerOpen] = useState(false);

  // Edição de nome de carta existente
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardName, setEditingCardName] = useState('');
  const [replacingCardId, setReplacingCardId] = useState<string | null>(null);

  useEffect(() => {
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
  }, [DRAFT_KEY, initialDeck]);

  // Salva rascunho automaticamente a cada alteração (proteção contra F5 e crash)
  useEffect(() => {
    if (initialDeck) return;
    if (cards.length === 0 && !deckName.trim()) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          cards,
          name: deckName,
          targetCount,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  }, [cards, deckName, initialDeck, DRAFT_KEY, targetCount]);

  const handleDiscardDraft = () => {
    sounds.playClick();
    localStorage.removeItem(DRAFT_KEY);
    setCards([]);
    setDeckName('');
    setRestoredFromDraft(false);
  };

  useEffect(() => {
    // Carrega personagens da comunidade na montagem para acesso imediato
    auth.getPublicFaces().then(setCommunityFaces);
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

  const handleSaveCroppedCharacter = (newChar: Character) => {
    if (replacingCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === replacingCardId
            ? { ...c, imageUrl: newChar.imageUrl, name: newChar.name || c.name }
            : c
        )
      );
      setReplacingCardId(null);
    } else {
      setCards((prev) => [...prev, newChar]);
    }
  };

  const handleRemoveCard = (id: string) => {
    sounds.playClick();
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  // Alterna a seleção de uma cara no baralho (adiciona ou remove em tempo real)
  const handleToggleFace = (face: SavedFace) => {
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
      name: face.name,
      imageUrl: face.image_url,
    };
    setCards((prev) => [...prev, newChar]);
  };

  // Adiciona um lote de cartas aleatórias da comunidade
  const handleAddCommunityBatch = (count: number = 5) => {
    const existingNames = new Set(cards.map((c) => c.name.trim().toLowerCase()));
    const available = communityFaces.filter(
      (f) => !existingNames.has(f.name.trim().toLowerCase())
    );
    if (available.length === 0) {
      sounds.playWrong();
      return;
    }
    sounds.playWin();
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const slotsRemaining = targetCount - cards.length;
    const toPick = Math.min(slotsRemaining, count, shuffled.length);
    const newBatch: Character[] = shuffled.slice(0, toPick).map((f) => ({
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: f.name,
      imageUrl: f.image_url,
    }));
    setCards((prev) => [...prev, ...newBatch]);
  };

  const handleAddAllSavedFaces = () => {
    sounds.playWin();
    const existingNames = new Set(cards.map((c) => c.name.trim().toLowerCase()));
    const toAdd: Character[] = [];
    for (const f of savedFaces) {
      if (!existingNames.has(f.name.trim().toLowerCase()) && cards.length + toAdd.length < targetCount) {
        toAdd.push({
          id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: f.name,
          imageUrl: f.image_url,
        });
      }
    }
    setCards((prev) => [...prev, ...toAdd]);
  };

  // Preencher Aleatoriamente baseado nas caras salvas do usuário e da comunidade
  const handleFillRandomly = () => {
    sounds.playWin();
    const result: Character[] = [];
    const usedNames = new Set<string>();

    // 1. Embaralha e adiciona as caras salvas do usuário
    const shuffledSavedFaces = [...savedFaces].sort(() => 0.5 - Math.random());
    for (const f of shuffledSavedFaces) {
      if (result.length >= targetCount) break;
      if (!usedNames.has(f.name.toLowerCase())) {
        usedNames.add(f.name.toLowerCase());
        result.push({
          id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: f.name,
          imageUrl: f.image_url,
        });
      }
    }

    // 2. Se ainda faltar, completa com personagens da comunidade
    if (result.length < targetCount && communityFaces.length > 0) {
      const shuffledCommunity = [...communityFaces].sort(() => 0.5 - Math.random());
      for (const cf of shuffledCommunity) {
        if (result.length >= targetCount) break;
        if (!usedNames.has(cf.name.toLowerCase())) {
          usedNames.add(cf.name.toLowerCase());
          result.push({
            id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: cf.name,
            imageUrl: cf.image_url,
          });
        }
      }
    }

    // 3. Se ainda faltar cartas para o alvo, completa com as cartas padrão
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

  // Completar Aleatoriamente baseado nas caras salvas e da comunidade
  const handleCompleteRandomly = () => {
    sounds.playClick();
    const remainingNeeded = targetCount - cards.length;
    if (remainingNeeded <= 0) return;

    const existingNames = new Set(cards.map((c) => c.name.toLowerCase()));
    const toAdd: Character[] = [];

    // 1. Prioriza caras salvas do usuário
    const shuffledSavedFaces = [...savedFaces].sort(() => 0.5 - Math.random());
    for (const f of shuffledSavedFaces) {
      if (toAdd.length >= remainingNeeded) break;
      if (!existingNames.has(f.name.toLowerCase())) {
        existingNames.add(f.name.toLowerCase());
        toAdd.push({
          id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: f.name,
          imageUrl: f.image_url,
        });
      }
    }

    // 2. Prioriza caras da comunidade
    if (toAdd.length < remainingNeeded && communityFaces.length > 0) {
      const shuffledCommunity = [...communityFaces].sort(() => 0.5 - Math.random());
      for (const cf of shuffledCommunity) {
        if (toAdd.length >= remainingNeeded) break;
        if (!existingNames.has(cf.name.toLowerCase())) {
          existingNames.add(cf.name.toLowerCase());
          toAdd.push({
            id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: cf.name,
            imageUrl: cf.image_url,
          });
        }
      }
    }

    // 3. Se ainda faltar, completa com cartas padrão
    if (toAdd.length < remainingNeeded) {
      const shuffledStandards = [...STANDARD_60_CHARACTERS].sort(() => 0.5 - Math.random());
      for (const std of shuffledStandards) {
        if (toAdd.length >= remainingNeeded) break;
        if (!existingNames.has(std.name.toLowerCase())) {
          existingNames.add(std.name.toLowerCase());
          toAdd.push(std);
        }
      }
    }

    setCards((prev) => [...prev, ...toAdd]);
  };

  const handleStartRenameCard = (char: Character) => {
    setEditingCardId(char.id);
    setEditingCardName(char.name);
  };

  const handleSaveRenameCard = () => {
    if (!editingCardId) return;
    const clean = editingCardName.trim();
    if (!clean) return; // Nome é obrigatório
    setCards((prev) =>
      prev.map((c) => (c.id === editingCardId ? { ...c, name: clean } : c))
    );
    setEditingCardId(null);
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

    const finalDeckName = deckName.trim() || `Baralho ${targetCount} Caras`;

    // 1. Se estiver editando um baralho existente (Ponto 3.e)
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
        console.warn('Erro ao atualizar baralho existente:', err);
      }
    } 
    // 2. Se veio do perfil criando novo, OU se no lobby marcou para salvar no perfil
    else if ((isFromProfile || saveToProfile) && currentUser) {
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
    <div className="min-h-[85vh] max-w-5xl mx-auto w-full p-4 flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Banner de Rascunho Recuperado (proteção contra F5 e crash) */}
      {restoredFromDraft && cards.length > 0 && (
        <div className="flex items-center justify-between bg-purple-50 border border-purple-200 text-purple-900 text-xs px-4 py-2.5 rounded-2xl animate-in fade-in">
          <span className="font-semibold flex items-center gap-1.5">
            <span>💾</span>
            <span>Rascunho recuperado automaticamente! Seus personagens foram preservados.</span>
          </span>
          <button
            onClick={handleDiscardDraft}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 underline ml-2 cursor-pointer shrink-0"
          >
            Descartar rascunho
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onCancel}
            title="Voltar"
            className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl sm:rounded-2xl transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-black text-slate-900 flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-tactile-sm shrink-0">
                <Layers size={15} />
              </span>
              <span className="truncate">{initialDeck ? 'Editar Baralho' : 'Criar Baralho de Caras'}</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate sm:whitespace-normal">
              Monte seu baralho com fotos personalizadas ou caras do perfil!
            </p>
          </div>
        </div>

        {/* Barra de Progresso e Ação */}
        <div className="flex items-center justify-between md:justify-end gap-2.5 pt-2.5 md:pt-0 border-t border-slate-100 md:border-0 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Progresso:</span>
            <span className={`font-black tabular-nums ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
              {cards.length} / {targetCount} Caras
            </span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!isFormValid || isSavingDeck}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-extrabold text-xs uppercase tracking-wider shadow-sm active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Check size={14} />
            <span>
              {isSavingDeck
                ? 'Salvando...'
                : initialDeck
                ? 'Salvar'
                : isFromProfile
                ? 'Salvar Baralho'
                : 'Iniciar Partida'}
            </span>
          </button>
        </div>
      </div>

      {/* Nome do Baralho e Checkbox Salvar no Perfil */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm text-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
              Nome do Baralho
            </label>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Defina um título para salvar e identificar este baralho no seu perfil.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Checkbox: Visível apenas ao criar a partir do Lobby e se o usuário estiver logado */}
            {!isFromProfile && currentUser && (
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer select-none shrink-0 ${
                saveToProfile
                  ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-sm font-black'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 font-bold'
              }`}>
                <input
                  type="checkbox"
                  checked={saveToProfile}
                  onChange={async (e) => {
                    sounds.playClick();
                    if (e.target.checked && currentUser) {
                      const userDecks = await auth.getUserSavedDecks(currentUser.id);
                      if (userDecks.length >= 10) {
                        sounds.playWrong();
                        setLimitModalType('deck');
                        setSaveToProfile(false);
                        return;
                      }
                    }
                    setSaveToProfile(e.target.checked);
                  }}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer accent-purple-600"
                />
                <span className="text-xs">
                  Salvar no meu perfil
                </span>
              </label>
            )}

            {/* Checkbox: Disponibilizar na Comunidade */}
            {(isFromProfile || saveToProfile) && currentUser && (
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer select-none shrink-0 ${
                isPublicDeck
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-sm font-black'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 font-bold'
              }`}>
                <input
                  type="checkbox"
                  checked={isPublicDeck}
                  onChange={(e) => {
                    sounds.playClick();
                    setIsPublicDeck(e.target.checked);
                  }}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                />
                <span className="text-xs flex items-center gap-1">
                  <Globe size={13} className="text-indigo-600" />
                  <span>Público na Comunidade</span>
                </span>
              </label>
            )}
          </div>
        </div>

        <input
          type="text"
          placeholder="Ex: Amigos da Faculdade, Família, Personagens..."
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-semibold rounded-2xl px-4 py-2.5 focus:outline-none focus:bg-white focus:border-sky-400 transition-all"
        />
      </div>

      {/* Barra de Ações Rápidas (Caras da Comunidade / Minhas Caras / Aleatório) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Caras da Comunidade (Sempre visível para todos os jogadores) */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setFacePickerTab('community');
              setIsFacePickerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-extrabold text-xs transition-colors cursor-pointer shadow-tactile-sm active:translate-y-0.5"
            title="Explorar e adicionar personagens prontos da comunidade"
          >
            <Globe2 size={15} className="text-purple-700" />
            <span>Caras da Comunidade ({communityFaces.length})</span>
          </button>

          {/* Botão Minhas Caras Salvas */}
          {currentUser && savedFaces.length > 0 && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setFacePickerTab('my');
                setIsFacePickerOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-xs transition-colors cursor-pointer shadow-tactile-sm active:translate-y-0.5"
            >
              <Smile size={15} className="text-amber-700" />
              <span>Minhas Caras ({savedFaces.length})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Só aparece se ainda não adicionou nenhuma cara */}
          {cards.length === 0 && (
            <button
              type="button"
              onClick={handleFillRandomly}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border border-slate-200 transition-colors cursor-pointer active:translate-y-0.5"
              title="Preencher aleatoriamente com base nas caras da comunidade e salvas"
            >
              <Shuffle size={14} className="text-slate-500" />
              <span>Preencher Aleatoriamente</span>
            </button>
          )}

          {/* Só aparece se já tem pelo menos 1 cara e ainda não atingiu o total */}
          {cards.length > 0 && !isComplete && (
            <button
              type="button"
              onClick={handleCompleteRandomly}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-xs border border-purple-300 transition-colors cursor-pointer shadow-tactile-sm active:translate-y-0.5"
              title="Completar o restante com base nas suas caras e da comunidade"
            >
              <Wand2 size={14} className="text-purple-700" />
              <span>Completar Restante ({targetCount - cards.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Caras Adicionadas */}
      <div className="flex-1 bg-white/85 backdrop-blur-sm border-2 border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm overflow-y-auto min-h-[350px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
          {/* Botão Adicionar Nova Foto (Upload / Recorte) */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIsCropperOpen(true);
            }}
            disabled={isComplete}
            className="border-2 border-dashed border-sky-300 hover:border-sky-500 disabled:opacity-40 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all bg-sky-50/50 hover:bg-sky-50 group min-h-[160px] cursor-pointer shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 group-hover:scale-110 flex items-center justify-center mb-2 transition-transform shadow-tactile-sm">
              <Plus size={26} />
            </div>
            <span className="text-xs font-extrabold text-slate-900">Upload de Foto</span>
            <span className="text-[11px] text-slate-500 mt-0.5 font-medium">Arquivo ou Ctrl+V</span>
          </button>

          {/* Botão Selecionar Caras da Comunidade Diretamente no Grid */}
          {!isComplete && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setFacePickerTab('community');
                setIsFacePickerOpen(true);
              }}
              className="border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all bg-purple-50/50 hover:bg-purple-50 group min-h-[160px] cursor-pointer shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 group-hover:scale-110 flex items-center justify-center mb-2 transition-transform shadow-tactile-sm">
                <Globe2 size={24} />
              </div>
              <span className="text-xs font-extrabold text-purple-950">Caras da Comunidade</span>
              <span className="text-[11px] text-purple-600 mt-0.5 font-medium">Personagens Prontos</span>
            </button>
          )}

          {/* Lista de Caras no Baralho */}
          {cards.map((char, index) => (
            <div
              key={char.id || index}
              className="relative group bg-white border-2 border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-between shadow-sm hover:border-sky-400 hover:shadow-md transition-all min-h-[160px] sm:min-h-[180px] md:min-h-[195px]"
            >
              <Avatar character={char} className="w-18 h-18 sm:w-22 sm:h-22 md:w-24 md:h-24 my-1 ring-1 ring-slate-100 rounded-2xl" />

              {/* Nome ou Campo de Edição de Nome */}
              {editingCardId === char.id ? (
                <div className="flex items-center gap-1 w-full mt-1">
                  <input
                    type="text"
                    value={editingCardName}
                    onChange={(e) => setEditingCardName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameCard()}
                    className="w-full bg-slate-50 text-slate-900 text-[11px] font-bold rounded-lg px-2 py-1 border-2 border-sky-400 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveRenameCard} className="text-emerald-600 hover:text-emerald-700 p-1">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1 w-full px-1">
                  <span className="text-xs font-bold text-slate-800 truncate text-center">
                    {char.name}
                  </span>
                  <button
                    onClick={() => handleStartRenameCard(char)}
                    title="Editar nome"
                    className="text-slate-400 hover:text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}

              <span className="text-[10px] text-slate-400 font-semibold mt-1">#{index + 1}</span>

              {/* Botão Substituir Foto */}
              <button
                onClick={() => {
                  setReplacingCardId(char.id);
                  setIsCropperOpen(true);
                }}
                title="Substituir foto desta cara"
                className="absolute top-1.5 left-1.5 p-1.5 bg-slate-100 hover:bg-sky-50 text-slate-500 hover:text-sky-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 cursor-pointer shadow-sm"
              >
                <Camera size={13} />
              </button>

              {/* Botão Remover Carta */}
              <button
                onClick={() => handleRemoveCard(char.id)}
                title="Remover"
                className="absolute top-1.5 right-1.5 p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border border-rose-200 cursor-pointer shadow-sm"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal / Gaveta de Seleção de Caras Salvas no Perfil e Comunidade */}
      {isFacePickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[88vh] animate-in zoom-in-95">
            {/* Header com Título e Status */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-tactile-sm">
                  <Globe2 size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Banco de Personagens
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    Toque em uma cara para adicionar ou remover do baralho em tempo real
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Chip de progresso das cartas */}
                <div className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-xs ${
                  isComplete
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-purple-100 text-purple-900 border-purple-300'
                }`}>
                  {isComplete ? <Check size={13} strokeWidth={3} /> : <Layers size={13} />}
                  <span>{cards.length} / {targetCount} {isComplete ? 'Completo!' : ''}</span>
                </div>

                <button
                  onClick={() => setIsFacePickerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Abas: Comunidade vs Minhas Caras */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold gap-1 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setFacePickerTab('community');
                  }}
                  className={`py-1.5 px-3.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    facePickerTab === 'community'
                      ? 'bg-white text-purple-900 shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Globe2 size={13} className="text-purple-600" />
                  <span>Comunidade ({communityFaces.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setFacePickerTab('my');
                  }}
                  className={`py-1.5 px-3.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    facePickerTab === 'my'
                      ? 'bg-white text-amber-900 shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Smile size={13} className="text-amber-600" />
                  <span>Minhas Caras ({savedFaces.length})</span>
                </button>
              </div>

              {/* Botão de atalho para adicionar 5 aleatórias da comunidade se houver espaço */}
              {facePickerTab === 'community' && !isComplete && communityFaces.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleAddCommunityBatch(5)}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold transition-all cursor-pointer shadow-xs active:translate-y-0.5"
                  title="Adiciona 5 personagens aleatórios da comunidade que ainda não estão no baralho"
                >
                  <Sparkles size={13} className="text-purple-600" />
                  <span>+5 Aleatórias</span>
                </button>
              )}
            </div>

            {/* Campo de Busca */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder={
                  facePickerTab === 'community'
                    ? 'Pesquisar personagem da comunidade (ex: Neymar, Juliette, Taylor Swift)...'
                    : 'Pesquisar nas suas caras salvas...'
                }
                value={faceSearchQuery}
                onChange={(e) => setFaceSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold rounded-xl pl-8 pr-7 py-2.5 focus:outline-none focus:bg-white focus:border-purple-400 transition-all shadow-xs"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {faceSearchQuery && (
                <button
                  onClick={() => setFaceSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Grid de Personagens no Modal */}
            <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 p-1 min-h-[260px] max-h-[48vh]">
              {facePickerTab === 'my' ? (
                // Minhas Caras
                filteredSavedFaces.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-2">
                    <Smile size={32} className="text-slate-300" />
                    <span>
                      {savedFaces.length === 0
                        ? 'Você ainda não tem caras salvas no seu perfil. Use a aba "Comunidade" para pegar personagens prontos!'
                        : `Nenhuma cara salva corresponde a "${faceSearchQuery}".`}
                    </span>
                  </div>
                ) : (
                  filteredSavedFaces.map((face) => {
                    const alreadyAdded = cards.some(
                      (c) => c.name.trim().toLowerCase() === face.name.trim().toLowerCase() || (c.imageUrl && c.imageUrl === face.image_url)
                    );
                    return (
                      <button
                        key={face.id}
                        type="button"
                        onClick={() => handleToggleFace(face)}
                        className={`group relative p-2 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-all cursor-pointer ${
                          alreadyAdded
                            ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-300 shadow-sm'
                            : 'border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/40 shadow-xs'
                        }`}
                      >
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden mb-1.5 bg-slate-100 border border-slate-200">
                          <img src={face.image_url} alt={face.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          {alreadyAdded && (
                            <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="bg-emerald-600 text-white p-1 rounded-full shadow">
                                <Check size={14} strokeWidth={3} />
                              </span>
                            </div>
                          )}
                        </div>

                        <span className="text-[11px] font-black text-slate-900 truncate w-full px-1">
                          {face.name}
                        </span>

                        {alreadyAdded ? (
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md mt-0.5">
                            ✓ No Baralho
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md mt-0.5 group-hover:bg-amber-100">
                            + Adicionar
                          </span>
                        )}
                      </button>
                    );
                  })
                )
              ) : (
                // Comunidade
                loadingFaces ? (
                  <div className="col-span-full py-14 text-center text-xs text-purple-600 font-extrabold animate-pulse flex flex-col items-center gap-2">
                    <Loader2 size={28} className="animate-spin text-purple-600" />
                    <span>Carregando personagens da comunidade...</span>
                  </div>
                ) : filteredCommunityFaces.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-2">
                    <Globe2 size={32} className="text-slate-300" />
                    <span>
                      {faceSearchQuery
                        ? `Nenhum personagem público encontrado para "${faceSearchQuery}".`
                        : 'Nenhuma cara pública disponível no momento.'}
                    </span>
                  </div>
                ) : (
                  filteredCommunityFaces.map((face) => {
                    const alreadyAdded = cards.some(
                      (c) => c.name.trim().toLowerCase() === face.name.trim().toLowerCase() || (c.imageUrl && c.imageUrl === face.image_url)
                    );
                    return (
                      <button
                        key={face.id}
                        type="button"
                        onClick={() => handleToggleFace(face)}
                        className={`group relative p-2 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-all cursor-pointer ${
                          alreadyAdded
                            ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-300 shadow-sm'
                            : 'border-slate-200 hover:border-purple-400 bg-white hover:bg-purple-50/40 shadow-xs'
                        }`}
                      >
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden mb-1.5 bg-slate-100 border border-slate-200">
                          <img src={face.image_url} alt={face.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          {alreadyAdded && (
                            <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="bg-emerald-600 text-white p-1 rounded-full shadow">
                                <Check size={14} strokeWidth={3} />
                              </span>
                            </div>
                          )}
                        </div>

                        <span className="text-[11px] font-black text-slate-900 truncate w-full px-1">
                          {face.name}
                        </span>

                        <span className="text-[9px] text-slate-400 font-bold truncate max-w-full">
                          {face.author_name ? `por ${face.author_name}` : 'comunidade'}
                        </span>

                        {alreadyAdded ? (
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md mt-0.5">
                            ✓ No Baralho
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md mt-0.5 group-hover:bg-purple-100">
                            + Adicionar
                          </span>
                        )}
                      </button>
                    );
                  })
                )
              )}
            </div>

            {/* Rodapé de Ações do Modal */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 mt-2">
              <div className="flex items-center gap-2">
                {facePickerTab === 'my' && savedFaces.length > 0 && !isComplete && (
                  <button
                    type="button"
                    onClick={handleAddAllSavedFaces}
                    className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-tactile-sm transition-all active:translate-y-0.5 cursor-pointer"
                  >
                    Adicionar Todas ({savedFaces.length})
                  </button>
                )}

                {facePickerTab === 'community' && !isComplete && communityFaces.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAddCommunityBatch(5)}
                    className="sm:hidden py-2 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-xs transition-colors cursor-pointer"
                  >
                    +5 Aleatórias
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFacePickerOpen(false)}
                className={`py-2 px-5 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-tactile-sm active:translate-y-0.5 ${
                  isComplete
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                Concluir ({cards.length}/{targetCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Limite da Conta */}
      <AccountLimitModal
        isOpen={limitModalType !== null}
        type={limitModalType || 'deck'}
        onClose={() => setLimitModalType(null)}
      />

      {/* Modal de Recorte e Upload */}
      {isCropperOpen && (
        <ImageCropperModal
          onSaveCharacter={handleSaveCroppedCharacter}
          onClose={() => {
            setIsCropperOpen(false);
            setReplacingCardId(null);
          }}
          initialIndex={replacingCardId ? undefined : cards.length + 1}
          roomCode={roomCode}
        />
      )}
    </div>
  );
};
